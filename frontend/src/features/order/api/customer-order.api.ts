import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { CustomerOrderDetail, CustomerOrderList, OrderStatus, PaymentStatus, ReorderResult } from "../types/order.types";

import { API_BASE_URL } from "@/lib/api-base";
const ME = `${API_BASE_URL}/orders/me`;

export function listMyOrders(
  token: string,
  query: { status?: OrderStatus[]; q?: string; paymentStatus?: PaymentStatus; page?: number; pageSize?: number },
): Promise<CustomerOrderList> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || (Array.isArray(value) && value.length === 0) || value === "") continue;
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const text = search.toString();
  return authenticatedRequest<CustomerOrderList>(`${ME}${text ? `?${text}` : ""}`, token, { cache: "no-store" });
}

export function getMyOrder(token: string, orderNumber: string): Promise<CustomerOrderDetail> {
  return authenticatedRequest<CustomerOrderDetail>(`${ME}/${encodeURIComponent(orderNumber)}`, token, {
    cache: "no-store",
  });
}

/** "Buy again": puts the lines of this order into the cart; what is no longer sold is left out and reported. */
export function reorderMyOrder(token: string, orderNumber: string): Promise<ReorderResult> {
  return authenticatedRequest<ReorderResult>(`${ME}/${encodeURIComponent(orderNumber)}/reorder`, token, { method: "POST" });
}

/** Cancels the whole order; only while no vendor has accepted its part (409 otherwise). */
export function cancelMyOrder(token: string, orderNumber: string): Promise<CustomerOrderDetail> {
  return authenticatedRequest<CustomerOrderDetail>(`${ME}/${encodeURIComponent(orderNumber)}/cancel`, token, {
    method: "POST",
  });
}
