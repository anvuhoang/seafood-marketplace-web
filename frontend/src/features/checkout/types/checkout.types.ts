import type { CartItemView, CartVendor } from "@/features/cart/types/cart.types";

export type PaymentMethod = "COD" | "BANK_TRANSFER" | "E_WALLET" | "CARD";

/** The lines of one vendor in the order, with that vendor's shipping fee and total. */
export interface CheckoutVendor {
  vendor: CartVendor;
  items: CartItemView[];
  subtotal: number;
  shippingFee: number;
  total: number;
}

/** What the order would cost now, worked out by the server. Nothing is stored or reserved. */
export interface CheckoutPreview {
  vendors: CheckoutVendor[];
  lineCount: number;
  subtotal: number;
  shippingTotal: number;
  grandTotal: number;
  /** Why checkout is not possible yet, in Vietnamese. */
  problems: string[];
  canCheckout: boolean;
  supportedPaymentMethods: PaymentMethod[];
}

export interface ShippingInput {
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward?: string;
  streetAddress: string;
}

/** What is sent to place an order: which lines, where to, how to pay. Never a price or a total. */
export interface PlaceOrderInput {
  items?: string[];
  addressId?: string;
  shipping?: ShippingInput;
  paymentMethod: PaymentMethod;
  customerNote?: string;
}

export interface PlaceOrderResult {
  order: { orderNumber: string };
  /** True when this attempt had already placed the order, so nothing new was created. */
  alreadyPlaced: boolean;
}
