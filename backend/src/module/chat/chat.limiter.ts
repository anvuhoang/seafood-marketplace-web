import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ChatLimitKind = 'USER_RATE_LIMITED' | 'DAILY_BUDGET';

/** A 429 that also says which limit was hit, so the admin page can tell a busy person from an empty quota. */
export class ChatLimitError extends HttpException {
  constructor(
    message: string,
    readonly kind: ChatLimitKind,
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

interface LimiterSettings {
  rateLimitMessages: number;
  rateLimitWindowMinutes: number;
  rateLimitDailyBudget: number;
}

/**
 * Keeps the shared model quota from running out. Each person (a signed-in customer by user id, a guest by
 * IP address) gets a number of messages per window, and the whole shop has a daily budget on top, so a
 * script cannot empty the quota before a demo. State is in memory, which suits one API instance.
 */
@Injectable()
export class ChatLimiter {
  private readonly calls = new Map<string, number[]>();
  private day = '';
  private today = 0;

  constructor(private readonly config: ConfigService) {}

  private settings(): LimiterSettings {
    const chat = this.config.get<Partial<LimiterSettings>>('chat') ?? {};
    return {
      rateLimitMessages: chat.rateLimitMessages ?? 20,
      rateLimitWindowMinutes: chat.rateLimitWindowMinutes ?? 10,
      rateLimitDailyBudget: chat.rateLimitDailyBudget ?? 2000,
    };
  }

  /** Counts one message, or throws 429 when the person or the shop is over the limit. */
  consume(key: string, now = Date.now()): void {
    const { rateLimitMessages, rateLimitWindowMinutes, rateLimitDailyBudget } = this.settings();
    const windowMs = rateLimitWindowMinutes * 60_000;

    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.today = 0;
    }
    if (this.today >= rateLimitDailyBudget) {
      throw new ChatLimitError(
        'Trợ lý đã đạt giới hạn sử dụng trong ngày. Bạn quay lại vào ngày mai hoặc gọi hotline nhé.',
        'DAILY_BUDGET',
      );
    }

    this.prune(now, windowMs);
    const recent = (this.calls.get(key) ?? []).filter((at) => now - at < windowMs);
    if (recent.length >= rateLimitMessages) {
      const minutes = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 60_000));
      throw new ChatLimitError(`Bạn nhắn hơi nhiều rồi. Vui lòng thử lại sau ${minutes} phút nhé.`, 'USER_RATE_LIMITED');
    }

    recent.push(now);
    this.calls.set(key, recent);
    this.today++;
  }

  /** Drops people with no message in the window, so the map cannot grow forever. */
  private prune(now: number, windowMs: number): void {
    for (const [key, times] of this.calls) {
      if (times.every((at) => now - at >= windowMs)) this.calls.delete(key);
    }
  }
}
