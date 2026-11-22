import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RateLimiterService } from './rate-limiter.service.js';

export const RATE_LIMIT_KEY = 'rateLimit';
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

/**
 * A stricter (or looser) limit for one route or controller: at most `limit` requests per `windowSeconds`
 * from the same IP address. Routes without it share the default limit.
 *
 * @example
 * @RateLimit(5, 60) // 5 sign-ups a minute
 * @Post('register')
 */
export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } satisfies RateLimitRule);

/** Leaves a route out of rate limiting (health checks, webhooks that come from one provider address). */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

interface RateLimitSettings {
  enabled: boolean;
  defaultLimit: number;
  defaultWindowSeconds: number;
  trustInternalHeader?: boolean;
}

/**
 * Limits how often one IP address may call the API. Every route has a bucket: the ones marked with @RateLimit
 * have their own, all the others share "default". Counting goes through the shared store, so with several API
 * processes (and Redis) the limit is one limit, not one per process.
 *
 * It answers 429 with Retry-After, and tells every caller where it stands in RateLimit-Limit, RateLimit-Remaining
 * and RateLimit-Reset (seconds). Behind a proxy set TRUST_PROXY, or every visitor shares the proxy's address.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly limiter: RateLimiterService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const settings = this.config.get<RateLimitSettings>('rateLimit') ?? { enabled: true, defaultLimit: 300, defaultWindowSeconds: 60 };
    if (!settings.enabled) return true;

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, targets)) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    if (request.method === 'OPTIONS') return true;
    // Calls made by the website's server while it renders a page, sent through nginx's internal port.
    if (settings.trustInternalHeader && request.headers['x-internal-request'] === '1') return true;

    const rule = this.reflector.getAllAndOverride<RateLimitRule | undefined>(RATE_LIMIT_KEY, targets);
    const limit = rule?.limit ?? settings.defaultLimit;
    const windowSeconds = rule?.windowSeconds ?? settings.defaultWindowSeconds;
    const bucket = rule ? `${context.getClass().name}.${context.getHandler().name}` : 'default';
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';

    const result = await this.limiter.hit(`${bucket}:${ip}`, limit, windowSeconds * 1000);

    const response = http.getResponse<Response>();
    if (!result.degraded) {
      response.setHeader('RateLimit-Limit', String(result.limit));
      response.setHeader('RateLimit-Remaining', String(result.remaining));
    }
    if (result.allowed) return true;

    const retryAfter = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
    response.setHeader('Retry-After', String(retryAfter));
    response.setHeader('RateLimit-Reset', String(retryAfter));
    throw new HttpException(
      `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
