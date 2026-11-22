import { describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; these classes only need its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { Controller, Get, HttpException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service.js';
import { MemoryKeyValueStore, type KeyValueStore } from './kv-store.js';
import { RateLimit, RateLimitGuard, SkipRateLimit } from './rate-limit.guard.js';
import { RateLimiterService } from './rate-limiter.service.js';

/** A store that fails every call, like a Redis that went away. */
const brokenStore = (): KeyValueStore => {
  const fail = () => Promise.reject(new Error('redis down'));
  return { kind: 'redis', increment: fail, ttl: fail, get: fail, set: fail, delete: fail, deleteByPrefix: fail, ping: fail };
};

const configOf = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('RateLimiterService', () => {
  it('allows up to the limit in a window, then refuses with the time left', async () => {
    const time = { now: 0 };
    const limiter = new RateLimiterService(new MemoryKeyValueStore(() => time.now));

    const results = [];
    for (let i = 0; i < 4; i++) results.push(await limiter.hit('k', 3, 60_000));

    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results.map((result) => result.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[3].retryAfterMs).toBe(60_000);
    time.now += 60_000;
    expect((await limiter.hit('k', 3, 60_000)).allowed).toBe(true);
  });

  it('lets the request through when the store is down, and says it was not counted', async () => {
    const limiter = new RateLimiterService(brokenStore());
    expect(await limiter.hit('k', 3, 60_000)).toEqual({ allowed: true, count: 0, limit: 3, remaining: 3, retryAfterMs: 0, degraded: true });
  });
});

@Controller('sample')
class SampleController {
  @RateLimit(2, 60)
  @Get('strict')
  strict() {}

  @SkipRateLimit()
  @Get('skipped')
  skipped() {}

  @Get('plain')
  plain() {}

  @Get('other')
  other() {}
}

describe('RateLimitGuard', () => {
  function build(settings: Record<string, unknown> = {}, store: KeyValueStore = new MemoryKeyValueStore()) {
    const guard = new RateLimitGuard(
      new RateLimiterService(store),
      new Reflector(),
      configOf({ rateLimit: { enabled: true, defaultLimit: 3, defaultWindowSeconds: 60, ...settings } }),
    );
    const call = async (method: keyof SampleController, ip = '1.1.1.1', httpMethod = 'GET', requestHeaders: Record<string, string> = {}) => {
      const headers: Record<string, string> = {};
      const context = {
        getType: () => 'http',
        getHandler: () => SampleController.prototype[method],
        getClass: () => SampleController,
        switchToHttp: () => ({
          getRequest: () => ({ ip, method: httpMethod, headers: requestHeaders, socket: {} }),
          getResponse: () => ({ setHeader: (name: string, value: string) => (headers[name] = value) }),
        }),
      } as unknown as ExecutionContext;
      const outcome = await guard.canActivate(context).then(
        () => 'allowed' as const,
        (error: unknown) => (error instanceof HttpException ? error : (error as Error)),
      );
      return { outcome, headers };
    };
    return { call };
  }

  it('uses the route\'s own limit and answers 429 with Retry-After once it is used up', async () => {
    const { call } = build();
    expect((await call('strict')).outcome).toBe('allowed');
    const second = await call('strict');
    expect(second.outcome).toBe('allowed');
    expect(second.headers).toMatchObject({ 'RateLimit-Limit': '2', 'RateLimit-Remaining': '0' });

    const refused = await call('strict');
    expect(refused.outcome).toBeInstanceOf(HttpException);
    expect((refused.outcome as HttpException).getStatus()).toBe(429);
    expect(refused.headers['Retry-After']).toBe('60');
    expect(refused.headers['RateLimit-Reset']).toBe('60');
  });

  it('counts routes without their own limit in one shared bucket', async () => {
    const { call } = build();
    await call('plain');
    await call('other');
    await call('plain');
    expect((await call('other')).outcome).toBeInstanceOf(HttpException);
  });

  it('counts each address on its own, and a strict route apart from the default', async () => {
    const { call } = build();
    for (let i = 0; i < 3; i++) await call('plain', '1.1.1.1');
    expect((await call('plain', '1.1.1.1')).outcome).toBeInstanceOf(HttpException);
    expect((await call('plain', '2.2.2.2')).outcome).toBe('allowed');
    expect((await call('strict', '1.1.1.1')).outcome).toBe('allowed');
  });

  it('leaves out skipped routes, preflight requests, and everything when it is switched off', async () => {
    const { call } = build({ defaultLimit: 1 });
    for (let i = 0; i < 5; i++) expect((await call('skipped')).outcome).toBe('allowed');
    for (let i = 0; i < 5; i++) expect((await call('plain', '3.3.3.3', 'OPTIONS')).outcome).toBe('allowed');

    const off = build({ enabled: false, defaultLimit: 1 });
    for (let i = 0; i < 5; i++) expect((await off.call('plain')).outcome).toBe('allowed');
  });

  it("leaves out the website server's own calls only when told to trust the internal header", async () => {
    const trusting = build({ defaultLimit: 1, trustInternalHeader: true });
    for (let i = 0; i < 5; i++) expect((await trusting.call('plain', '9.9.9.9', 'GET', { 'x-internal-request': '1' })).outcome).toBe('allowed');
    // A request without the header is still counted, and so is one with another value.
    await trusting.call('plain', '9.9.9.9');
    expect((await trusting.call('plain', '9.9.9.9')).outcome).toBeInstanceOf(HttpException);
    expect((await trusting.call('plain', '8.8.8.8', 'GET', { 'x-internal-request': '0' })).outcome).toBe('allowed');
    expect((await trusting.call('plain', '8.8.8.8', 'GET', { 'x-internal-request': 'true' })).outcome).toBeInstanceOf(HttpException);

    // Not behind nginx: anybody could send the header, so it means nothing.
    const open = build({ defaultLimit: 1 });
    await open.call('plain', '7.7.7.7', 'GET', { 'x-internal-request': '1' });
    expect((await open.call('plain', '7.7.7.7', 'GET', { 'x-internal-request': '1' })).outcome).toBeInstanceOf(HttpException);
  });

  it('lets requests through, without counting headers, when the store is down', async () => {
    const { call } = build({}, brokenStore());
    for (let i = 0; i < 10; i++) {
      const { outcome, headers } = await call('plain');
      expect(outcome).toBe('allowed');
      expect(headers).toEqual({});
    }
  });
});

describe('CacheService', () => {
  const build = (store: KeyValueStore = new MemoryKeyValueStore(), cache: Record<string, unknown> = { enabled: true }) =>
    new CacheService(store, configOf({ cache }));

  it('loads once, then serves from the cache', async () => {
    const cache = build();
    const load = vi.fn(async () => ({ name: 'Tôm sú', tags: ['a'] }));

    expect(await cache.wrap('catalog:one', 30, load)).toEqual({ name: 'Tôm sú', tags: ['a'] });
    expect(await cache.wrap('catalog:one', 30, load)).toEqual({ name: 'Tôm sú', tags: ['a'] });
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 1, store: 'memory' });
  });

  it('loads again when the time is up', async () => {
    const time = { now: 0 };
    const cache = build(new MemoryKeyValueStore(() => time.now));
    const load = vi.fn(async () => 1);
    await cache.wrap('k', 30, load);
    time.now += 31_000;
    await cache.wrap('k', 30, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('lets requests that arrive during a load share it', async () => {
    const cache = build();
    let release: (value: number) => void = () => undefined;
    const load = vi.fn(() => new Promise<number>((resolve) => (release = resolve)));

    const crowd = Promise.all([cache.wrap('k', 30, load), cache.wrap('k', 30, load), cache.wrap('k', 30, load)]);
    await Promise.resolve();
    release(42);

    expect(await crowd).toEqual([42, 42, 42]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('forgets what starts with the prefix, and keeps the rest', async () => {
    const cache = build();
    await cache.wrap('catalog:products', 30, async () => 'p');
    await cache.wrap('catalog:categories', 30, async () => 'c');
    await cache.wrap('other:x', 30, async () => 'o');

    await cache.invalidate('catalog:');

    const reload = vi.fn(async () => 'fresh');
    expect(await cache.wrap('catalog:products', 30, reload)).toBe('fresh');
    expect(await cache.wrap('other:x', 30, reload)).toBe('o');
  });

  it('does not keep a value that was loaded while the cache was invalidated', async () => {
    const cache = build();
    let release: (value: string) => void = () => undefined;
    let started: () => void = () => undefined;
    const loading = new Promise<void>((resolve) => (started = resolve));
    const slow = cache.wrap('catalog:k', 30, () => new Promise<string>((resolve) => {
      release = resolve;
      started();
    }));

    // The load has begun when the catalogue changes: what it returns may already be out of date.
    await loading;
    await cache.invalidate('catalog:');
    release('stale');
    expect(await slow).toBe('stale');

    const load = vi.fn(async () => 'fresh');
    expect(await cache.wrap('catalog:k', 30, load)).toBe('fresh');
  });

  it('does not cache a failed load, and the next call tries again', async () => {
    const cache = build();
    const load = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce('ok');
    await expect(cache.wrap('k', 30, load)).rejects.toThrow('db down');
    expect(await cache.wrap('k', 30, load)).toBe('ok');
  });

  it('reads from the source when the store is down, or the cache is off', async () => {
    const down = build(brokenStore());
    const load = vi.fn(async () => 'from the database');
    expect(await down.wrap('k', 30, load)).toBe('from the database');
    expect(await down.wrap('k', 30, load)).toBe('from the database');
    expect(load).toHaveBeenCalledTimes(2);
    expect(down.stats().errors).toBeGreaterThan(0);
    await expect(down.invalidate('k')).resolves.toBeUndefined();

    const off = build(new MemoryKeyValueStore(), { enabled: false });
    const again = vi.fn(async () => 1);
    await off.wrap('k', 30, again);
    await off.wrap('k', 30, again);
    expect(again).toHaveBeenCalledTimes(2);
  });
});
