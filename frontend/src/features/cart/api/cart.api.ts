import { authenticatedRequest, handleResponse } from "@/features/auth/api/auth.api";
import type { CartLine, CartView, MergeResult, QuoteView } from "../types/cart.types";

import { API_BASE_URL } from "@/lib/api-base";
const CART = `${API_BASE_URL}/cart`;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** The signed-in customer's cart. The token decides whose it is. */
export function getCart(token: string): Promise<CartView> {
  return authenticatedRequest<CartView>(CART, token, { cache: "no-store" });
}

export function addCartItem(token: string, line: CartLine): Promise<CartView> {
  return authenticatedRequest<CartView>(`${CART}/items`, token, json("POST", line));
}

/** Sets the quantity of a line (it does not add to it). */
export function updateCartItem(token: string, itemId: string, quantity: number): Promise<CartView> {
  return authenticatedRequest<CartView>(`${CART}/items/${encodeURIComponent(itemId)}`, token, json("PATCH", { quantity }));
}

export function removeCartItem(token: string, itemId: string): Promise<CartView> {
  return authenticatedRequest<CartView>(`${CART}/items/${encodeURIComponent(itemId)}`, token, { method: "DELETE" });
}

export function clearServerCart(token: string): Promise<CartView> {
  return authenticatedRequest<CartView>(CART, token, { method: "DELETE" });
}

/** Adds the browser cart to the server cart after signing in. */
export function mergeCart(token: string, items: CartLine[]): Promise<MergeResult> {
  return authenticatedRequest<MergeResult>(`${CART}/merge`, token, json("POST", { items }));
}

/** Prices a guest cart with the current prices and stock. Nothing is stored. */
export async function quoteCart(items: CartLine[]): Promise<QuoteView> {
  const response = await fetch(`${CART}/quote`, { ...json("POST", { items }), cache: "no-store" });
  return handleResponse<QuoteView>(response);
}
