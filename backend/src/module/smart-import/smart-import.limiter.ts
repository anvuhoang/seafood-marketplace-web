import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export const SMART_IMPORT_MAX_CALLS = 30;
export const SMART_IMPORT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Keeps one vendor from burning the shared AI quota: at most 30 calls (voice
 * and text together) in 10 minutes. State is in memory, which suits a single
 * API instance; several instances would need a shared store.
 */
@Injectable()
export class SmartImportLimiter {
  private readonly calls = new Map<string, number[]>();

  /** Counts one call, or throws 429 when the vendor is over the limit. */
  consume(key: string, now = Date.now()): void {
    this.prune(now);
    const recent = (this.calls.get(key) ?? []).filter(
      (at) => now - at < SMART_IMPORT_WINDOW_MS,
    );

    if (recent.length >= SMART_IMPORT_MAX_CALLS) {
      const minutes = Math.ceil(
        (recent[0] + SMART_IMPORT_WINDOW_MS - now) / 60_000,
      );
      throw new HttpException(
        `Bạn đã dùng nhập nhanh bằng AI quá nhiều lần. Vui lòng thử lại sau ${minutes} phút hoặc nhập tay.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.calls.set(key, recent);
  }

  /** Drops vendors with no call in the window, so the map cannot grow forever. */
  private prune(now: number): void {
    for (const [key, times] of this.calls) {
      if (times.every((at) => now - at >= SMART_IMPORT_WINDOW_MS)) {
        this.calls.delete(key);
      }
    }
  }
}
