import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KV_STORE, type KeyValueStore } from './kv-store.js';

export interface CacheStats {
  store: 'memory' | 'redis';
  enabled: boolean;
  hits: number;
  misses: number;
  errors: number;
}

const WARN_EVERY_MS = 30_000;

/**
 * "Read this from the cache, or compute it and keep it for a while." Values are stored as JSON, so what is cached
 * must survive JSON (no Date, Set, Map or Decimal; convert on the way in and out). The cache is only an
 * optimisation: if the store fails, or the cache is switched off (CACHE_ENABLED=false), the loader runs as if
 * there were no cache.
 *
 * Requests for the same key that arrive while it is being loaded share one load, so an expired popular key does
 * not send a crowd of identical queries to the database.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly loading = new Map<string, Promise<unknown>>();
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private lastWarning = 0;
  /** Goes up on every invalidation, so a load that began before it can tell its result may be stale. */
  private generation = 0;
  private readonly listeners: Array<(prefix: string) => void> = [];

  constructor(
    @Inject(KV_STORE) private readonly store: KeyValueStore,
    private readonly config: ConfigService,
  ) {}

  private get enabled(): boolean {
    return this.config.get<{ enabled?: boolean }>('cache')?.enabled ?? true;
  }

  /** How long the product catalogue is kept, in seconds (CACHE_CATALOG_TTL_SECONDS). */
  get catalogTtlSeconds(): number {
    return this.config.get<{ catalogTtlSeconds?: number }>('cache')?.catalogTtlSeconds ?? 30;
  }

  async wrap<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    if (!this.enabled || ttlSeconds <= 0) return load();
    const storeKey = `cache:${key}`;

    try {
      const cached = await this.store.get(storeKey);
      if (cached !== null) {
        this.hits++;
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.fail(error);
    }

    const running = this.loading.get(storeKey) as Promise<T> | undefined;
    if (running) return running;

    this.misses++;
    const startedAt = this.generation;
    const loadAndKeep = (async () => {
      const value = await load();
      // The cache was invalidated while this was loading: the value may already be out of date, so it is not kept.
      if (startedAt === this.generation) {
        try {
          await this.store.set(storeKey, JSON.stringify(value), ttlSeconds * 1000);
        } catch (error) {
          this.fail(error);
        }
      }
      return value;
    })().finally(() => this.loading.delete(storeKey));
    this.loading.set(storeKey, loadAndKeep);
    return loadAndKeep;
  }

  /** Forgets every cached value whose key starts with the prefix, e.g. "catalog:" after the catalogue changed. */
  async invalidate(prefix: string): Promise<void> {
    this.generation++;
    try {
      await this.store.deleteByPrefix(`cache:${prefix}`);
    } catch (error) {
      this.fail(error);
    }
    for (const listener of this.listeners) {
      try {
        listener(prefix);
      } catch (error) {
        this.logger.warn(`An invalidation listener failed: ${String(error)}`);
      }
    }
  }

  /**
   * Runs `listener` after something was invalidated (with the prefix). The search index uses it to follow the
   * catalogue: whatever empties the cache of the catalogue also brings the index up to date. It runs on the
   * process that made the change, which is the one that knows about it.
   */
  onInvalidate(listener: (prefix: string) => void): void {
    this.listeners.push(listener);
  }

  stats(): CacheStats {
    return { store: this.store.kind, enabled: this.enabled, hits: this.hits, misses: this.misses, errors: this.errors };
  }

  private fail(error: unknown, now = Date.now()): void {
    this.errors++;
    if (now - this.lastWarning < WARN_EVERY_MS) return;
    this.lastWarning = now;
    this.logger.warn(`The cache store failed, reading from the database instead: ${String(error)}`);
  }
}
