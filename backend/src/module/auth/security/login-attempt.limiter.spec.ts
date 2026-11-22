import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import {
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  LoginAttemptLimiter,
  MAX_FAILED_ATTEMPTS,
} from './login-attempt.limiter.js';

describe('LoginAttemptLimiter', () => {
  let limiter: LoginAttemptLimiter;
  const key = '1.2.3.4|admin@haisanexpress.vn';
  const start = 1_000_000;

  const failTimes = (count: number, at = start) => {
    for (let i = 0; i < count; i++) limiter.recordFailure(key, at);
  };

  beforeEach(() => {
    limiter = new LoginAttemptLimiter();
  });

  it('allows attempts below the limit', () => {
    failTimes(MAX_FAILED_ATTEMPTS - 1);

    expect(() => limiter.assertAllowed(key, start)).not.toThrow();
  });

  it('locks the caller out with 429 after too many failures', () => {
    failTimes(MAX_FAILED_ATTEMPTS);

    try {
      limiter.assertAllowed(key, start + 1000);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('lets the caller try again once the lockout is over', () => {
    failTimes(MAX_FAILED_ATTEMPTS);

    expect(() => limiter.assertAllowed(key, start + LOCKOUT_MS + 1)).not.toThrow();
  });

  it('does not lock another caller or another account', () => {
    failTimes(MAX_FAILED_ATTEMPTS);

    expect(() => limiter.assertAllowed('9.9.9.9|admin@haisanexpress.vn', start)).not.toThrow();
    expect(() => limiter.assertAllowed('1.2.3.4|someone@else.vn', start)).not.toThrow();
  });

  it('counts failures only inside the window', () => {
    failTimes(MAX_FAILED_ATTEMPTS - 1);
    // The old failures expire, so one more does not reach the limit.
    limiter.recordFailure(key, start + ATTEMPT_WINDOW_MS + 1);

    expect(() => limiter.assertAllowed(key, start + ATTEMPT_WINDOW_MS + 2)).not.toThrow();
  });

  it('forgets failures after a successful sign-in', () => {
    failTimes(MAX_FAILED_ATTEMPTS - 1);
    limiter.reset(key);
    failTimes(MAX_FAILED_ATTEMPTS - 1);

    expect(() => limiter.assertAllowed(key, start)).not.toThrow();
  });
});
