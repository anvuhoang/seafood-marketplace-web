import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type {
  VendorOrderDetail,
  VendorOrderList,
  VendorOrderQuery,
  VendorOrderTarget,
} from "../types/vendor-order.types";

import { API_BASE_URL } from "@/lib/api-base";
const ORDERS = `${API_BASE_URL}/vendors/me/orders`;

/** The signed-in vendor's orders with store-wide counts per status. */
export function listMyOrders(token: string, query: VendorOrderQuery): Promise<VendorOrderList> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return authenticatedRequest<VendorOrderList>(`${ORDERS}${text ? `?${text}` : ""}`, token, { cache: "no-store" });
}

export function getMyOrder(token: string, id: string): Promise<VendorOrderDetail> {
  return authenticatedRequest<VendorOrderDetail>(`${ORDERS}/${encodeURIComponent(id)}`, token, { cache: "no-store" });
}

/** Move the order one step, or cancel it. There is no way to change the payment from here. */
export function changeOrderStatus(
  token: string,
  id: string,
  status: VendorOrderTarget,
  note?: string,
): Promise<VendorOrderDetail> {
  return authenticatedRequest<VendorOrderDetail>(`${ORDERS}/${encodeURIComponent(id)}/status`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note ? { status, note } : { status }),
  });
}
