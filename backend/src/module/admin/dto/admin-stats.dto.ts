/** Account counts per role. */
export class UsersByRoleDto {
  CUSTOMER: number;
  VENDOR: number;
  ADMIN: number;
}

/** Account counts per status. */
export class UsersByStatusDto {
  ACTIVE: number;
  INACTIVE: number;
  SUSPENDED: number;
}

export class UserStatsDto {
  /** @example 128 */
  total: number;
  byRole: UsersByRoleDto;
  byStatus: UsersByStatusDto;
}

export class VendorsByStatusDto {
  PENDING: number;
  ACTIVE: number;
  REJECTED: number;
  SUSPENDED: number;
}

export class VendorStatsDto {
  /** @example 10 */
  total: number;
  byStatus: VendorsByStatusDto;
}

export class ProductsByStatusDto {
  ACTIVE: number;
  INACTIVE: number;
  DRAFT: number;
}

export class ProductStatsDto {
  /** @example 24 */
  total: number;
  byStatus: ProductsByStatusDto;
}

export class OrdersByStatusDto {
  PENDING: number;
  CONFIRMED: number;
  PROCESSING: number;
  SHIPPING: number;
  COMPLETED: number;
  CANCELLED: number;
}

export class OrderStatsDto {
  /** @example 312 */
  total: number;
  byStatus: OrdersByStatusDto;
  /** Orders placed in the last 30 days. */
  placedLast30Days: number;
}

export class MonthlyRevenueDto {
  /** @example "2026-11" */
  month: string;
  /** Paid payments received in the month, refunded ones included. */
  paid: number;
  /** The part of `paid` that was later refunded. */
  refunded: number;
  /** paid - refunded. */
  net: number;
}

export class RevenueStatsDto {
  /** Sum of every payment that was paid, including the ones refunded afterwards (VND). */
  paid: number;
  /** Sum of refunded payments (VND). */
  refunded: number;
  /**
   * Revenue = paid - refunded (VND). A payment has a single status, so this
   * equals the sum of payments that are still PAID.
   */
  net: number;
  paidPaymentCount: number;
  refundedPaymentCount: number;
  /** The last 6 months, oldest first, months without payments included as 0. */
  monthly: MonthlyRevenueDto[];
}

export class AdminOverviewDto {
  users: UserStatsDto;
  vendors: VendorStatsDto;
  products: ProductStatsDto;
  orders: OrderStatsDto;
  revenue: RevenueStatsDto;
  /** When the figures were calculated. */
  generatedAt: Date;
}
