import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VendorOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  addDays,
  DAY_MS,
  daysInclusive,
  eachDay,
  startOfMonth,
  VIETNAM_TIME_ZONE,
  vietnamDayKey,
  vietnamDayStart,
} from '../../common/utils/vietnam-date.js';
import type {
  StatsRange,
  VendorStatsDto,
  VendorStatsMoneyMetricDto,
  VendorStatsNumberMetricDto,
  VendorStatsPeriodDto,
  VendorStatsQueryDto,
  VendorStatsTopProductDto,
} from './dto/vendor-stats.dto.js';
import { findOwnVendor } from './vendor-access.js';
import { LOW_STOCK_THRESHOLD } from './vendor-offer.service.js';

export const STATS_MAX_DAYS = 366;
export const TOP_PRODUCT_LIMIT = 5;

export const STATS_CUSTOM_DATES_REQUIRED = 'Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.';
export const STATS_INVALID_DATE = 'Ngày không hợp lệ.';
export const STATS_FROM_AFTER_TO = 'Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.';
export const STATS_FUTURE_DATE = 'Không thể thống kê cho ngày trong tương lai.';
export const STATS_RANGE_TOO_LONG = `Khoảng thống kê tối đa ${STATS_MAX_DAYS} ngày.`;

/**
 * When a vendor order counts as completed, for revenue.
 *
 * The lifecycle stamps `shipments.delivered_at` when an order moves to
 * COMPLETED, so that is the day the money is earned. Older seed orders were
 * completed without a shipment row; for those the last change of the order
 * (`vendor_orders.updated_at`) is the closest thing we have.
 *
 * Used with `COMPLETED_ORDERS_FROM`, which provides the `vo` and `s` aliases.
 */
export const COMPLETED_AT_SQL = Prisma.sql`COALESCE(s.delivered_at, vo.updated_at)`;

/** Completed vendor orders of one store, completed in [start, end). */
function completedOrdersFrom(vendorId: string, start: Date, end: Date): Prisma.Sql {
  return Prisma.sql`
    FROM vendor_orders vo
    LEFT JOIN shipments s ON s.vendor_order_id = vo.id
    WHERE vo.vendor_id = ${vendorId}::uuid
      AND vo.status = 'COMPLETED'
      AND ${COMPLETED_AT_SQL} >= ${start}
      AND ${COMPLETED_AT_SQL} < ${end}`;
}

/**
 * Turns the query into Vietnam calendar days. `to` is today for the rolling
 * ranges and this month; the previous period always has the same number of
 * days and ends the day before `from`.
 */
export function resolveStatsPeriod(query: VendorStatsQueryDto, now: Date = new Date()): VendorStatsPeriodDto {
  const range: StatsRange = query.range ?? '30d';
  const today = vietnamDayKey(now);
  let from: string;
  let to: string;

  switch (range) {
    case '7d':
      to = today;
      from = addDays(today, -6);
      break;
    case '30d':
      to = today;
      from = addDays(today, -29);
      break;
    case 'this_month':
      to = today;
      from = startOfMonth(today);
      break;
    case 'last_month':
      to = addDays(startOfMonth(today), -1);
      from = startOfMonth(to);
      break;
    case 'custom': {
      if (!query.from || !query.to) throw new BadRequestException(STATS_CUSTOM_DATES_REQUIRED);
      if (!vietnamDayStart(query.from) || !vietnamDayStart(query.to)) {
        throw new BadRequestException(STATS_INVALID_DATE);
      }
      from = query.from;
      to = query.to;
      // Day keys compare correctly as strings.
      if (from > to) throw new BadRequestException(STATS_FROM_AFTER_TO);
      if (to > today) throw new BadRequestException(STATS_FUTURE_DATE);
      if (daysInclusive(from, to) > STATS_MAX_DAYS) throw new BadRequestException(STATS_RANGE_TOO_LONG);
      break;
    }
  }

  const days = daysInclusive(from, to);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));
  return { range, from, to, previousFrom, previousTo, days };
}

