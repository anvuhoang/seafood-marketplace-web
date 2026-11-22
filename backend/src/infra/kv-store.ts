import type { Redis } from 'ioredis';

export interface IncrementResult {
  /** The counter after this increment. */
  count: number;
  /** Milliseconds left in the counter's window. */
  ttlMs: number;
}

/**
 * The few shared-state operations the API needs: counters that expire (rate limits, lock-outs) and small values
 * that expire (cache). It has two implementations: in memory, which is right for one API process, and Redis,
 * which several processes share, so limits and caches stay correct behind a load balancer.
 *
 * Methods throw when the store cannot be reached. Callers decide what that means: a rate limit lets the request
 * through (a broken Redis must not take the shop down), a cache just reads from the database.
 */
export interface KeyValueStore {
  readonly kind: 'memory' | 'redis';
  /** Adds 1 to a counter. The window starts at the first increment and the counter vanishes when it ends. */
  increment(key: string, windowMs: number): Promise<IncrementResult>;
  /** Milliseconds left for a key, 0 when it does not exist. */
  ttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  delete(...keys: string[]): Promise<void>;
  /** Removes every key that starts with the prefix; returns how many. */
  deleteByPrefix(prefix: string): Promise<number>;
  ping(): Promise<boolean>;
}

export const KV_STORE = Symbol('KV_STORE');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

interface Entry {
  value: string;
  expiresAt: number;
}

/** Above this many keys, an increment also sweeps the expired ones, so the map cannot grow forever. */
const SWEEP_ABOVE = 5000;

/** In-process store. State is lost on restart and is not shared between processes. */
export class MemoryKeyValueStore implements KeyValueStore {
  readonly kind = 'memory' as const;
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly clock: () => number = Date.now) {}

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= this.clock()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  async increment(key: string, windowMs: number): Promise<IncrementResult> {
    if (this.entries.size > SWEEP_ABOVE) this.sweep();
    const now = this.clock();
    const entry = this.live(key);
    if (!entry) {
      this.entries.set(key, { value: '1', expiresAt: now + windowMs });
      return { count: 1, ttlMs: windowMs };
    }
    entry.value = String(Number(entry.value) + 1);
    return { count: Number(entry.value), ttlMs: entry.expiresAt - now };
  }

  async ttl(key: string): Promise<number> {
    const entry = this.live(key);
    return entry ? entry.expiresAt - this.clock() : 0;
  }

  async get(key: string): Promise<string | null> {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.clock() + ttlMs });
  }

  async delete(...keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let removed = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  private sweep(): void {
    const now = this.clock();
    for (const [key, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(key);
  }
}

/**
 * INCR and the start of the window in one atomic step: a process dying between the two could otherwise leave
 * a counter without an expiry, which would block somebody forever.
 */
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;

/** Redis store, shared by every API process. All keys live under `prefix`, so the shop can share a Redis server. */
export class RedisKeyValueStore implements KeyValueStore {
  readonly kind = 'redis' as const;

  constructor(
    private readonly redis: Redis,
    private readonly prefix = '',
  ) {}

  private key(name: string): string {
    return `${this.prefix}${name}`;
  }

  async increment(key: string, windowMs: number): Promise<IncrementResult> {
    const [count, ttlMs] = (await this.redis.eval(INCREMENT_SCRIPT, 1, this.key(key), String(windowMs))) as [number, number];
    return { count: Number(count), ttlMs: Number(ttlMs) };
  }

  async ttl(key: string): Promise<number> {
    const ms = await this.redis.pttl(this.key(key));
    return ms > 0 ? ms : 0;
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(this.key(key));
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(key), value, 'PX', Math.max(1, Math.round(ttlMs)));
  }

  async delete(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys.map((key) => this.key(key)));
  }

  /**
   * SCAN, not KEYS: KEYS blocks the whole Redis server while it walks every key. The keys are collected first and
   * deleted afterwards, so the walk is not disturbed by the deletions.
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    const found = new Set<string>();
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${this.key(prefix)}*`, 'COUNT', 200);
      cursor = next;
      for (const key of keys) found.add(key);
    } while (cursor !== '0');

    const all = [...found];
    let removed = 0;
    for (let start = 0; start < all.length; start += 500) {
      removed += await this.redis.del(...all.slice(start, start + 500));
    }
    return removed;
  }

  async ping(): Promise<boolean> {
    return (await this.redis.ping()) === 'PONG';
  }
}
