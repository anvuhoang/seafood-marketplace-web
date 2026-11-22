import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { KV_STORE, type KeyValueStore } from '../../../infra/kv-store.js';

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Slows down password guessing on the admin sign-in: after 5 wrong attempts in
 * 15 minutes the same caller is locked out for 15 minutes.
 *
 * The key should combine the caller's address and the account they try, so one
 * attacker cannot lock a real admin out from another machine. The counters live
 * in the shared store, so with several API processes (and Redis) one lock-out
 * holds on all of them. Keys are hashed: the store never holds an email address.
 *
 * If the store cannot be reached the attempt is allowed and the failure logged:
 * a broken Redis must not lock the admins out of their own console.
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly logger = new Logger(LoginAttemptLimiter.name);

  constructor(@Inject(KV_STORE) private readonly store: KeyValueStore) {}

  private keys(key: string): { failures: string; lock: string } {
    const id = createHash('sha256').update(key).digest('hex').slice(0, 32);
    return { failures: `login:fail:${id}`, lock: `login:lock:${id}` };
  }

  /** Throws 429 while the key is locked out. */
  async assertAllowed(key: string): Promise<void> {
    const remainingMs = await this.safely(() => this.store.ttl(this.keys(key).lock), 0);
    if (remainingMs > 0) {
      const minutes = Math.ceil(remainingMs / 60_000);
      throw new HttpException(
        `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(key: string): Promise<void> {
    const { failures, lock } = this.keys(key);
    await this.safely(async () => {
      const { count } = await this.store.increment(failures, ATTEMPT_WINDOW_MS);
      if (count >= MAX_FAILED_ATTEMPTS) await this.store.set(lock, '1', LOCKOUT_MS);
    }, undefined);
  }

  async reset(key: string): Promise<void> {
    const { failures, lock } = this.keys(key);
    await this.safely(() => this.store.delete(failures, lock), undefined);
  }

  private async safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch (error) {
      this.logger.warn(`The sign-in limit store failed, the attempt is let through: ${String(error)}`);
      return fallback;
    }
  }
}
