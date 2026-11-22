import { Inject, Injectable, Logger } from '@nestjs/common';
import { KV_STORE, type KeyValueStore } from '../../infra/kv-store.js';

/** A token lives at most this long (JWT_EXPIRES_IN defaults to 7 days), so a revocation is only worth keeping that long. */
const KEEP_MS = 8 * 24 * 60 * 60 * 1000;

/**
 * Signs a customer out everywhere. A JWT cannot be taken back once it is issued, so when a password is reset the
 * moment is written down and every token issued before it is refused. The guard asks once per request; that is one
 * read of the shared store (Redis, or memory), not a database query.
 *
 * If the store cannot be reached the token is accepted: a broken Redis must not sign everybody out.
 */
@Injectable()
export class SessionRevocationService {
  private readonly logger = new Logger(SessionRevocationService.name);

  constructor(@Inject(KV_STORE) private readonly store: KeyValueStore) {}

  /** Every token issued before now stops working. */
  async revokeAll(userId: string, now = Date.now()): Promise<void> {
    try {
      await this.store.set(`session:revoked:${userId}`, String(Math.floor(now / 1000)), KEEP_MS);
    } catch (error) {
      this.logger.warn(`Could not revoke the sessions of a user: ${String(error)}`);
    }
  }

  /** `issuedAt` is the `iat` of the token, in seconds. */
  async isRevoked(userId: string, issuedAt: number | undefined): Promise<boolean> {
    if (issuedAt === undefined) return false;
    try {
      const revokedAt = await this.store.get(`session:revoked:${userId}`);
      return revokedAt !== null && issuedAt < Number(revokedAt);
    } catch {
      return false;
    }
  }
}
