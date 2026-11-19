import { ApiProperty } from '@nestjs/swagger';
import type { PaymentMethod, PaymentStatus, VendorOrderStatus } from '@prisma/client';
import { VENDOR_ORDER_STATUSES } from '../order-status.js';

export const PAYMENT_METHODS = [
  'COD',
  'BANK_TRANSFER',
  'E_WALLET',
  'CARD',
] as const satisfies readonly PaymentMethod[];
export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const satisfies readonly PaymentStatus[];

export class OrderPaymentDto {
  @ApiProperty({ enum: PAYMENT_METHODS, example: 'COD' })
  method: PaymentMethod;
  @ApiProperty({ enum: PAYMENT_STATUSES, example: 'PENDING' })
  status: PaymentStatus;
  /** ISO 8601, null while unpaid. @example "2026-11-18T08:30:00.000Z" */
  paidAt: string | null;
}

export class OrderShipmentDto {
  @ApiProperty({ enum: VENDOR_ORDER_STATUSES, example: 'SHIPPING' })
  status: VendorOrderStatus;
  /** @example null */
  carrier: string | null;
  /** @example null */
  trackingNumber: string | null;
  /** ISO 8601. @example "2026-11-18T09:00:00.000Z" */
  shippedAt: string | null;
  /** ISO 8601. @example null */
  deliveredAt: string | null;
}

/** One order line, named and priced as it was when ordered (snapshot). */
export class OrderItemDto {
  /** @example "5e6f7081-92a3-4bcd-8ef0-1a2b3c4d5e6f" */
  id: string;
  /** @example "Tôm sú biển tươi sống" */
  productName: string;
  /** @example "Loại 1" */
  variantName: string;
  /** @example "kg" */
  unit: string;
  /** Current product image, if the product still has one. @example "https://res.cloudinary.com/demo/image/upload/v1/tom.jpg" */
  imageUrl: string | null;
  /** Current product slug, for a link to the product page. @example "tom-su-bien-tuoi-song-loai-1" */
  productSlug: string;
  /** VND, two decimals. @example "420000.00" */
  unitPrice: string;
  /** Up to three decimals. @example "1.5" */
  quantity: string;
  /** VND, two decimals. @example "630000.00" */
  lineTotal: string;
}
