import RedisMock from 'ioredis-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryKeyValueStore, RedisKeyValueStore, type KeyValueStore } from './kv-store.js';

/**
 * The same behaviour is asked of both stores. The Redis one runs against ioredis-mock, an in-process Redis, so
 * the Lua script and the SCAN loop are really executed (a real server is not needed to run the tests).
 */
const time = { now: 1_000_000 };

const stores: Array<[string, () => KeyValueStore]> = [
  ['memory', () => new MemoryKeyValueStore(() => time.now)],
  ['redis', () => new RedisKeyValueStore(new RedisMock() as never, 'test:')],
];

describe.each(stores)('KeyValueStore (%s)', (_name, create) => {
  let store: KeyValueStore;

  beforeEach(async () => {
    time.now = 1_000_000;
    store = create();
    await store.deleteByPrefix('');
  });

  it('counts up inside a window and reports what is left of it', async () => {
    const first = await store.increment('hits', 60_000);
    const second = await store.increment('hits', 60_000);
    const third = await store.increment('hits', 60_000);

    expect([first.count, second.count, third.count]).toEqual([1, 2, 3]);
    expect(first.ttlMs).toBeGreaterThan(0);
    expect(first.ttlMs).toBeLessThanOrEqual(60_000);
    expect(third.ttlMs).toBeLessThanOrEqual(first.ttlMs);
  });

  it('keeps the first window\'s end: later increments do not extend it', async () => {
    await store.increment('hits', 10_000);
    const later = await store.increment('hits', 10_000);
    expect(later.ttlMs).toBeLessThanOrEqual(10_000);
    expect(await store.ttl('hits')).toBeLessThanOrEqual(10_000);
  });

  it('keeps counters apart', async () => {
    await store.increment('a', 60_000);
    await store.increment('a', 60_000);
    expect((await store.increment('b', 60_000)).count).toBe(1);
  });

  it('stores values that expire, and returns null for what is missing', async () => {
    expect(await store.get('nothing')).toBeNull();
    await store.set('value', 'hello', 5_000);
    expect(await store.get('value')).toBe('hello');
    expect(await store.ttl('value')).toBeGreaterThan(0);
    expect(await store.ttl('nothing')).toBe(0);
  });

  it('deletes keys, one or many', async () => {
    await store.set('a', '1', 5_000);
    await store.set('b', '2', 5_000);
    await store.set('c', '3', 5_000);
    await store.delete('a', 'b');
    await store.delete();

    expect(await store.get('a')).toBeNull();
    expect(await store.get('b')).toBeNull();
    expect(await store.get('c')).toBe('3');
  });

  it('deletes by prefix and leaves the others', async () => {
    for (let i = 0; i < 250; i++) await store.set(`catalog:${i}`, 'x', 60_000);
    await store.set('other:1', 'keep', 60_000);

    expect(await store.deleteByPrefix('catalog:')).toBe(250);
    expect(await store.get('catalog:7')).toBeNull();
    expect(await store.get('other:1')).toBe('keep');
  });

  it('answers a ping', async () => {
    expect(await store.ping()).toBe(true);
  });
});

describe('MemoryKeyValueStore: time', () => {
  it('forgets a counter when its window ends, and starts a new one', async () => {
    time.now = 5_000;
    const store = new MemoryKeyValueStore(() => time.now);
    await store.increment('hits', 1_000);
    await store.increment('hits', 1_000);
    time.now += 1_001;
    expect(await store.ttl('hits')).toBe(0);
    expect((await store.increment('hits', 1_000)).count).toBe(1);
  });

  it('forgets a value when its time is up', async () => {
    time.now = 5_000;
    const store = new MemoryKeyValueStore(() => time.now);
    await store.set('v', 'x', 1_000);
    time.now += 1_000;
    expect(await store.get('v')).toBeNull();
  });
});

describe('RedisKeyValueStore: namespace', () => {
  it('keeps every key under its prefix, so the shop can share a Redis server', async () => {
    const redis = new RedisMock();
    const store = new RedisKeyValueStore(redis as never, 'haisan:');
    await store.set('a', '1', 5_000);
    await store.increment('c', 5_000);

    expect((await redis.keys('*')).sort()).toEqual(['haisan:a', 'haisan:c']);
    // Another application's keys on the same server are not touched.
    await redis.set('other-app:x', 'safe');
    await store.deleteByPrefix('');
    expect(await redis.get('other-app:x')).toBe('safe');
    expect(await redis.keys('haisan:*')).toEqual([]);
  });

  it('always sets an expiry on a counter', async () => {
    const redis = new RedisMock();
    const store = new RedisKeyValueStore(redis as never, '');
    await store.increment('hits', 30_000);
    expect(await redis.pttl('hits')).toBeGreaterThan(0);
  });
});