/** Change in percent with one decimal, null when there is nothing to compare with. */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const dayStart = (day: string) => vietnamDayStart(day)!;
const dayEnd = (day: string) => new Date(dayStart(day).getTime() + DAY_MS);
const decimal = (value: Prisma.Decimal | number | string | null | undefined) =>
  new Prisma.Decimal(value ?? 0);

function moneyMetric(value: Prisma.Decimal, previous: Prisma.Decimal): VendorStatsMoneyMetricDto {
  return {
    value: value.toFixed(2),
    previous: previous.toFixed(2),
    changePercent: changePercent(value.toNumber(), previous.toNumber()),
  };
}

function numberMetric(value: number, previous: number): VendorStatsNumberMetricDto {
  return { value, previous, changePercent: changePercent(value, previous) };
}

const average = (total: Prisma.Decimal, count: number) =>
  count === 0 ? new Prisma.Decimal(0) : total.div(count);

/** Cancelled share of placed orders, in percent with one decimal. */
const cancellationRate = (cancelled: number, placed: number) =>
  placed === 0 ? 0 : Math.round((cancelled / placed) * 1000) / 10;

interface DailyRow {
  day: string;
  revenue: Prisma.Decimal | number | string | null;
  orders: number | bigint;
}

interface TopProductRow {
  offerId: string;
  productName: string;
  variantName: string;
  unit: string;
  quantity: Prisma.Decimal | number | string | null;
  revenue: Prisma.Decimal | number | string | null;
  itemsRevenue: Prisma.Decimal | number | string | null;
}

