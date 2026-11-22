import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { hostname } from 'node:os';
import { Public } from '../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService, type CacheStats } from './cache.service.js';
import { SkipRateLimit } from './rate-limit.guard.js';
import { KV_STORE, type KeyValueStore } from './kv-store.js';

export interface HealthDto {
  /** `ok` when everything works, `degraded` when only Redis is down (the shop still runs without it). */
  status: 'ok' | 'degraded';
  /** Which API process answered; with a load balancer it changes from call to call. */
  instance: string;
  uptimeSeconds: number;
  checks: {
    database: 'up';
    /** `off` while there is no REDIS_URL: limits and cache then live in this process only. */
    store: 'memory' | 'redis' | 'redis-down';
  };
  cache: CacheStats;
}

/**
 * For load balancers and container orchestrators. `/health/live` only says the process runs (restart it when
 * it does not answer); `/health` also checks the database and Redis (take the instance out of rotation on 503).
 */
@ApiTags('Health')
@Public()
@SkipRateLimit()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Inject(KV_STORE) private readonly store: KeyValueStore,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'The process is running' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get()
  @ApiOperation({ summary: 'The database and the shared store are reachable' })
  async check(): Promise<HealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'down', checks: { database: 'down' } });
    }

    let storeState: HealthDto['checks']['store'] = this.store.kind;
    if (this.store.kind === 'redis') {
      storeState = (await this.store.ping().catch(() => false)) ? 'redis' : 'redis-down';
    }

    return {
      status: storeState === 'redis-down' ? 'degraded' : 'ok',
      instance: hostname(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: { database: 'up', store: storeState },
      cache: this.cache.stats(),
    };
  }
}
