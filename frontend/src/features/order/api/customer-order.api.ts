import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { CustomerOrderDetail, CustomerOrderList, OrderStatus } from "../types/order.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ME = `${API_BASE_URL}/orders/me`;

export function listMyOrders(
  token: string,
  query: { status?: OrderStatus; page?: number; pageSize?: number },
): Promise<CustomerOrderList> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return authenticatedRequest<CustomerOrderList>(`${ME}${text ? `?${text}` : ""}`, token, { cache: "no-store" });
}

export function getMyOrder(token: string, orderNumber: string): Promise<CustomerOrderDetail> {
  return authenticatedRequest<CustomerOrderDetail>(`${ME}/${encodeURIComponent(orderNumber)}`, token, {
    cache: "no-store",
  });
}

/** Cancels the whole order; only while no vendor has accepted its part (409 otherwise). */
export function cancelMyOrder(token: string, orderNumber: string): Promise<CustomerOrderDetail> {
  return authenticatedRequest<CustomerOrderDetail>(`${ME}/${encodeURIComponent(orderNumber)}/cancel`, token, {
    method: "POST",
  });
}
