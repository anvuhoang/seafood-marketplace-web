import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Redis } from 'ioredis';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheService } from './cache.service.js';
import { HealthController } from './health.controller.js';
import { KV_STORE, MemoryKeyValueStore, REDIS_CLIENT, RedisKeyValueStore, type KeyValueStore } from './kv-store.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimiterService } from './rate-limiter.service.js';

interface RedisSettings {
  url: string;
  keyPrefix: string;
}

/** Connects to Redis when REDIS_URL is set; otherwise there is no client and the store lives in memory. */
function createRedis(config: ConfigService): Redis | null {
  const settings = config.get<RedisSettings>('redis');
  if (!settings?.url) return null;

  const logger = new Logger('Redis');
  const client = new Redis(settings.url, {
    // Fail fast instead of queuing commands while Redis is down: the callers let requests through anyway.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
  });
  let lastError = 0;
  client.on('error', (error) => {
    if (Date.now() - lastError > 30_000) {
      lastError = Date.now();
      logger.warn(`Redis error: ${error.message}`);
    }
  });
  client.on('ready', () => logger.log('Redis connected'));
  return client;
}

/** Closes the Redis connection when the API shuts down. */
class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }
}

/**
 * What every module may rely on: the shared store (Redis or memory), the cache, the rate limiter, the global
 * rate limit guard and the health check.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [
    { provide: REDIS_CLIENT, inject: [ConfigService], useFactory: createRedis },
    {
      provide: KV_STORE,
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis | null): KeyValueStore =>
        redis ? new RedisKeyValueStore(redis, config.get<RedisSettings>('redis')?.keyPrefix ?? '') : new MemoryKeyValueStore(),
    },
    CacheService,
    RateLimiterService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    RedisShutdown,
  ],
  exports: [KV_STORE, CacheService, RateLimiterService],
})
export class InfraModule {}
