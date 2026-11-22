import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { VendorStatsQueryDto } from './dto/vendor-stats.dto.js';
import { VendorStatsController } from './vendor-stats.controller.js';
import {
  changePercent,
  COMPLETED_AT_SQL,
  resolveStatsPeriod,
  STATS_CUSTOM_DATES_REQUIRED,
  STATS_FROM_AFTER_TO,
  STATS_FUTURE_DATE,
  STATS_INVALID_DATE,
  STATS_RANGE_TOO_LONG,
  TOP_PRODUCT_LIMIT,
  VendorStatsService,
} from './vendor-stats.service.js';
import { LOW_STOCK_THRESHOLD } from '../offers/vendor-offer.service.js';

/** 2026-11-19 17:00 in Vietnam. */
const NOW = new Date('2026-11-19T10:00:00.000Z');

type RawCall = [Prisma.Sql];
const isTopProducts = (sql: Prisma.Sql) => sql.sql.includes('order_items');

function roleContext(role: string): ExecutionContext {
  return {
    getHandler: () => VendorStatsController.prototype.getStats,
    getClass: () => VendorStatsController,
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'user-a', role } }) }),
  } as unknown as ExecutionContext;
}

async function expectBadRequest(promise: Promise<unknown> | (() => unknown), message: string) {
  const run = typeof promise === 'function' ? Promise.resolve().then(promise) : promise;
  const error = await run.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BadRequestException);
  expect((error as BadRequestException).message).toBe(message);
}

