import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RateLimiterService } from '../../infra/rate-limiter.service.js';

export const SMART_IMPORT_MAX_CALLS = 30;
export const SMART_IMPORT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Keeps one vendor from burning the shared AI quota: at most 30 calls (voice
 * and text together) in 10 minutes. The count lives in the shared store, so it
 * is one count however many API processes there are (given Redis).
 */
@Injectable()
export class SmartImportLimiter {
  constructor(private readonly limiter: RateLimiterService) {}

  /** Counts one call, or throws 429 when the vendor is over the limit. */
  async consume(key: string): Promise<void> {
    const result = await this.limiter.hit(`smart-import:${key}`, SMART_IMPORT_MAX_CALLS, SMART_IMPORT_WINDOW_MS);
    if (!result.allowed) {
      const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60_000));
      throw new HttpException(
        `Bạn đã dùng nhập nhanh bằng AI quá nhiều lần. Vui lòng thử lại sau ${minutes} phút hoặc nhập tay.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
