import { authenticatedRequest } from "@/features/auth/api/auth.api";
import {
  AdminVendorDetail,
  AdminVendorList,
  AdminVendorQuery,
  VendorDecisionAction,
} from "../types/admin-vendor.types";

import { API_BASE_URL } from "@/lib/api-base";

const ACTION_PATH: Record<VendorDecisionAction, string> = {
  APPROVE: "approve",
  REJECT: "reject",
  SUSPEND: "suspend",
  REACTIVATE: "reactivate",
};

export function getAdminVendors(token: string, query: AdminVendorQuery): Promise<AdminVendorList> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const suffix = params.size > 0 ? `?${params}` : "";

  return authenticatedRequest<AdminVendorList>(`${API_BASE_URL}/admin/vendors${suffix}`, token);
}

export function getAdminVendor(token: string, id: string): Promise<AdminVendorDetail> {
  return authenticatedRequest<AdminVendorDetail>(`${API_BASE_URL}/admin/vendors/${encodeURIComponent(id)}`, token);
}

/** Applies a decision and returns the updated vendor. `reason` is required for REJECT and SUSPEND. */
export function decideVendor(
  token: string,
  id: string,
  action: VendorDecisionAction,
  reason?: string,
): Promise<AdminVendorDetail> {
  return authenticatedRequest<AdminVendorDetail>(
    `${API_BASE_URL}/admin/vendors/${encodeURIComponent(id)}/${ACTION_PATH[action]}`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );
}
