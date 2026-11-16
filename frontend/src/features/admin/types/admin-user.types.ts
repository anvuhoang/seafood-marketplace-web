export type AdminUserRole = "CUSTOMER" | "VENDOR" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  /** Orders this account placed, cancelled ones included. */
  orderCount: number;
  /** Value of the orders it placed, cancelled ones excluded. */
  orderTotal: number;
  vendor: { name: string; slug: string; status: string } | null;
}

export interface AdminUserList {
  items: AdminUser[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  counts: {
    total: number;
    byRole: Record<AdminUserRole, number>;
    byStatus: Record<AdminUserStatus, number>;
    activeVendors: number;
    newLast30Days: number;
  };
}

export interface AdminUserQuery {
  role?: AdminUserRole;
  status?: AdminUserStatus;
  q?: string;
  page?: number;
  limit?: number;
}
