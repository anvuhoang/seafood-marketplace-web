import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { PaymentDetail } from "../types/payment.types";

import { API_BASE_URL } from "@/lib/api-base";
const payment = (orderNumber: string) => `${API_BASE_URL}/orders/me/${encodeURIComponent(orderNumber)}/payment`;

/** What is saved about the payment. Cheap: the server does not call PayOS, so it can be polled. */
export function getPayment(token: string, orderNumber: string): Promise<PaymentDetail> {
  return authenticatedRequest<PaymentDetail>(payment(orderNumber), token, { cache: "no-store" });
}

/** The QR that still works, or a new one (also how a failed, cancelled or expired payment is retried). */
export function requestQr(token: string, orderNumber: string): Promise<PaymentDetail> {
  return authenticatedRequest<PaymentDetail>(`${payment(orderNumber)}/qr`, token, { method: "POST" });
}

/** Asks the server to check with PayOS what happened to the QR, and returns the result. */
export function syncPayment(token: string, orderNumber: string): Promise<PaymentDetail> {
  return authenticatedRequest<PaymentDetail>(`${payment(orderNumber)}/sync`, token, { method: "POST" });
}
