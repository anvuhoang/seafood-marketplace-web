import { Inject, Injectable, Logger } from '@nestjs/common';
import { KV_STORE, type KeyValueStore } from './kv-store.js';

export interface RateLimitResult {
  allowed: boolean;
  /** Requests counted in the current window, this one included. */
  count: number;
  limit: number;
  remaining: number;
  /** When refused: how long until the window ends. */
  retryAfterMs: number;
  /** The store could not be reached, so the request was let through without being counted. */
  degraded: boolean;
}

const WARN_EVERY_MS = 30_000;

/**
 * Fixed-window counting on top of the shared store: "at most `limit` hits per `windowMs` for this key". It is
 * simple and cheap (one atomic step per hit); the price is that a burst can straddle two windows and briefly
 * reach twice the limit, which is fine for protecting the shop from abuse.
 *
 * If the store is down the hit is allowed: an outage of Redis must not become an outage of the shop. The failure
 * is logged (at most every 30 seconds) and the result says `degraded`.
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private lastWarning = 0;

  constructor(@Inject(KV_STORE) private readonly store: KeyValueStore) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
      const { count, ttlMs } = await this.store.increment(`rl:${key}`, windowMs);
      const allowed = count <= limit;
      return { allowed, count, limit, remaining: Math.max(0, limit - count), retryAfterMs: allowed ? 0 : ttlMs, degraded: false };
    } catch (error) {
      this.warn(error);
      return { allowed: true, count: 0, limit, remaining: limit, retryAfterMs: 0, degraded: true };
    }
  }

  private warn(error: unknown, now = Date.now()): void {
    if (now - this.lastWarning < WARN_EVERY_MS) return;
    this.lastWarning = now;
    this.logger.warn(`The rate limit store failed, requests are let through: ${String(error)}`);
  }
}
