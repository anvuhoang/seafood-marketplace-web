import { ApiProperty } from '@nestjs/swagger';
import type { PaymentMethod, PaymentStatus } from '@prisma/client';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../../order/dto/order-common.dto.js';

/** What the QR screen needs about the payment of one of my orders. */
export class PaymentDetailDto {
  /** Shown as the payment reference. @example "HSE-90001" */
  orderNumber: string;
  @ApiProperty({ enum: PAYMENT_METHODS, example: 'BANK_TRANSFER' })
  method: PaymentMethod;
  @ApiProperty({ enum: PAYMENT_STATUSES, example: 'PENDING' })
  status: PaymentStatus;
  /** VND, two decimals. @example "1449999.99" */
  amount: string;
  /** ISO 8601, null while not paid. @example null */
  paidAt: string | null;
  /** QR content to draw. Only sent while the payment is PENDING, otherwise null. @example null */
  qrCode: string | null;
  /** Hosted checkout page. Only sent while the payment is PENDING, otherwise null. @example null */
  checkoutUrl: string | null;
  /** ISO 8601: when the QR stops working. Only sent while PENDING. @example null */
  expiresAt: string | null;
}

/** What PayOS sends when a payment is made. Verified by its signature before anything is read. */
export class PayosWebhookAckDto {
  /** @example true */
  success: boolean;
}
