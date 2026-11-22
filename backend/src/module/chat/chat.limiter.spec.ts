import { describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the limiter only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MemoryKeyValueStore } from '../../infra/kv-store.js';
import { RateLimiterService } from '../../infra/rate-limiter.service.js';
import { ChatLimiter } from './chat.limiter.js';

const MINUTE = 60_000;
const T0 = Date.UTC(2026, 10, 22, 8, 0, 0);

/** A limiter whose clock is `time.now`, so a test can move through the window. */
function build(chat: Record<string, number> = {}, store?: MemoryKeyValueStore) {
  const time = { now: T0 };
  const shared = store ?? new MemoryKeyValueStore(() => time.now);
  const config = { get: () => ({ rateLimitMessages: 3, rateLimitWindowMinutes: 10, rateLimitDailyBudget: 100, ...chat }) } as unknown as ConfigService;
  const limiter = new ChatLimiter(config, new RateLimiterService(shared));
  return { limiter, time, shared, consume: (key: string) => limiter.consume(key, time.now) };
}

async function status(run: Promise<void>): Promise<number | null> {
  try {
    await run;
    return null;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : -1;
  }
}

describe('ChatLimiter', () => {
  it('allows a few messages per person, then answers 429', async () => {
    const { consume } = build();
    for (let i = 0; i < 3; i++) expect(await status(consume('user-1'))).toBeNull();
    expect(await status(consume('user-1'))).toBe(429);
  });

  it('says which limit was hit: the person\'s own, or the shop\'s daily budget', async () => {
    const own = build({ rateLimitMessages: 1 });
    await own.consume('u');
    await expect(own.consume('u')).rejects.toMatchObject({ kind: 'USER_RATE_LIMITED' });

    const shop = build({ rateLimitDailyBudget: 1 });
    await shop.consume('a');
    await expect(shop.consume('b')).rejects.toMatchObject({ kind: 'DAILY_BUDGET' });
  });

  it('counts each person on their own', async () => {
    const { consume } = build();
    for (let i = 0; i < 3; i++) await consume('ip:1.1.1.1');
    expect(await status(consume('ip:1.1.1.1'))).toBe(429);
    expect(await status(consume('ip:2.2.2.2'))).toBeNull();
  });

  it('lets a person back in once the window has passed, and says how long to wait', async () => {
    const { consume, time } = build();
    for (let i = 0; i < 3; i++) await consume('u');
    time.now += 4 * MINUTE;
    const error = await consume('u').catch((reason: unknown) => reason);
    expect((error as HttpException).message).toContain('6 phút');
    time.now += 6 * MINUTE + 1;
    expect(await status(consume('u'))).toBeNull();
  });

  it('stops everyone when the daily budget is spent, and starts again at midnight UTC', async () => {
    const { consume, time } = build({ rateLimitMessages: 100, rateLimitDailyBudget: 3 });
    await consume('a');
    await consume('b');
    await consume('c');
    expect(await status(consume('d'))).toBe(429);
    time.now = Date.UTC(2026, 10, 23, 0, 0, 1);
    expect(await status(consume('d'))).toBeNull();
  });

  it('does not spend the shop\'s budget on a message the person was refused', async () => {
    const { consume } = build({ rateLimitMessages: 1, rateLimitDailyBudget: 2 });
    await consume('a');
    for (let i = 0; i < 5; i++) await status(consume('a'));
    // 'a' was refused five times, yet the budget still has room for one more person.
    expect(await status(consume('b'))).toBeNull();
    expect(await status(consume('c'))).toBe(429);
  });

  it('shares its counters through the store, so a second API process sees them', async () => {
    const first = build({ rateLimitMessages: 1 });
    const second = build({ rateLimitMessages: 1 }, first.shared);
    await first.consume('u');
    expect(await status(second.consume('u'))).toBe(429);
  });
});
