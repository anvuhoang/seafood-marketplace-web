import type { CartLine } from "../types/cart.types";

/**
 * The guest cart: only which offer and how much. Names, images and prices are not kept here
 * (they would go stale and must not be trusted); the server prices the lines when the cart is shown.
 */
const KEY = "haisan_cart_v2";
/** Older versions saved whole products here, with a product id instead of an offer id. They cannot be used. */
const LEGACY_KEY = "haisan_cart";

const MAX_LINES = 50;
const MAX_QUANTITY = 100_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quantities have three decimals at most, and adding must not leave 0.30000000000000004. */
export const roundQuantity = (value: number) => Math.round(value * 1000) / 1000;

/** The same offer twice becomes one line; anything that is not a valid line is dropped. */
export function cleanLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const byOffer = new Map<string, number>();
  for (const entry of value) {
    const { offerId, quantity } = (entry ?? {}) as Partial<CartLine>;
    if (typeof offerId !== "string" || !UUID.test(offerId)) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) continue;
    byOffer.set(offerId, roundQuantity((byOffer.get(offerId) ?? 0) + quantity));
  }
  return [...byOffer].slice(0, MAX_LINES).map(([offerId, quantity]) => ({ offerId, quantity }));
}

export function readGuestLines(): CartLine[] {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const stored = localStorage.getItem(KEY);
    return stored ? cleanLines(JSON.parse(stored) as unknown) : [];
  } catch {
    // Storage can be blocked or hold something unreadable: the guest cart is then empty.
    return [];
  }
}

export function writeGuestLines(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // The cart then lasts only until the page closes.
  }
}

export function clearGuestLines(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to clean when storage is blocked.
  }
}