@Injectable()
export class VendorStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Revenue and order statistics of the store owned by `userId`, for one period. */
  async getStats(userId: string, query: VendorStatsQueryDto, now: Date = new Date()): Promise<VendorStatsDto> {
    const period = resolveStatsPeriod(query, now);
    const vendor = await findOwnVendor(this.prisma, userId);
    const vendorId = vendor.id;

    const start = dayStart(period.from);
    const end = dayEnd(period.to);
    const previousStart = dayStart(period.previousFrom);

    const [dailyRows, placedNow, placedBefore, topRows] = await Promise.all([
      // One query covers both periods; rows are split by day below.
      this.prisma.$queryRaw<DailyRow[]>(Prisma.sql`
        SELECT to_char(${COMPLETED_AT_SQL} AT TIME ZONE ${VIETNAM_TIME_ZONE}, 'YYYY-MM-DD') AS day,
               SUM(vo.subtotal) AS revenue,
               COUNT(*)::int AS orders
        ${completedOrdersFrom(vendorId, previousStart, end)}
        GROUP BY 1
      `),
      this.prisma.vendorOrder.groupBy({
        by: ['status'],
        where: { vendorId, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.prisma.vendorOrder.groupBy({
        by: ['status'],
        where: { vendorId, createdAt: { gte: previousStart, lt: start } },
        _count: { _all: true },
      }),
      // Grouped by offer and unit: quantities in different units are never added up.
      // The share is taken of the item revenue of the period (window sum before LIMIT),
      // so it cannot pass 100% even if a subtotal ever differs from its line totals.
      this.prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
        SELECT oi.offer_id::text AS "offerId",
               (array_agg(oi.product_name_snapshot ORDER BY vo.created_at DESC))[1] AS "productName",
               (array_agg(oi.variant_name_snapshot ORDER BY vo.created_at DESC))[1] AS "variantName",
               oi.unit_snapshot AS unit,
               SUM(oi.quantity) AS quantity,
               SUM(oi.line_total) AS revenue,
               SUM(SUM(oi.line_total)) OVER () AS "itemsRevenue"
        FROM order_items oi
        JOIN (SELECT vo.id, vo.created_at ${completedOrdersFrom(vendorId, start, end)}) vo
          ON vo.id = oi.vendor_order_id
        GROUP BY oi.offer_id, oi.unit_snapshot
        ORDER BY revenue DESC, "offerId"
        LIMIT ${TOP_PRODUCT_LIMIT}
      `),
    ]);

    // Daily series with every day present, and the totals of both periods.
    const byDay = new Map(dailyRows.map((row) => [row.day, row]));
    let revenue = new Prisma.Decimal(0);
    let completed = 0;
    let previousRevenue = new Prisma.Decimal(0);
    let previousCompleted = 0;
    for (const [day, row] of byDay) {
      const amount = decimal(row.revenue);
      const count = Number(row.orders);
      if (day >= period.from && day <= period.to) {
        revenue = revenue.add(amount);
        completed += count;
      } else if (day >= period.previousFrom && day <= period.previousTo) {
        previousRevenue = previousRevenue.add(amount);
        previousCompleted += count;
      }
    }
    const series = eachDay(period.from, period.to).map((date) => {
      const row = byDay.get(date);
      return {
        date,
        revenue: decimal(row?.revenue).toFixed(2),
        completedOrders: Number(row?.orders ?? 0),
      };
    });

    const statusCounts = (rows: typeof placedNow) => {
      const counts = new Map<VendorOrderStatus, number>(
        Object.values(VendorOrderStatus).map((status) => [status, 0]),
      );
      for (const row of rows) counts.set(row.status, row._count._all);
      return counts;
    };
    const nowCounts = statusCounts(placedNow);
    const beforeCounts = statusCounts(placedBefore);
    const total = (counts: Map<VendorOrderStatus, number>) =>
      [...counts.values()].reduce((sum, count) => sum + count, 0);
    const placed = total(nowCounts);
    const placedPrevious = total(beforeCounts);
    const cancelled = nowCounts.get('CANCELLED') ?? 0;
    const cancelledPrevious = beforeCounts.get('CANCELLED') ?? 0;

    return {
      period,
      summary: {
        revenue: moneyMetric(revenue, previousRevenue),
        completedOrders: numberMetric(completed, previousCompleted),
        averageOrderValue: moneyMetric(
          average(revenue, completed),
          average(previousRevenue, previousCompleted),
        ),
        cancelledOrders: numberMetric(cancelled, cancelledPrevious),
        cancellationRate: numberMetric(
          cancellationRate(cancelled, placed),
          cancellationRate(cancelledPrevious, placedPrevious),
        ),
        placedOrders: placed,
      },
      series,
      ordersByStatus: [...nowCounts].map(([status, count]) => ({ status, count })),
      topProducts: await this.topProducts(vendorId, topRows),
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
  }

  /** Adds the current image and stock of each offer to the sales figures. */
  private async topProducts(vendorId: string, rows: TopProductRow[]): Promise<VendorStatsTopProductDto[]> {
    if (rows.length === 0) return [];
    const offers = await this.prisma.vendorOffer.findMany({
      where: { vendorId, id: { in: [...new Set(rows.map((row) => row.offerId))] } },
      select: {
        id: true,
        stock: true,
        status: true,
        variant: {
          select: {
            product: {
              select: {
                id: true,
                images: { select: { imageUrl: true, isPrimary: true }, orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });
    const offerById = new Map(offers.map((offer) => [offer.id, offer]));

    return rows.map((row) => {
      const offer = offerById.get(row.offerId);
      const product = offer?.variant.product;
      const image = product?.images.find((item) => item.isPrimary) ?? product?.images[0];
      const lineRevenue = decimal(row.revenue);
      const itemsRevenue = decimal(row.itemsRevenue);
      return {
        offerId: row.offerId,
        productId: product?.id ?? null,
        productName: row.productName,
        variantName: row.variantName,
        unit: row.unit,
        quantitySold: decimal(row.quantity).toString(),
        revenue: lineRevenue.toFixed(2),
        // Rounded down so the shares never add up to more than 100.
        sharePercent: itemsRevenue.isZero()
          ? 0
          : Math.floor(lineRevenue.div(itemsRevenue).mul(1000).toNumber()) / 10,
        imageUrl: image?.imageUrl ?? null,
        stock: offer ? offer.stock.toString() : null,
        isLowStock: offer ? offer.status === 'ACTIVE' && offer.stock.lte(LOW_STOCK_THRESHOLD) : false,
      };
    });
  }
}
