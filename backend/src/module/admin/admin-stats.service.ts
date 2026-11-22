import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AdminOverviewDto,
  MonthlyRevenueDto,
  OrderStatsDto,
  OrdersByStatusDto,
  ProductStatsDto,
  ProductsByStatusDto,
  RevenueStatsDto,
  UserStatsDto,
  UsersByRoleDto,
  UsersByStatusDto,
  VendorStatsDto,
  VendorsByStatusDto,
} from './dto/admin-stats.dto.js';

const USER_ROLES = ['CUSTOMER', 'VENDOR', 'ADMIN'] as const;
const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
const VENDOR_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'] as const;
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'COMPLETED', 'CANCELLED'] as const;

const RECENT_ORDER_DAYS = 30;
const REVENUE_MONTHS = 6;
/** Months are cut at midnight Vietnam time, which is where the shops and customers are. */
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

/** Turns groupBy rows into `{ KEY: count }`, with 0 for keys that have no rows. */
function tally<K extends string>(keys: readonly K[], rows: Array<{ key: string; count: number }>): Record<K, number> {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const row of rows) {
    if (row.key in result) result[row.key as K] = row.count;
  }
  return result;
}

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, value) => total + value, 0);

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => Number(value ?? 0);

/** "2026-11" for a date, in Vietnam time. */
function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}`;
}

/** The last `count` month keys ending with the month of `now`, oldest first. */
export function lastMonthKeys(now: Date, count: number): string[] {
  const [year, month] = monthKey(now).split('-').map(Number) as [number, number];
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

interface MonthlyRow {
  month: string;
  status: string;
  total: Prisma.Decimal | number | string | null;
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(): Promise<UserStatsDto> {
    const [roles, statuses] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const byRole = tally(USER_ROLES, roles.map((row) => ({ key: row.role, count: row._count._all }))) as unknown as UsersByRoleDto;
    const byStatus = tally(USER_STATUSES, statuses.map((row) => ({ key: row.status, count: row._count._all }))) as unknown as UsersByStatusDto;
    return { total: sum({ ...byRole }), byRole, byStatus };
  }

  async getVendors(): Promise<VendorStatsDto> {
    const rows = await this.prisma.vendor.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = tally(VENDOR_STATUSES, rows.map((row) => ({ key: row.status, count: row._count._all }))) as unknown as VendorsByStatusDto;
    return { total: sum({ ...byStatus }), byStatus };
  }

  async getProducts(): Promise<ProductStatsDto> {
    const rows = await this.prisma.product.groupBy({ by: ['status'], _count: { _all: true } });
    const byStatus = tally(PRODUCT_STATUSES, rows.map((row) => ({ key: row.status, count: row._count._all }))) as unknown as ProductsByStatusDto;
    return { total: sum({ ...byStatus }), byStatus };
  }

  async getOrders(now = new Date()): Promise<OrderStatsDto> {
    const since = new Date(now.getTime() - RECENT_ORDER_DAYS * 24 * 60 * 60 * 1000);
    const [rows, placedLast30Days] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
    ]);
    const byStatus = tally(ORDER_STATUSES, rows.map((row) => ({ key: row.status, count: row._count._all }))) as unknown as OrdersByStatusDto;
    return { total: sum({ ...byStatus }), byStatus, placedLast30Days };
  }

  /**
   * Revenue = paid payments - refunded payments.
   *
   * A payment holds one status, and a refunded payment was paid first, so
   * "paid" counts PAID and REFUNDED rows together. Subtracting the refunded
   * ones leaves the payments that are still PAID.
   */
  async getRevenue(now = new Date()): Promise<RevenueStatsDto> {
    const months = lastMonthKeys(now, REVENUE_MONTHS);
    // Start of the oldest month. Shifting by the offset of Vietnam (UTC+7, no daylight saving) keeps the cut local.
    const [firstYear, firstMonth] = months[0]!.split('-').map(Number) as [number, number];
    const since = new Date(Date.UTC(firstYear, firstMonth - 1, 1) - 7 * 60 * 60 * 1000);

    const [paidAggregate, refundedAggregate, monthlyRows] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: { in: ['PAID', 'REFUNDED'] } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
        SELECT to_char(paid_at AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM') AS month,
               status::text AS status,
               SUM(amount) AS total
        FROM payments
        WHERE status IN ('PAID', 'REFUNDED') AND paid_at >= ${since}
        GROUP BY 1, 2
      `),
    ]);

    const paid = toNumber(paidAggregate._sum.amount);
    const refunded = toNumber(refundedAggregate._sum.amount);

    const byMonth = new Map<string, { paid: number; refunded: number }>(months.map((month) => [month, { paid: 0, refunded: 0 }]));
    for (const row of monthlyRows) {
      const bucket = byMonth.get(row.month);
      if (!bucket) continue;
      const amount = toNumber(row.total);
      bucket.paid += amount;
      if (row.status === 'REFUNDED') bucket.refunded += amount;
    }
    const monthly: MonthlyRevenueDto[] = months.map((month) => {
      const bucket = byMonth.get(month)!;
      return { month, paid: bucket.paid, refunded: bucket.refunded, net: bucket.paid - bucket.refunded };
    });

    return {
      paid,
      refunded,
      net: paid - refunded,
      paidPaymentCount: paidAggregate._count._all,
      refundedPaymentCount: refundedAggregate._count._all,
      monthly,
    };
  }

  async getOverview(): Promise<AdminOverviewDto> {
    const now = new Date();
    const [users, vendors, products, orders, revenue] = await Promise.all([
      this.getUsers(),
      this.getVendors(),
      this.getProducts(),
      this.getOrders(now),
      this.getRevenue(now),
    ]);
    return { users, vendors, products, orders, revenue, generatedAt: now };
  }
}
