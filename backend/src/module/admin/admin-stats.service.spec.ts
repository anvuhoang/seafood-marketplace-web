import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminStatsService, lastMonthKeys } from './admin-stats.service.js';
import { AdminStatsController } from './admin-stats.controller.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const group = (key: string, field: string, count: number) => ({ [field]: key, _count: { _all: count } });

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prisma: {
    user: { groupBy: ReturnType<typeof vi.fn> };
    vendor: { groupBy: ReturnType<typeof vi.fn> };
    product: { groupBy: ReturnType<typeof vi.fn> };
    order: { groupBy: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
    payment: { aggregate: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prisma = {
      user: { groupBy: vi.fn().mockResolvedValue([]) },
      vendor: { groupBy: vi.fn().mockResolvedValue([]) },
      product: { groupBy: vi.fn().mockResolvedValue([]) },
      order: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } }) },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    service = new AdminStatsService(prisma as unknown as PrismaService);
  });

  describe('users', () => {
    it('counts users by role and status and totals them', async () => {
      prisma.user.groupBy
        .mockResolvedValueOnce([group('CUSTOMER', 'role', 8), group('VENDOR', 'role', 7), group('ADMIN', 'role', 1)])
        .mockResolvedValueOnce([group('ACTIVE', 'status', 15), group('SUSPENDED', 'status', 1)]);

      const result = await service.getUsers();

      expect(result.total).toBe(16);
      expect(result.byRole).toEqual({ CUSTOMER: 8, VENDOR: 7, ADMIN: 1 });
      expect(result.byStatus).toEqual({ ACTIVE: 15, INACTIVE: 0, SUSPENDED: 1 });
    });

    it('returns zeros, not missing keys, for an empty table', async () => {
      const result = await service.getUsers();

      expect(result.total).toBe(0);
      expect(result.byRole).toEqual({ CUSTOMER: 0, VENDOR: 0, ADMIN: 0 });
    });
  });

  describe('vendors', () => {
    it('counts vendors for every approval status, filling the gaps with 0', async () => {
      prisma.vendor.groupBy.mockResolvedValue([group('ACTIVE', 'status', 6), group('PENDING', 'status', 3)]);

      const result = await service.getVendors();

      expect(result).toEqual({
        total: 9,
        byStatus: { PENDING: 3, ACTIVE: 6, REJECTED: 0, SUSPENDED: 0 },
      });
    });
  });

  describe('products', () => {
    it('counts products in total and by status', async () => {
      prisma.product.groupBy.mockResolvedValue([group('ACTIVE', 'status', 26), group('INACTIVE', 'status', 1)]);

      const result = await service.getProducts();

      expect(result).toEqual({ total: 27, byStatus: { ACTIVE: 26, INACTIVE: 1, DRAFT: 0 } });
    });
  });

  describe('orders', () => {
    it('counts orders by status and the ones placed in the last 30 days', async () => {
      const now = new Date('2026-11-04T10:00:00.000Z');
      prisma.order.groupBy.mockResolvedValue([group('COMPLETED', 'status', 5), group('PENDING', 'status', 2)]);
      prisma.order.count.mockResolvedValue(4);

      const result = await service.getOrders(now);

      expect(result.total).toBe(7);
      expect(result.byStatus.CANCELLED).toBe(0);
      expect(result.placedLast30Days).toBe(4);
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { createdAt: { gte: new Date('2026-10-05T10:00:00.000Z') } },
      });
    });
  });

  describe('revenue', () => {
    const now = new Date('2026-11-04T10:00:00.000Z');

    /** First call counts paid + refunded rows, second counts refunded rows only. */
    const mockTotals = (paid: number, paidCount: number, refunded: number, refundedCount: number) => {
      prisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: paid }, _count: { _all: paidCount } })
        .mockResolvedValueOnce({ _sum: { amount: refunded }, _count: { _all: refundedCount } });
    };

    it('defines revenue as paid minus refunded', async () => {
      mockTotals(1_000_000, 4, 250_000, 1);

      const result = await service.getRevenue(now);

      expect(result.paid).toBe(1_000_000);
      expect(result.refunded).toBe(250_000);
      expect(result.net).toBe(750_000);
      expect(result.paidPaymentCount).toBe(4);
      expect(result.refundedPaymentCount).toBe(1);
    });

    it('counts a payment as paid once it was paid, even if refunded afterwards', async () => {
      await service.getRevenue(now);

      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ where: { status: { in: ['PAID', 'REFUNDED'] } } }),
      );
      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { status: 'REFUNDED' } }),
      );
    });

    it('is 0 when there are no payments', async () => {
      const result = await service.getRevenue(now);

      expect(result.net).toBe(0);
      expect(result.monthly).toHaveLength(6);
      expect(result.monthly.every((month) => month.paid === 0 && month.net === 0)).toBe(true);
    });

    it('breaks revenue down by month and fills months with no payments', async () => {
      mockTotals(900_000, 3, 100_000, 1);
      prisma.$queryRaw.mockResolvedValue([
        { month: '2026-09', status: 'PAID', total: '500000.00' },
        { month: '2026-11', status: 'PAID', total: 300000 },
        { month: '2026-11', status: 'REFUNDED', total: 100000 },
        { month: '2020-01', status: 'PAID', total: 999 },
      ]);

      const result = await service.getRevenue(now);

      expect(result.monthly.map((month) => month.month)).toEqual([
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
        '2026-10',
        '2026-11',
      ]);
      expect(result.monthly[3]).toEqual({ month: '2026-09', paid: 500_000, refunded: 0, net: 500_000 });
      expect(result.monthly[4]).toEqual({ month: '2026-10', paid: 0, refunded: 0, net: 0 });
      // November: 300k paid plus 100k that was paid then refunded, so net is 300k.
      expect(result.monthly[5]).toEqual({ month: '2026-11', paid: 400_000, refunded: 100_000, net: 300_000 });
    });
  });

  describe('overview', () => {
    it('combines every statistic and stamps when it was calculated', async () => {
      const result = await service.getOverview();

      expect(Object.keys(result).sort()).toEqual(['generatedAt', 'orders', 'products', 'revenue', 'users', 'vendors']);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('lastMonthKeys', () => {
  it('lists months oldest first and crosses the year boundary', () => {
    expect(lastMonthKeys(new Date('2026-02-10T00:00:00.000Z'), 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('uses Vietnam time, so 18:00 UTC on the last day already belongs to the next month', () => {
    expect(lastMonthKeys(new Date('2026-10-31T18:00:00.000Z'), 1)).toEqual(['2026-11']);
  });
});

describe('AdminStatsController access control', () => {
  it('restricts every statistics route to the ADMIN role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminStatsController)).toEqual(['ADMIN']);
  });

  it('uses the shared JWT and roles guards', () => {
    const guards = Reflect.getMetadata('__guards__', AdminStatsController) as Array<{ name: string }>;
    expect(guards.map((guard) => guard.name)).toEqual(['JwtAuthGuard', 'RolesGuard']);
  });
});
