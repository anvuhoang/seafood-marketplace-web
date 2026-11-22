import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptState {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

/**
 * Slows down password guessing on the admin sign-in: after 5 wrong attempts in
 * 15 minutes the same caller is locked out for 15 minutes.
 *
 * The key should combine the caller's address and the account they try, so one
 * attacker cannot lock a real admin out from another machine. State lives in
 * memory, which is right for a single API instance; with several instances the
 * counters would need to move to a shared store such as Redis.
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  /** Throws 429 while the key is locked out. */
  assertAllowed(key: string, now = Date.now()): void {
    const state = this.attempts.get(key);
    if (state && state.lockedUntil > now) {
      const minutes = Math.ceil((state.lockedUntil - now) / 60_000);
      throw new HttpException(
        `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(key: string, now = Date.now()): void {
    this.prune(now);
    const current = this.attempts.get(key);
    const state: AttemptState =
      current && now - current.windowStart < ATTEMPT_WINDOW_MS
        ? current
        : { failures: 0, windowStart: now, lockedUntil: 0 };

    state.failures += 1;
    if (state.failures >= MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = now + LOCKOUT_MS;
    }
    this.attempts.set(key, state);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  /** Drops entries whose window and lockout are over, so the map cannot grow forever. */
  private prune(now: number): void {
    for (const [key, state] of this.attempts) {
      if (state.lockedUntil <= now && now - state.windowStart >= ATTEMPT_WINDOW_MS) {
        this.attempts.delete(key);
      }
    }
  }
}
