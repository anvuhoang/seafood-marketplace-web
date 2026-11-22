import { describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the limiter only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ChatLimiter } from './chat.limiter.js';

const limiter = (chat: Record<string, number> = {}) =>
  new ChatLimiter({ get: () => ({ rateLimitMessages: 3, rateLimitWindowMinutes: 10, rateLimitDailyBudget: 100, ...chat }) } as unknown as ConfigService);

const MINUTE = 60_000;
const T0 = Date.UTC(2026, 10, 22, 8, 0, 0);

function status(run: () => void): number | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : -1;
  }
}

describe('ChatLimiter', () => {
  it('allows a few messages per person, then answers 429', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) expect(status(() => l.consume('user-1', T0 + i))).toBeNull();
    expect(status(() => l.consume('user-1', T0 + 10))).toBe(429);
  });

  it('says which limit was hit: the person\'s own, or the shop\'s daily budget', () => {
    const own = limiter({ rateLimitMessages: 1 });
    own.consume('u', T0);
    expect(() => own.consume('u', T0)).toThrowError(expect.objectContaining({ kind: 'USER_RATE_LIMITED' }));

    const shop = limiter({ rateLimitDailyBudget: 1 });
    shop.consume('a', T0);
    expect(() => shop.consume('b', T0)).toThrowError(expect.objectContaining({ kind: 'DAILY_BUDGET' }));
  });

  it('counts each person on their own', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) l.consume('ip:1.1.1.1', T0);
    expect(status(() => l.consume('ip:1.1.1.1', T0))).toBe(429);
    expect(status(() => l.consume('ip:2.2.2.2', T0))).toBeNull();
  });

  it('lets a person back in once the window has passed, and says how long to wait', () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) l.consume('u', T0);
    try {
      l.consume('u', T0 + 4 * MINUTE);
    } catch (error) {
      expect((error as HttpException).message).toContain('6 phút');
    }
    expect(status(() => l.consume('u', T0 + 10 * MINUTE + 1))).toBeNull();
  });

  it('stops everyone when the daily budget is spent, and starts again the next day', () => {
    const l = limiter({ rateLimitMessages: 100, rateLimitDailyBudget: 3 });
    l.consume('a', T0);
    l.consume('b', T0);
    l.consume('c', T0);
    expect(status(() => l.consume('d', T0))).toBe(429);
    expect(status(() => l.consume('d', T0 + 24 * 60 * MINUTE))).toBeNull();
  });
});
