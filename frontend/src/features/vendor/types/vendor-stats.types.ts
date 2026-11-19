import type { VendorOrderStatus } from "./vendor.types";

/** GET /vendors/me/stats. Money is a decimal string, days are Vietnam calendar days (YYYY-MM-DD). */
export const STATS_RANGES = ["7d", "30d", "this_month", "last_month", "custom"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export interface VendorStatsQuery {
  range: StatsRange;
  from?: string;
  to?: string;
}

export interface VendorStatsPeriod {
  range: StatsRange;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  days: number;
}

export interface MoneyMetric {
  value: string;
  previous: string;
  changePercent: number | null;
}

export interface NumberMetric {
  value: number;
  previous: number;
  changePercent: number | null;
}

export interface VendorStatsSummary {
  revenue: MoneyMetric;
  completedOrders: NumberMetric;
  averageOrderValue: MoneyMetric;
  cancelledOrders: NumberMetric;
  /** Percent with one decimal. */
  cancellationRate: NumberMetric;
  placedOrders: number;
}

export interface VendorStatsDay {
  date: string;
  revenue: string;
  completedOrders: number;
}

export interface VendorStatsTopProduct {
  offerId: string;
  productId: string | null;
  productName: string;
  variantName: string;
  unit: string;
  quantitySold: string;
  revenue: string;
  sharePercent: number;
  imageUrl: string | null;
  stock: string | null;
  isLowStock: boolean;
}

export interface VendorStats {
  period: VendorStatsPeriod;
  summary: VendorStatsSummary;
  series: VendorStatsDay[];
  ordersByStatus: Array<{ status: VendorOrderStatus; count: number }>;
  topProducts: VendorStatsTopProduct[];
  lowStockThreshold: number;
}
