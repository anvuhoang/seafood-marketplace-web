import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from '@elastic/elasticsearch';
import { KV_STORE, type KeyValueStore } from '../../infra/kv-store.js';
import { CacheService } from '../../infra/cache.service.js';
import { CATALOG_PREFIX } from '../../infra/catalog-cache.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SELLABLE_OFFER_WHERE, SELLABLE_PRODUCT_WHERE } from '../category/category.service.js';
import { ES_CLIENT, type SearchSettings } from './elasticsearch.client.js';
import {
  PRODUCT_INDEX_BODY,
  PRODUCT_INDEX_VERSION,
  toDocument,
  type IndexableCategory,
  type IndexableProduct,
  type ProductDocument,
} from './product-index.js';

export interface ReindexResult {
  /** False when another API process was already indexing: nothing was done here. */
  ran: boolean;
  index?: string;
  documents?: number;
  tookMs?: number;
}

export interface SearchStatus {
  enabled: boolean;
  state: 'off' | 'ok' | 'down' | 'no-index';
  index?: string;
  documents?: number;
}

const LOCK_KEY = 'lock:search:reindex';
const LOCK_MS = 2 * 60 * 1000;
const BATCH = 500;
/** A burst of changes (a vendor editing several products) is indexed once, this long after the last one. */
const DEBOUNCE_MS = 2000;
const RETRY_MS = 15_000;
const MAX_START_ATTEMPTS = 20;
const STORE_WAIT_TRIES = 20;
const STORE_WAIT_MS = 500;

/**
 * Keeps the product index in step with the catalogue. It builds a whole new index, then moves the alias
 * (`haisan-products`) to it in one step, so a search never meets a half-built index and the old one stays in use
 * until the new one is complete. The catalogue is small, so rebuilding it is simpler and safer than tracking
 * every change; the debounce keeps bursts of changes from rebuilding it over and over.
 */
