import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from '@elastic/elasticsearch';
import { ES_CLIENT, type SearchSettings } from './elasticsearch.client.js';
import { buildSearchQuery, buildSuggestQuery, cleanQuery } from './product-index.js';

export interface ProductSuggestion {
  name: string;
  slug: string;
}

const WARN_EVERY_MS = 30_000;
/** After Elasticsearch fails, requests skip it for this long, so only the first one pays for the failure. */
const BREAKER_MS = 15_000;
/** "No index yet" is expected for a moment after a deploy, so it is retried sooner. */
const NO_INDEX_BREAKER_MS = 3_000;

/**
 * Searches the product index. Every method answers `null` when Elasticsearch is not set up, does not answer in
 * time, or has no index yet: the caller then searches the way the shop always did. So a broken search engine
 * makes the search a little less clever, never broken.
 */
@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private lastWarning = 0;
  /** Until when Elasticsearch is left alone after a failure (a circuit breaker). */
  private skipUntil = 0;

  constructor(
    @Inject(ES_CLIENT) private readonly es: Client | null,
    private readonly config: ConfigService,
  ) {}

  private get settings(): SearchSettings {
    return { url: '', index: 'haisan-products', timeoutMs: 1500, maxResults: 300, ...this.config.get<Partial<SearchSettings>>('search') };
  }

  get enabled(): boolean {
    return this.es !== null;
  }

  /** The engine failed a moment ago: do not wait for it again, answer "search another way" at once. */
  private get skipping(): boolean {
    return Date.now() < this.skipUntil;
  }

  /** A hard limit on one call: connection problems (a name that does not resolve, a host that does not answer) are not covered by the client's own timeout. */
  private limit(): { signal: AbortSignal } {
    return { signal: AbortSignal.timeout(this.settings.timeoutMs) };
  }

  /**
   * The call, or an error after `timeoutMs` whatever the client is doing. The signal above cancels a request that
   * is under way; this also covers the time before it (looking up the host name), where the client does not look.
   */
  private async within<T>(call: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Elasticsearch did not answer in ${this.settings.timeoutMs} ms`)), this.settings.timeoutMs);
    });
    try {
      return await Promise.race([call, deadline]);
    } finally {
      clearTimeout(timer);
      // A call that lost the race may still fail later; nobody is waiting for it.
      call.catch(() => undefined);
    }
  }

  /** The best matches for what the visitor typed: product id with its score, best first. Null: search another way. */
  async search(text: string): Promise<Map<string, number> | null> {
    const query = cleanQuery(text);
    if (!this.es || !query || this.skipping) return null;
    try {
      const result = await this.within(this.es.search({ index: this.settings.index, ...buildSearchQuery(query, this.settings.maxResults) }, this.limit()));
      return new Map(result.hits.hits.map((hit) => [String(hit._id), hit._score ?? 0]));
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  /** Product names that begin like what was typed. Null: suggest another way. */
  async suggest(prefix: string, limit = 8): Promise<ProductSuggestion[] | null> {
    const query = cleanQuery(prefix, 60);
    if (!this.es || !query || this.skipping) return null;
    try {
      const result = await this.within(this.es.search({ index: this.settings.index, ...buildSuggestQuery(query, limit * 2) }, this.limit()));
      const seen = new Set<string>();
      const suggestions: ProductSuggestion[] = [];
      for (const hit of result.hits.hits) {
        const source = hit._source as Partial<ProductSuggestion> | undefined;
        if (!source?.name || !source.slug || seen.has(source.name)) continue;
        seen.add(source.name);
        suggestions.push({ name: source.name, slug: source.slug });
      }
      return suggestions.slice(0, limit);
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  private fail(error: unknown, now = Date.now()): void {
    // A missing index is expected before the first indexing; it is not worth a warning, and is retried soon.
    if ((error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) {
      this.skipUntil = now + NO_INDEX_BREAKER_MS;
      return;
    }
    this.skipUntil = now + BREAKER_MS;
    if (now - this.lastWarning < WARN_EVERY_MS) return;
    this.lastWarning = now;
    this.logger.warn(`Elasticsearch failed, searching in memory for ${BREAKER_MS / 1000} s: ${String(error)}`);
  }
}
