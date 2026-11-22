import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { MemoryKeyValueStore, type KeyValueStore } from '../../../infra/kv-store.js';
import {
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  LoginAttemptLimiter,
  MAX_FAILED_ATTEMPTS,
} from './login-attempt.limiter.js';

describe('LoginAttemptLimiter', () => {
  let limiter: LoginAttemptLimiter;
  let now: number;
  let store: MemoryKeyValueStore;
  const key = '1.2.3.4|admin@haisanexpress.vn';

  const failTimes = async (count: number) => {
    for (let i = 0; i < count; i++) await limiter.recordFailure(key);
  };

  beforeEach(() => {
    now = 1_000_000;
    store = new MemoryKeyValueStore(() => now);
    limiter = new LoginAttemptLimiter(store);
  });

  it('allows attempts below the limit', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS - 1);

    await expect(limiter.assertAllowed(key)).resolves.toBeUndefined();
  });

  it('locks the caller out with 429 after too many failures', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS);
    now += 1000;

    const error = await limiter.assertAllowed(key).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).message).toContain('15 phút');
  });

  it('lets the caller try again once the lockout is over', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS);
    now += LOCKOUT_MS + 1;

    await expect(limiter.assertAllowed(key)).resolves.toBeUndefined();
  });

  it('does not lock another caller or another account', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS);

    await expect(limiter.assertAllowed('9.9.9.9|admin@haisanexpress.vn')).resolves.toBeUndefined();
    await expect(limiter.assertAllowed('1.2.3.4|someone@else.vn')).resolves.toBeUndefined();
  });

  it('counts failures only inside the window', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS - 1);
    // The old failures expire, so one more does not reach the limit.
    now += ATTEMPT_WINDOW_MS + 1;
    await limiter.recordFailure(key);

    await expect(limiter.assertAllowed(key)).resolves.toBeUndefined();
  });

  it('forgets failures after a successful sign-in', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS - 1);
    await limiter.reset(key);
    await failTimes(MAX_FAILED_ATTEMPTS - 1);

    await expect(limiter.assertAllowed(key)).resolves.toBeUndefined();
  });

  it('keeps a lock-out in the shared store, so a second API process sees it', async () => {
    await failTimes(MAX_FAILED_ATTEMPTS);
    const otherProcess = new LoginAttemptLimiter(store);

    await expect(otherProcess.assertAllowed(key)).rejects.toBeInstanceOf(HttpException);
  });

  it('never writes the email address into the store', async () => {
    const seen: string[] = [];
    const spy: KeyValueStore = {
      ...store,
      kind: 'memory',
      increment: async (name, windowMs) => (seen.push(name), store.increment(name, windowMs)),
      ttl: async (name) => (seen.push(name), store.ttl(name)),
      get: (name) => store.get(name),
      set: async (name, value, ttl) => (seen.push(name), store.set(name, value, ttl)),
      delete: async (...names) => (seen.push(...names), store.delete(...names)),
      deleteByPrefix: (prefix) => store.deleteByPrefix(prefix),
      ping: () => store.ping(),
    };
    const watched = new LoginAttemptLimiter(spy);
    await watched.recordFailure(key);
    await watched.assertAllowed(key);
    await watched.reset(key);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((name) => !name.includes('admin') && !name.includes('1.2.3.4'))).toBe(true);
  });

  it('lets the attempt through, and says so in the log, when the store is down', async () => {
    const down: KeyValueStore = {
      kind: 'redis',
      increment: () => Promise.reject(new Error('redis down')),
      ttl: () => Promise.reject(new Error('redis down')),
      get: () => Promise.reject(new Error('redis down')),
      set: () => Promise.reject(new Error('redis down')),
      delete: () => Promise.reject(new Error('redis down')),
      deleteByPrefix: () => Promise.reject(new Error('redis down')),
      ping: () => Promise.reject(new Error('redis down')),
    };
    const broken = new LoginAttemptLimiter(down);
    const warn = vi.spyOn((broken as unknown as { logger: { warn: () => void } }).logger, 'warn').mockImplementation(() => undefined);

    await expect(broken.assertAllowed(key)).resolves.toBeUndefined();
    await expect(broken.recordFailure(key)).resolves.toBeUndefined();
    await expect(broken.reset(key)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