@Injectable()
export class ProductIndexerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductIndexerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ES_CLIENT) private readonly es: Client | null,
    private readonly config: ConfigService,
    @Inject(KV_STORE) private readonly store: KeyValueStore,
    private readonly cache: CacheService,
  ) {}

  private get settings(): SearchSettings {
    return { url: '', index: 'haisan-products', timeoutMs: 1500, maxResults: 300, ...this.config.get<Partial<SearchSettings>>('search') };
  }

  /** At start-up: follow the catalogue from now on, and make sure the index exists and is of the current version. */
  onApplicationBootstrap(): void {
    // `npm run search:reindex` builds the index itself and must not race the start-up build.
    if (!this.es || process.env.SEARCH_SKIP_BOOTSTRAP === 'true') return;
    this.cache.onInvalidate((prefix) => {
      if (prefix.startsWith(CATALOG_PREFIX)) this.schedule();
    });
    void this.start(1);
  }

  private async start(attempt: number): Promise<void> {
    try {
      await this.waitForStore();
      if (!(await this.isCurrent())) {
        const result = await this.reindex();
        if (result.ran) this.logger.log(`Product index built: ${result.documents} products in ${result.tookMs} ms`);
      }
    } catch (error) {
      // Elasticsearch may still be starting (the containers come up together); try again for a while.
      if (attempt >= MAX_START_ATTEMPTS) {
        this.logger.warn(`Could not build the product index, searching in memory: ${String(error)}`);
        return;
      }
      setTimeout(() => void this.start(attempt + 1), RETRY_MS).unref();
    }
  }

  /**
   * At boot Redis is still connecting, and the lock below would not work yet (a lock that cannot be taken lets everyone
   * in). Waiting a few seconds keeps two API processes that start together from both building the index.
   */
  private async waitForStore(): Promise<void> {
    for (let i = 0; i < STORE_WAIT_TRIES; i++) {
      if (await this.store.ping().catch(() => false)) return;
      await new Promise((resolve) => setTimeout(resolve, STORE_WAIT_MS));
    }
  }

  /** The alias points to an index made by this version of the code. */
  private async isCurrent(): Promise<boolean> {
    const alias = this.settings.index;
    try {
      const found = await this.es!.indices.getAlias({ name: alias });
      return Object.keys(found).some((name) => name.startsWith(`${alias}-v${PRODUCT_INDEX_VERSION}-`));
    } catch (error) {
      if ((error as { meta?: { statusCode?: number } }).meta?.statusCode === 404) return false;
      throw error;
    }
  }

  /** Index the catalogue soon, once for a burst of changes. */
  schedule(): void {
    if (!this.es) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runScheduled();
    }, DEBOUNCE_MS);
    this.timer.unref();
  }

  private async runScheduled(): Promise<void> {
    if (this.running) {
      // A change arrived while an index was being built: build once more when it is done.
      this.again = true;
      return;
    }
    try {
      const result = await this.reindex();
      // Another API process is indexing right now; its snapshot may be older than this change, so look again soon.
      if (!result.ran) this.schedule();
    } catch (error) {
      this.logger.warn(`Could not update the product index: ${String(error)}`);
    }
  }

  /** Builds a new index from the database and switches the alias to it. */
  async reindex(): Promise<ReindexResult> {
    if (!this.es) return { ran: false };
    if (this.running) {
      this.again = true;
      return { ran: false };
    }
    // One process at a time across all API processes: two builds at once would only waste work.
    const lock = await this.store.increment(LOCK_KEY, LOCK_MS).catch(() => ({ count: 1, ttlMs: LOCK_MS }));
    if (lock.count > 1) return { ran: false };

    this.running = true;
    const startedAt = Date.now();
    const alias = this.settings.index;
    const index = `${alias}-v${PRODUCT_INDEX_VERSION}-${startedAt}`;
    try {
      const documents = await this.loadDocuments();
      await this.es.indices.create({ index, ...PRODUCT_INDEX_BODY } as never);
      for (let start = 0; start < documents.length; start += BATCH) {
        const result = await this.es.bulk({
          operations: documents.slice(start, start + BATCH).flatMap((document) => [{ index: { _index: index, _id: document.id } }, document]),
        });
        if (result.errors) throw new Error('Elasticsearch refused some of the products');
      }
      await this.es.indices.refresh({ index });
      const live = await this.switchAlias(alias, index, startedAt);
      return { ran: true, index: live ? index : undefined, documents: documents.length, tookMs: Date.now() - startedAt };
    } catch (error) {
      await this.es.indices.delete({ index }, { ignore: [404] }).catch(() => undefined);
      throw error;
    } finally {
      this.running = false;
      await this.store.delete(LOCK_KEY).catch(() => undefined);
      if (this.again) {
        this.again = false;
        this.schedule();
      }
    }
  }

  /** The moment an index was built, from its name (`haisan-products-v1-1763900000000`); 0 when it has none. */
  private stamp(name: string): number {
    const found = name.match(/-(\d+)$/);
    return found ? Number(found[1]) : 0;
  }

  /**
   * Points the alias at the new index and removes the OLDER indices, in one request for the alias so searches never see
   * a gap. It is safe when two processes build at once (which the lock should prevent, but a lock can fail): an index
   * is never removed if it is newer than this one, and the alias never moves back to an older index than the live one.
   * Returns false when a newer index was already live; the one just built is then thrown away.
   */
  private async switchAlias(alias: string, index: string, stamp: number): Promise<boolean> {
    const holders = await this.es!.indices
      .getAlias({ name: alias })
      .then((found) => Object.keys(found))
      .catch(() => [] as string[]);

    if (holders.some((name) => this.stamp(name) > stamp)) {
      await this.es!.indices.delete({ index }, { ignore: [404] }).catch(() => undefined);
      return false;
    }

    await this.es!.indices.updateAliases({
      actions: [...holders.map((name) => ({ remove: { index: name, alias } })), { add: { index, alias } }],
    });

    // Every older index of this family goes: the ones the alias pointed to, and any left behind by a build that failed.
    const family = (await this.es!.cat.indices({ index: `${alias}-v*`, h: 'index', format: 'json' }).catch(() => [])) as Array<{ index: string }>;
    for (const { index: name } of family) {
      if (name !== index && this.stamp(name) < stamp) {
        await this.es!.indices.delete({ index: name }, { ignore: [404] }).catch(() => undefined);
      }
    }
    return true;
  }

  private async loadDocuments(): Promise<ProductDocument[]> {
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: SELLABLE_PRODUCT_WHERE,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          species: { select: { commonName: true, scientificName: true } },
          categories: { select: { categoryId: true } },
          variants: {
            where: { isActive: true },
            select: { offers: { where: SELLABLE_OFFER_WHERE, select: { vendor: { select: { name: true, district: true, province: true } } } } },
          },
        },
      }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, parentId: true } }),
    ]);

    const byId = new Map<string, IndexableCategory>(categories.map((category) => [category.id, category]));
    return products.map((product) => {
      const indexable: IndexableProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        species: product.species,
        categoryIds: product.categories.map((link) => link.categoryId),
        offers: product.variants.flatMap((variant) =>
          variant.offers.map((offer) => ({ vendorName: offer.vendor.name, district: offer.vendor.district, province: offer.vendor.province })),
        ),
      };
      return toDocument(indexable, byId);
    });
  }

  /** For the admin page: is the search engine on, does it answer, how many products does it hold. */
  async status(): Promise<SearchStatus> {
    if (!this.es) return { enabled: false, state: 'off' };
    const alias = this.settings.index;
    try {
      const count = await this.es.count({ index: alias }, { signal: AbortSignal.timeout(this.settings.timeoutMs) });
      return { enabled: true, state: 'ok', index: alias, documents: count.count };
    } catch (error) {
      if ((error as { meta?: { statusCode?: number } }).meta?.statusCode === 404) return { enabled: true, state: 'no-index' };
      return { enabled: true, state: 'down' };
    }
  }
}
