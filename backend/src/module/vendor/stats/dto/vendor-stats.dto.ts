import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorOrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { trimOrUndefined } from '../../offers/dto/vendor-offer.dto.js';

export const STATS_RANGES = ['7d', '30d', 'this_month', 'last_month', 'custom'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Which days to report on. Every day boundary is midnight in Vietnam time. */
export class VendorStatsQueryDto {
  /** Defaults to the last 30 days, today included. */
  @ApiPropertyOptional({ enum: STATS_RANGES, default: '30d' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsIn(STATS_RANGES, { message: 'Kỳ thống kê không hợp lệ.' })
  range?: StatsRange;

  /** First day included (YYYY-MM-DD). Required when range is custom, ignored otherwise. */
  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @Matches(DAY_PATTERN, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD.' })
  from?: string;

  /** Last day included (YYYY-MM-DD). Required when range is custom, ignored otherwise. */
  @ApiPropertyOptional({ example: '2026-11-19' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @Matches(DAY_PATTERN, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD.' })
  to?: string;
}

export class VendorStatsPeriodDto {
  @ApiProperty({ enum: STATS_RANGES, example: '30d' })
  range: StatsRange;
  /** First day of the period, Vietnam time. @example "2026-10-21" */
  from: string;
  /** Last day of the period, included. @example "2026-11-19" */
  to: string;
  /** The period of the same length just before. @example "2026-09-21" */
  previousFrom: string;
  /** @example "2026-10-20" */
  previousTo: string;
  /** @example 30 */
  days: number;
}

/** A money figure for the period and the period before. */
export class VendorStatsMoneyMetricDto {
  /** Decimal string, two decimal places. @example "1250000.00" */
  value: string;
  /** @example "1000000.00" */
  previous: string;
  /** Change from the previous period in percent, one decimal; null when the previous period is 0. @example 25 */
  @ApiProperty({ type: Number, nullable: true, example: 25 })
  changePercent: number | null;
}

/** A count or a percentage for the period and the period before. */
export class VendorStatsNumberMetricDto {
  /** @example 12 */
  value: number;
  /** @example 10 */
  previous: number;
  /** Change from the previous period in percent, one decimal; null when the previous period is 0. @example 20 */
  @ApiProperty({ type: Number, nullable: true, example: 20 })
  changePercent: number | null;
}

export class VendorStatsSummaryDto {
  /** Subtotal of orders completed in the period. Shipping fees are not included. */
  revenue: VendorStatsMoneyMetricDto;
  /** Orders completed in the period. */
  completedOrders: VendorStatsNumberMetricDto;
  /** revenue / completedOrders, "0.00" when there is no completed order. */
  averageOrderValue: VendorStatsMoneyMetricDto;
  /** Orders placed in the period that are now cancelled. */
  cancelledOrders: VendorStatsNumberMetricDto;
  /** cancelledOrders / orders placed in the period, in percent with one decimal; 0 when nothing was placed. */
  cancellationRate: VendorStatsNumberMetricDto;
  /** Orders placed in the period, whatever their status now. @example 15 */
  placedOrders: number;
}

export class VendorStatsDayDto {
  /** Vietnam calendar day. @example "2026-11-19" */
  date: string;
  /** Decimal string, "0.00" on a day without completed orders. @example "450000.00" */
  revenue: string;
  /** @example 2 */
  completedOrders: number;
}

export class VendorStatsStatusCountDto {
  @ApiProperty({ enum: VendorOrderStatus })
  status: VendorOrderStatus;
  /** @example 3 */
  count: number;
}

export class VendorStatsTopProductDto {
  /** @example "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d" */
  offerId: string;
  /** Product id of the offer today, for the edit link; null if the offer is gone. */
  @ApiProperty({ type: String, nullable: true })
  productId: string | null;
  /** Name at the time of the latest sale (order snapshot). @example "Tôm hùm bông Nha Trang" */
  productName: string;
  /** @example "Loại 1 (2-3 con/kg)" */
  variantName: string;
  /** @example "kg" */
  unit: string;
  /** Decimal string; fractional amounts are kept. @example "12.500" */
  quantitySold: string;
  /** Sum of line totals in completed orders. @example "8750000.00" */
  revenue: string;
  /** Share of the item revenue of the period, in percent with one decimal. @example 42.3 */
  sharePercent: number;
  /** Current product image, if any. */
  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;
  /** Current stock of the offer, decimal string; null if the offer is gone. */
  @ApiProperty({ type: String, nullable: true, example: '4.000' })
  stock: string | null;
  /** True when the offer is on sale and at or below the low stock threshold. */
  isLowStock: boolean;
}

export class VendorStatsDto {
  period: VendorStatsPeriodDto;
  summary: VendorStatsSummaryDto;

  /** One point per day of the period, days without sales included. */
  @ApiProperty({ type: VendorStatsDayDto, isArray: true })
  series: VendorStatsDayDto[];

  /** Orders placed in the period, by current status; all six statuses, 0 included. */
  @ApiProperty({ type: VendorStatsStatusCountDto, isArray: true })
  ordersByStatus: VendorStatsStatusCountDto[];

  /** At most 5 offers by revenue in completed orders of the period. */
  @ApiProperty({ type: VendorStatsTopProductDto, isArray: true })
  topProducts: VendorStatsTopProductDto[];

  /** @example 5 */
  lowStockThreshold: number;
}
