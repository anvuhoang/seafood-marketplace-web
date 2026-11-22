import type { PaymentMethod, PaymentStatus } from "@/features/order/types/order.types";

/** What the QR screen shows about the payment of one order. It mirrors the API; amounts are decimal strings. */
export interface PaymentDetail {
  orderNumber: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  paidAt: string | null;
  /** The QR content, only while the payment is PENDING. */
  qrCode: string | null;
  /** The PayOS page of this payment, only while PENDING. */
  checkoutUrl: string | null;
  /** When the QR stops working (ISO), only while PENDING. */
  expiresAt: string | null;
}
