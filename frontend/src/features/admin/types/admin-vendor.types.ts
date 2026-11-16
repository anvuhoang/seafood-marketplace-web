export type AdminVendorStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export type VendorDecisionAction = "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE";

export interface AdminPerson {
  id: string;
  fullName: string;
  email: string;
}

export interface VendorDecision {
  id: string;
  action: VendorDecisionAction;
  fromStatus: AdminVendorStatus;
  toStatus: AdminVendorStatus;
  reason: string | null;
  admin: AdminPerson;
  createdAt: string;
}

export interface AdminVendorListItem {
  id: string;
  name: string;
  slug: string;
  status: AdminVendorStatus;
  location: string;
  owner: AdminPerson;
  createdAt: string;
  lastDecision: VendorDecision | null;
}

export interface AdminVendorCounts {
  PENDING: number;
  ACTIVE: number;
  REJECTED: number;
  SUSPENDED: number;
  total: number;
}

export interface AdminVendorList {
  items: AdminVendorListItem[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  counts: AdminVendorCounts;
}

export interface AdminVendorDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  status: AdminVendorStatus;
  createdAt: string;
  owner: AdminPerson & { phone: string | null; role: string };
  offerCount: number;
  orderCount: number;
  decisions: VendorDecision[];
}

export interface AdminVendorQuery {
  status?: AdminVendorStatus;
  q?: string;
  page?: number;
}
