import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { CheckoutPreview, PlaceOrderInput, PlaceOrderResult } from "../types/checkout.types";

import { API_BASE_URL } from "@/lib/api-base";
const CHECKOUT = `${API_BASE_URL}/checkout`;

const json = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

/** What the order of these cart lines (all of them when none are named) would cost now. */
export function previewCheckout(token: string, items?: string[]): Promise<CheckoutPreview> {
  return authenticatedRequest<CheckoutPreview>(`${CHECKOUT}/preview`, token, json(items && items.length > 0 ? { items } : {}));
}

/**
 * Places the order. The idempotency key identifies this attempt: sending the same key again (a double
 * click, a retry after a lost answer) returns the same order instead of creating another one.
 */
export function placeOrder(token: string, idempotencyKey: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return authenticatedRequest<PlaceOrderResult>(CHECKOUT, token, json(input, { "Idempotency-Key": idempotencyKey }));
}
