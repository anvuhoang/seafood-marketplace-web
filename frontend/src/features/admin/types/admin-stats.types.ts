export interface UserStats {
  total: number;
  byRole: { CUSTOMER: number; VENDOR: number; ADMIN: number };
  byStatus: { ACTIVE: number; INACTIVE: number; SUSPENDED: number };
}

export interface VendorStats {
  total: number;
  byStatus: { PENDING: number; ACTIVE: number; REJECTED: number; SUSPENDED: number };
}

export interface ProductStats {
  total: number;
  byStatus: { ACTIVE: number; INACTIVE: number; DRAFT: number };
}

export interface OrderStats {
  total: number;
  byStatus: {
    PENDING: number;
    CONFIRMED: number;
    PROCESSING: number;
    SHIPPING: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  placedLast30Days: number;
}

export interface MonthlyRevenue {
  /** "2026-11" */
  month: string;
  paid: number;
  refunded: number;
  net: number;
}

export interface RevenueStats {
  paid: number;
  refunded: number;
  net: number;
  paidPaymentCount: number;
  refundedPaymentCount: number;
  monthly: MonthlyRevenue[];
}

export interface AdminOverview {
  users: UserStats;
  vendors: VendorStats;
  products: ProductStats;
  orders: OrderStats;
  revenue: RevenueStats;
  generatedAt: string;
}
