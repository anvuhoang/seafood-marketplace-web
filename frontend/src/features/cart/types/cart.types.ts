export interface CartVendor {
  id: string;
  name: string;
  slug: string;
  district: string;
  province: string;
}

/** The lines of one vendor, with the total of those that can be bought (worked out by the server). */
export interface CartVendorGroup {
  vendor: CartVendor;
  lineCount: number;
  subtotal: number;
}

/** One line of the cart, as the API returns it. Every amount is worked out by the server. */
export interface CartItemView {
  /** The line on the server (used to change or remove it). Null for a guest cart, which is only priced. */
  id: string | null;
  offerId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  sizeLabel: string | null;
  imageUrl: string | null;
  vendor: CartVendor;
  unit: string;
  /** VND per unit, read from the offer now. */
  unitPrice: number;
  quantity: number;
  /** unitPrice x quantity; 0 when the line cannot be bought. */
  subtotal: number;
  stock: number;
  /** False when the line cannot be bought as it is; it is left out of the total. */
  available: boolean;
  /** Why it cannot be bought, in Vietnamese. */
  problem: string | null;
}

export interface CartView {
  items: CartItemView[];
  /** The same lines grouped by vendor, in the order the vendors first appear. */
  vendors: CartVendorGroup[];
  lineCount: number;
  /** Total of the lines that can be bought, in VND. */
  subtotal: number;
  hasProblems: boolean;
}

export interface MergeResult {
  cart: CartView;
  /** What the server left out or lowered while merging the browser cart. */
  notices: string[];
}

export interface QuoteView extends CartView {
  /** Offers that no longer exist; the browser drops them. */
  unknownOfferIds: string[];
}

/** What a request says: which offer and how much. Prices are never sent. */
export interface CartLine {
  offerId: string;
  quantity: number;
}

export interface CartActionResult {
  success: boolean;
  message: string;
}

export const EMPTY_CART: CartView = { items: [], vendors: [], lineCount: 0, subtotal: 0, hasProblems: false };
