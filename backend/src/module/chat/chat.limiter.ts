import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from '../../infra/rate-limiter.service.js';

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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Keeps the shared model quota from running out. Each person (a signed-in customer by user id, a guest by
 * IP address) gets a number of messages per window, and the whole shop has a daily budget on top, so a
 * script cannot empty the quota before a demo. The counters live in the shared store, so they are one set of
 * counters however many API processes there are (given Redis). The daily budget starts again at midnight UTC.
 */
@Injectable()
export class ChatLimiter {
  constructor(
    private readonly config: ConfigService,
    private readonly limiter: RateLimiterService,
  ) {}

  private settings(): LimiterSettings {
    const chat = this.config.get<Partial<LimiterSettings>>('chat') ?? {};
    return {
      rateLimitMessages: chat.rateLimitMessages ?? 20,
      rateLimitWindowMinutes: chat.rateLimitWindowMinutes ?? 10,
      rateLimitDailyBudget: chat.rateLimitDailyBudget ?? 2000,
    };
  }

  /** Counts one message, or throws 429 when the person or the shop is over the limit. */
  async consume(key: string, now = Date.now()): Promise<void> {
    const { rateLimitMessages, rateLimitWindowMinutes, rateLimitDailyBudget } = this.settings();

    // The person first: a refused message must not use up the shop's budget.
    const person = await this.limiter.hit(`chat:user:${key}`, rateLimitMessages, rateLimitWindowMinutes * 60_000);
    if (!person.allowed) {
      const minutes = Math.max(1, Math.ceil(person.retryAfterMs / 60_000));
      throw new ChatLimitError(`Bạn nhắn hơi nhiều rồi. Vui lòng thử lại sau ${minutes} phút nhé.`, 'USER_RATE_LIMITED');
    }

    const day = new Date(now).toISOString().slice(0, 10);
    const untilMidnight = DAY_MS - (now % DAY_MS);
    const shop = await this.limiter.hit(`chat:day:${day}`, rateLimitDailyBudget, untilMidnight);
    if (!shop.allowed) {
      throw new ChatLimitError(
        'Trợ lý đã đạt giới hạn sử dụng trong ngày. Bạn quay lại vào ngày mai hoặc gọi hotline nhé.',
        'DAILY_BUDGET',
      );
    }
  }
}
