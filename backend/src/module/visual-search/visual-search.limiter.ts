import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../common/guards/jwt-auth.guard.js';

/** Per signed-in user, or per IP for guests. */
export const VISUAL_SEARCH_MAX_CALLS = 10;
export const VISUAL_SEARCH_WINDOW_MS = 10 * 60 * 1000;
/** For the whole server, so many guests cannot burn the shared Groq quota together. */
export const VISUAL_SEARCH_GLOBAL_MAX_CALLS = 60;
export const VISUAL_SEARCH_GLOBAL_WINDOW_MS = 60 * 1000;

export const VISUAL_SEARCH_BUSY =
  'Tính năng tìm bằng hình ảnh đang có nhiều người dùng. Vui lòng thử lại sau 1 phút hoặc tìm bằng từ khóa.';

/** Who is asking: the bits of the request the limiter needs. */
export interface VisualSearchClient {
  authorization?: string;
  ip?: string;
}

/**
 * Keeps the public route from burning the shared AI quota. State is in memory,
 * which suits a single API instance; several instances would need a shared store.
 */
@Injectable()
export class VisualSearchLimiter {
  private readonly calls = new Map<string, number[]>();
  private globalCalls: number[] = [];

  constructor(private readonly jwt: JwtService) {}

  /**
   * The signed-in user when the request carries a valid token, otherwise the IP.
   * The route is public, so a missing or bad token is not an error here.
   */
  async keyFor(client: VisualSearchClient): Promise<string> {
    const [type, token] = (client.authorization ?? '').split(' ');
    if (type === 'Bearer' && token) {
      try {
        const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
        if (payload?.sub) return `user:${payload.sub}`;
      } catch {
        // Fall back to the IP below.
      }
    }
    return `ip:${client.ip ?? 'unknown'}`;
  }

  /** Counts one search, or throws 429 when the caller or the server is over the limit. */
  consume(key: string, now = Date.now()): void {
    this.prune(now);
    this.globalCalls = this.globalCalls.filter(
      (at) => now - at < VISUAL_SEARCH_GLOBAL_WINDOW_MS,
    );
    const recent = (this.calls.get(key) ?? []).filter(
      (at) => now - at < VISUAL_SEARCH_WINDOW_MS,
    );

    if (recent.length >= VISUAL_SEARCH_MAX_CALLS) {
      const minutes = Math.max(
        1,
        Math.ceil((recent[0] + VISUAL_SEARCH_WINDOW_MS - now) / 60_000),
      );
      throw new HttpException(
        `Bạn đã tìm bằng hình ảnh quá nhiều lần. Vui lòng thử lại sau ${minutes} phút hoặc tìm bằng từ khóa.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (this.globalCalls.length >= VISUAL_SEARCH_GLOBAL_MAX_CALLS) {
      throw new HttpException(VISUAL_SEARCH_BUSY, HttpStatus.TOO_MANY_REQUESTS);
    }

    recent.push(now);
    this.calls.set(key, recent);
    this.globalCalls.push(now);
  }

  /** Drops callers with no search in the window, so the map cannot grow forever. */
  private prune(now: number): void {
    for (const [key, times] of this.calls) {
      if (times.every((at) => now - at >= VISUAL_SEARCH_WINDOW_MS)) {
        this.calls.delete(key);
      }
    }
  }
}