describe('Vendor statistics', () => {
  let service: VendorStatsService;
  let dailyRows: Array<{ completedAt: Date; subtotal: string }>;
  let topRows: Array<Record<string, string>>;
  let prisma: {
    vendor: { findUnique: ReturnType<typeof vi.fn> };
    vendorOrder: { groupBy: ReturnType<typeof vi.fn> };
    vendorOffer: { findMany: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  const rawCalls = () => prisma.$queryRaw.mock.calls as RawCall[];
  const dailySql = () => rawCalls().find(([sql]) => !isTopProducts(sql))![0];
  const topSql = () => rawCalls().find(([sql]) => isTopProducts(sql))![0];

  beforeEach(() => {
    dailyRows = [];
    topRows = [];
    prisma = {
      vendor: { findUnique: vi.fn().mockResolvedValue({ id: 'vendor-a', status: 'ACTIVE' }) },
      vendorOrder: { groupBy: vi.fn().mockResolvedValue([]) },
      vendorOffer: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn((sql: Prisma.Sql) => Promise.resolve(isTopProducts(sql) ? topRows : dailyRows)),
    };
    service = new VendorStatsService(prisma as unknown as PrismaService);
  });

  describe('scope', () => {
    it('finds the store from the token owner and filters every query by it', async () => {
      await service.getStats('user-a', { range: '7d' }, NOW);

      expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { ownerId: 'user-a' },
        select: { id: true, status: true },
      });
      expect(prisma.vendorOrder.groupBy).toHaveBeenCalledTimes(2);
      for (const [args] of prisma.vendorOrder.groupBy.mock.calls as Array<[{ where: { vendorId: string } }]>) {
        expect(args.where.vendorId).toBe('vendor-a');
      }
      expect(rawCalls()).toHaveLength(2);
      for (const [sql] of rawCalls()) {
        expect(sql.sql).toContain('vo.vendor_id = ?::uuid');
        expect(sql.values).toContain('vendor-a');
      }
    });

    it('looks offers up only inside the store', async () => {
      topRows = [
        { offerId: 'offer-1', productName: 'A', variantName: 'V', unit: 'kg', quantity: '1', revenue: '10', itemsRevenue: '10' },
      ];
      await service.getStats('user-a', {}, NOW);

      expect(prisma.vendorOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vendorId: 'vendor-a', id: { in: ['offer-1'] } } }),
      );
    });

    it('lets a pending, suspended or rejected store read its figures', async () => {
      for (const status of ['PENDING', 'SUSPENDED', 'REJECTED']) {
        prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-a', status });
        await expect(service.getStats('user-a', {}, NOW)).resolves.toBeDefined();
      }
    });

    it('answers 404 for a user without a store and runs no query', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.getStats('user-x', {}, NOW)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.vendorOrder.groupBy).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('rejects a vendorId sent by the client (400)', async () => {
      const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
      const metadata = { type: 'query' as const, metatype: VendorStatsQueryDto };

      await expect(pipe.transform({ range: '7d', vendorId: 'vendor-b' }, metadata)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(pipe.transform({ range: 'year' }, metadata)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ range: 'custom', from: '19/11/2026' }, metadata)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(pipe.transform({ range: '7d' }, metadata)).resolves.toEqual({ range: '7d' });
    });

    it('lets only VENDOR accounts through', async () => {
      const reflector = new Reflector();
      const findUnique = vi.fn();
      const guard = new RolesGuard(reflector, { user: { findUnique } } as unknown as PrismaService);
      const asRole = (role: string) => {
        findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
        return guard.canActivate(roleContext(role));
      };

      expect(
        reflector.getAllAndOverride<string[]>(ROLES_KEY, [VendorStatsController.prototype.getStats, VendorStatsController]),
      ).toEqual(['VENDOR']);
      await expect(asRole('VENDOR')).resolves.toBe(true);
      await expect(asRole('CUSTOMER')).rejects.toThrow(ForbiddenException);
      await expect(asRole('ADMIN')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('periods', () => {
    const period = (range: VendorStatsQueryDto['range'], now = NOW, extra: Partial<VendorStatsQueryDto> = {}) => {
      const { from, to, previousFrom, previousTo, days } = resolveStatsPeriod({ range, ...extra }, now);
      return { from, to, previousFrom, previousTo, days };
    };

    it('defaults to the last 30 days', () => {
      expect(resolveStatsPeriod({}, NOW).range).toBe('30d');
      expect(period(undefined)).toEqual({
        from: '2026-10-21',
        to: '2026-11-19',
        previousFrom: '2026-09-21',
        previousTo: '2026-10-20',
        days: 30,
      });
    });

    it('covers the last 7 days, today included', () => {
      expect(period('7d')).toEqual({
        from: '2026-11-13',
        to: '2026-11-19',
        previousFrom: '2026-11-06',
        previousTo: '2026-11-12',
        days: 7,
      });
    });

    it('runs this month up to today and compares with the same number of days before', () => {
      expect(period('this_month')).toEqual({
        from: '2026-11-01',
        to: '2026-11-19',
        previousFrom: '2026-10-13',
        previousTo: '2026-10-31',
        days: 19,
      });
    });

    it('takes the whole of last month', () => {
      expect(period('last_month')).toEqual({
        from: '2026-10-01',
        to: '2026-10-31',
        previousFrom: '2026-08-31',
        previousTo: '2026-09-30',
        days: 31,
      });
    });

    it('cuts days at midnight Vietnam time, not UTC', () => {
      // 23:59 on 30 Nov in Vietnam: still November.
      const lateNovember = new Date('2026-11-30T16:59:00.000Z');
      expect(period('this_month', lateNovember)).toMatchObject({ from: '2026-11-01', to: '2026-11-30' });
      // 00:30 on 1 Dec in Vietnam, while it is still 30 Nov in UTC.
      const earlyDecember = new Date('2026-11-30T17:30:00.000Z');
      expect(period('this_month', earlyDecember)).toMatchObject({ from: '2026-12-01', to: '2026-12-01', days: 1 });
      expect(period('last_month', earlyDecember)).toMatchObject({ from: '2026-11-01', to: '2026-11-30', days: 30 });
      expect(period('7d', earlyDecember)).toMatchObject({ from: '2026-11-25', to: '2026-12-01' });
    });

    it('handles February, leap years and the turn of the year', () => {
      expect(period('last_month', new Date('2026-03-05T03:00:00.000Z'))).toEqual({
        from: '2026-02-01',
        to: '2026-02-28',
        previousFrom: '2026-01-04',
        previousTo: '2026-01-31',
        days: 28,
      });
      expect(period('last_month', new Date('2028-03-01T03:00:00.000Z'))).toMatchObject({
        from: '2028-02-01',
        to: '2028-02-29',
        days: 29,
      });
      expect(period('last_month', new Date('2027-01-10T03:00:00.000Z'))).toMatchObject({
        from: '2026-12-01',
        to: '2026-12-31',
      });
    });

    it('accepts a custom range up to today and up to 366 days', () => {
      expect(period('custom', NOW, { from: '2026-11-01', to: '2026-11-10' })).toEqual({
        from: '2026-11-01',
        to: '2026-11-10',
        previousFrom: '2026-10-22',
        previousTo: '2026-10-31',
        days: 10,
      });
      expect(period('custom', NOW, { from: '2025-11-19', to: '2026-11-19' }).days).toBe(366);
      expect(period('custom', NOW, { from: '2026-11-19', to: '2026-11-19' }).days).toBe(1);
    });

    it('rejects bad custom ranges with a Vietnamese message', async () => {
      const custom = (from?: string, to?: string) => () => resolveStatsPeriod({ range: 'custom', from, to }, NOW);
      await expectBadRequest(custom(undefined, '2026-11-10'), STATS_CUSTOM_DATES_REQUIRED);
      await expectBadRequest(custom('2026-11-01'), STATS_CUSTOM_DATES_REQUIRED);
      await expectBadRequest(custom('2026-11-10', '2026-11-01'), STATS_FROM_AFTER_TO);
      await expectBadRequest(custom('2026-11-10', '2026-11-20'), STATS_FUTURE_DATE);
      await expectBadRequest(custom('2025-11-18', '2026-11-19'), STATS_RANGE_TOO_LONG);
      await expectBadRequest(custom('2026-02-01', '2026-02-30'), STATS_INVALID_DATE);
    });

    it('checks the range before looking anything up', async () => {
      await expectBadRequest(service.getStats('user-a', { range: 'custom' }, NOW), STATS_CUSTOM_DATES_REQUIRED);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('revenue', () => {
    it('adds up the subtotal of completed orders only, never the shipping fee', async () => {
      await service.getStats('user-a', { range: '7d' }, NOW);
      const sql = dailySql().sql;

      expect(sql).toContain(`vo.status = 'COMPLETED'`);
      expect(sql).toContain('vo.subtotal');
      expect(sql).not.toMatch(/shipping_fee|grand_total/);
    });

    it('dates an order by its delivery, or its last update when it has no shipment', async () => {
      expect(COMPLETED_AT_SQL.sql).toBe('COALESCE(s.delivered_at, vo.updated_at)');
      await service.getStats('user-a', { range: '7d' }, NOW);

      for (const sql of [dailySql(), topSql()]) {
        expect(sql.sql).toContain('LEFT JOIN shipments s ON s.vendor_order_id = vo.id');
        expect(sql.sql).toContain(`${COMPLETED_AT_SQL.sql} >= ?`);
        expect(sql.sql).toContain(`${COMPLETED_AT_SQL.sql} < ?`);
      }
      // The query reaches back to the previous period; days are cut in TypeScript, not with AT TIME ZONE.
      expect(dailySql().sql).toContain(`SELECT ${COMPLETED_AT_SQL.sql} AS "completedAt"`);
      expect(dailySql().sql).not.toContain('AT TIME ZONE');
      expect(dailySql().values).toEqual(
        expect.arrayContaining([
          new Date('2026-11-05T17:00:00.000Z'), // previous period starts 2026-11-06 00:00 in Vietnam
          new Date('2026-11-19T17:00:00.000Z'), // period ends after 2026-11-19
        ]),
      );
      // Top products only look at the period itself.
      expect(topSql().values).toEqual(
        expect.arrayContaining([new Date('2026-11-12T17:00:00.000Z'), new Date('2026-11-19T17:00:00.000Z')]),
      );
    });

    it('splits revenue into the period and the period before, and fills every day', async () => {
      dailyRows = [
        { completedAt: new Date('2026-11-08T03:00:00.000Z'), subtotal: '200000.00' },
        { completedAt: new Date('2026-11-13T02:00:00.000Z'), subtotal: '150000.00' },
        { completedAt: new Date('2026-11-19T01:00:00.000Z'), subtotal: '450000.00' },
        { completedAt: new Date('2026-11-19T09:30:00.000Z'), subtotal: '0.50' },
      ];

      const result = await service.getStats('user-a', { range: '7d' }, NOW);

      expect(result.series).toEqual([
        { date: '2026-11-13', revenue: '150000.00', completedOrders: 1 },
        { date: '2026-11-14', revenue: '0.00', completedOrders: 0 },
        { date: '2026-11-15', revenue: '0.00', completedOrders: 0 },
        { date: '2026-11-16', revenue: '0.00', completedOrders: 0 },
        { date: '2026-11-17', revenue: '0.00', completedOrders: 0 },
        { date: '2026-11-18', revenue: '0.00', completedOrders: 0 },
        { date: '2026-11-19', revenue: '450000.50', completedOrders: 2 },
      ]);
      expect(result.summary.revenue).toEqual({ value: '600000.50', previous: '200000.00', changePercent: 200 });
      expect(result.summary.completedOrders).toEqual({ value: 3, previous: 1, changePercent: 200 });
      expect(result.summary.averageOrderValue).toEqual({
        value: '200000.17',
        previous: '200000.00',
        changePercent: 0,
      });
    });

    it('puts an order completed just after midnight in Vietnam on the new day', async () => {
      dailyRows = [
        // 23:59 on 17 Nov and 00:56 on 18 Nov in Vietnam, though both are 17 Nov in UTC.
        { completedAt: new Date('2026-11-17T16:59:00.000Z'), subtotal: '100000.00' },
        { completedAt: new Date('2026-11-17T17:56:00.000Z'), subtotal: '580000.00' },
      ];

      const { series } = await service.getStats('user-a', { range: '7d' }, NOW);

      expect(series.find((day) => day.date === '2026-11-17')).toEqual({
        date: '2026-11-17',
        revenue: '100000.00',
        completedOrders: 1,
      });
      expect(series.find((day) => day.date === '2026-11-18')).toEqual({
        date: '2026-11-18',
        revenue: '580000.00',
        completedOrders: 1,
      });
    });

    it('gives 0 average and no change percent when there is nothing to compare', async () => {
      const result = await service.getStats('user-a', { range: '30d' }, NOW);

      expect(result.series).toHaveLength(30);
      expect(result.series.every((day) => day.revenue === '0.00' && day.completedOrders === 0)).toBe(true);
      expect(result.summary.revenue).toEqual({ value: '0.00', previous: '0.00', changePercent: null });
      expect(result.summary.averageOrderValue).toEqual({ value: '0.00', previous: '0.00', changePercent: null });
      expect(result.summary.completedOrders.changePercent).toBeNull();
      expect(result.summary.cancellationRate).toEqual({ value: 0, previous: 0, changePercent: null });
    });

    it('computes change percent with one decimal', () => {
      expect(changePercent(150, 100)).toBe(50);
      expect(changePercent(50, 150)).toBe(-66.7);
      expect(changePercent(10, 0)).toBeNull();
      expect(changePercent(0, 0)).toBeNull();
    });
  });

  describe('orders by status and cancellations', () => {
    it('counts orders placed in each period, all six statuses included', async () => {
      prisma.vendorOrder.groupBy
        .mockResolvedValueOnce([
          { status: 'PENDING', _count: { _all: 2 } },
          { status: 'COMPLETED', _count: { _all: 5 } },
          { status: 'CANCELLED', _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: { _all: 2 } },
          { status: 'CANCELLED', _count: { _all: 2 } },
        ]);

      const result = await service.getStats('user-a', { range: '7d' }, NOW);

      expect(prisma.vendorOrder.groupBy).toHaveBeenNthCalledWith(1, {
        by: ['status'],
        where: {
          vendorId: 'vendor-a',
          createdAt: { gte: new Date('2026-11-12T17:00:00.000Z'), lt: new Date('2026-11-19T17:00:00.000Z') },
        },
        _count: { _all: true },
      });
      expect(prisma.vendorOrder.groupBy).toHaveBeenNthCalledWith(2, {
        by: ['status'],
        where: {
          vendorId: 'vendor-a',
          createdAt: { gte: new Date('2026-11-05T17:00:00.000Z'), lt: new Date('2026-11-12T17:00:00.000Z') },
        },
        _count: { _all: true },
      });
      expect(result.ordersByStatus).toEqual([
        { status: 'PENDING', count: 2 },
        { status: 'ACCEPTED', count: 0 },
        { status: 'PREPARING', count: 0 },
        { status: 'SHIPPING', count: 0 },
        { status: 'COMPLETED', count: 5 },
        { status: 'CANCELLED', count: 1 },
      ]);
      expect(result.summary.placedOrders).toBe(8);
      expect(result.summary.cancelledOrders).toEqual({ value: 1, previous: 2, changePercent: -50 });
      expect(result.summary.cancellationRate).toEqual({ value: 12.5, previous: 50, changePercent: -75 });
    });
  });

  describe('top products', () => {
    it('asks the database for at most five offers by revenue, units kept apart', async () => {
      await service.getStats('user-a', {}, NOW);
      const sql = topSql();

      expect(sql.sql).toContain('GROUP BY oi.offer_id, oi.unit_snapshot');
      expect(sql.sql).toContain('ORDER BY revenue DESC');
      expect(sql.sql).toContain('SUM(oi.line_total)');
      expect(sql.values).toContain(TOP_PRODUCT_LIMIT);
      expect(TOP_PRODUCT_LIMIT).toBe(5);
    });

    it('keeps the order, fractional quantities, current stock and shares of at most 100%', async () => {
      topRows = [
        { offerId: 'offer-1', productName: 'Tôm hùm', variantName: 'Loại 1', unit: 'kg', quantity: '1.500', revenue: '2000000.00', itemsRevenue: '3000000.00' },
        { offerId: 'offer-2', productName: 'Hàu sữa', variantName: 'Khay 12 con', unit: 'khay', quantity: '3.000', revenue: '600000.00', itemsRevenue: '3000000.00' },
        { offerId: 'offer-gone', productName: 'Mực cũ', variantName: 'Loại 2', unit: 'kg', quantity: '0.750', revenue: '400000.00', itemsRevenue: '3000000.00' },
      ];
      prisma.vendorOffer.findMany.mockResolvedValue([
        {
          id: 'offer-2',
          stock: new Prisma.Decimal('12.000'),
          status: 'ACTIVE',
          variant: { product: { id: 'product-2', images: [{ imageUrl: 'https://img/2.jpg', isPrimary: false }] } },
        },
        {
          id: 'offer-1',
          stock: new Prisma.Decimal(String(LOW_STOCK_THRESHOLD)),
          status: 'ACTIVE',
          variant: {
            product: {
              id: 'product-1',
              images: [
                { imageUrl: 'https://img/1b.jpg', isPrimary: false },
                { imageUrl: 'https://img/1a.jpg', isPrimary: true },
              ],
            },
          },
        },
      ]);

      const { topProducts } = await service.getStats('user-a', {}, NOW);

      expect(topProducts.map((row) => row.offerId)).toEqual(['offer-1', 'offer-2', 'offer-gone']);
      expect(topProducts[0]).toEqual({
        offerId: 'offer-1',
        productId: 'product-1',
        productName: 'Tôm hùm',
        variantName: 'Loại 1',
        unit: 'kg',
        quantitySold: '1.5',
        revenue: '2000000.00',
        sharePercent: 66.6,
        imageUrl: 'https://img/1a.jpg',
        stock: '5',
        isLowStock: true,
      });
      expect(topProducts[1]).toMatchObject({ unit: 'khay', quantitySold: '3', sharePercent: 20, isLowStock: false });
      expect(topProducts[2]).toMatchObject({ productId: null, imageUrl: null, stock: null, isLowStock: false });
      const shares = topProducts.map((row) => row.sharePercent);
      expect(Math.max(...shares)).toBeLessThanOrEqual(100);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBeLessThanOrEqual(100);
    });

    it('does not look offers up when nothing was sold', async () => {
      const { topProducts } = await service.getStats('user-a', {}, NOW);
      expect(topProducts).toEqual([]);
      expect(prisma.vendorOffer.findMany).not.toHaveBeenCalled();
    });
  });
});
