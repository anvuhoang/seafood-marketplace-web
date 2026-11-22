import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Webhook } from '@payos/node';
import type { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ORDER_NOT_FOUND } from '../order/order-lifecycle.service.js';
import type { PaymentDetailDto } from './dto/payment.dto.js';
import { newOrderCode } from './order-code.js';
import { PayosService } from './payos.service.js';

export const PAYMENT_NOT_FOUND = 'Đơn hàng này chưa có thông tin thanh toán.';
export const PAYMENT_NOT_ONLINE =
  'Đơn hàng này không thanh toán bằng mã QR.';
export const PAYMENT_ALREADY_PAID = 'Đơn hàng này đã được thanh toán.';
export const PAYMENT_REFUNDED = 'Đơn hàng này đã được hoàn tiền.';
export const ORDER_IS_CANCELLED =
  'Đơn hàng đã bị hủy nên không thể thanh toán.';
export const PAYOS_UNAVAILABLE =
  'Không tạo được mã QR lúc này. Vui lòng thử lại sau ít phút.';
export const WEBHOOK_INVALID = 'Dữ liệu webhook không hợp lệ.';
export const PAYMENT_EXPIRED_REASON = 'Mã QR đã hết hạn.';
export const PAYMENT_CANCELLED_REASON = 'Khách hàng đã hủy giao dịch.';

/**
 * Money may still arrive for these: a QR is scanned after the page was closed, after it expired, or
 * just before the order was cancelled. Money that really arrived is recorded as paid, never ignored.
 * A refunded payment is final.
 */
const PAYABLE_BY_WEBHOOK: PaymentStatus[] = ['PENDING', 'EXPIRED', 'CANCELLED', 'FAILED'];

/** The status a PayOS payment link status means for us, or null while it is still open. */
export function paymentStatusFromPayos(status: string): PaymentStatus | null {
  switch (status) {
    case 'PAID':
      return 'PAID';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'FAILED':
      return 'FAILED';
    default:
      return null;
  }
}

/** Whole VND that PayOS expects for a payment amount. */
export function toPayosAmount(amount: Prisma.Decimal): number {
  return Math.round(amount.toNumber());
}

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  payment: {
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      paidAt: true,
      qrCode: true,
      checkoutUrl: true,
      expiresAt: true,
      orderCode: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function toDetail(row: OrderRow): PaymentDetailDto {
  const { payment } = row;
  if (!payment) throw new NotFoundException(PAYMENT_NOT_FOUND);
  // The QR is only useful while the customer can still pay with it.
  const payable = payment.status === 'PENDING';
  return {
    orderNumber: row.orderNumber,
    method: payment.method,
    status: payment.status,
    amount: payment.amount.toFixed(2),
    paidAt: payment.paidAt?.toISOString() ?? null,
    qrCode: payable ? payment.qrCode : null,
    checkoutUrl: payable ? payment.checkoutUrl : null,
    expiresAt: payable ? (payment.expiresAt?.toISOString() ?? null) : null,
  };
}

/** The payment of the signed-in customer's own orders. Every query is scoped by the token's user id. */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payos: PayosService,
  ) {}

  /** 404 for someone else's order too, so order numbers reveal nothing. Never calls PayOS. */
  async getPayment(
    userId: string,
    orderNumber: string,
  ): Promise<PaymentDetailDto> {
    return toDetail(await this.find(userId, orderNumber));
  }

  /**
   * Gives the customer a QR to pay with: the one still working, or a new one when the payment has
   * none, it expired, was cancelled or failed. Each attempt gets its own PayOS order code.
   */
  async createLink(
    userId: string,
    orderNumber: string,
  ): Promise<PaymentDetailDto> {
    const row = await this.find(userId, orderNumber);
    const { payment } = row;
    if (!payment) throw new NotFoundException(PAYMENT_NOT_FOUND);
    if (payment.method !== 'BANK_TRANSFER') {
      throw new ConflictException(PAYMENT_NOT_ONLINE);
    }
    if (payment.status === 'PAID') throw new ConflictException(PAYMENT_ALREADY_PAID);
    if (payment.status === 'REFUNDED') throw new ConflictException(PAYMENT_REFUNDED);
    if (row.status === 'CANCELLED') throw new ConflictException(ORDER_IS_CANCELLED);
    // A PENDING payment that has a QR still has a working one: find() expired the old ones.
    if (payment.status === 'PENDING' && payment.qrCode) return toDetail(row);

    const orderCode = newOrderCode();
    const expiresAt = new Date(
      Date.now() + this.payos.linkTtlMinutes() * 60_000,
    );
    const base = this.frontendBase();
    const page = `${base}/customer/orders/${encodeURIComponent(row.orderNumber)}/payment`;

    let link;
    try {
      link = await this.payos.createLink({
        orderCode,
        amount: toPayosAmount(payment.amount),
        // PayOS shows at most 25 characters of description.
        description: row.orderNumber.slice(0, 25),
        returnUrl: page,
        cancelUrl: page,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `PayOS refused the payment link of ${row.orderNumber}: ${String(error)}`,
      );
      throw new BadGatewayException(PAYOS_UNAVAILABLE);
    }

    // The condition is part of the update: of two clicks at the same moment, one saves its link.
    await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: payment.status,
        orderCode: payment.orderCode,
      },
      data: {
        status: 'PENDING',
        provider: 'PAYOS',
        orderCode: BigInt(link.orderCode),
        paymentLinkId: link.paymentLinkId,
        qrCode: link.qrCode,
        checkoutUrl: link.checkoutUrl,
        expiresAt: link.expiredAt ? new Date(link.expiredAt * 1000) : expiresAt,
        failureReason: null,
      },
    });
    return toDetail(await this.find(userId, orderNumber));
  }

  /**
   * Asks PayOS what happened to the QR the customer was given and saves it. This is how a payment
   * is updated when the webhook has not reached us (for example when testing on a local machine),
   * and how a cancelled QR is noticed. The customer never says the outcome: PayOS does.
   */
  async syncPayment(
    userId: string,
    orderNumber: string,
  ): Promise<PaymentDetailDto> {
    const row = await this.find(userId, orderNumber);
    const { payment } = row;
    if (!payment) throw new NotFoundException(PAYMENT_NOT_FOUND);
    if (
      payment.status !== 'PENDING' ||
      payment.orderCode === null ||
      !this.payos.isConfigured()
    ) {
      return toDetail(row);
    }

    let link;
    try {
      link = await this.payos.getLink(Number(payment.orderCode));
    } catch (error) {
      this.logger.error(
        `PayOS could not tell the status of ${row.orderNumber}: ${String(error)}`,
      );
      throw new BadGatewayException(PAYOS_UNAVAILABLE);
    }

    const next = paymentStatusFromPayos(link.status);
    if (next === 'PAID') {
      const reference = link.transactions[0]?.reference ?? null;
      await this.markPaid(payment.orderCode, payment.amount, link.amountPaid, reference);
    } else if (next) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: next,
          failureReason:
            next === 'CANCELLED'
              ? (link.cancellationReason ?? PAYMENT_CANCELLED_REASON)
              : next === 'EXPIRED'
                ? PAYMENT_EXPIRED_REASON
                : (link.cancellationReason ?? 'PayOS báo giao dịch thất bại.'),
        },
      });
    }
    return toDetail(await this.find(userId, orderNumber));
  }

  /**
   * PayOS says a payment was made. The signature is checked first, so only PayOS can cause this;
   * then the amount must be the whole amount. Answers normally for anything it does not know, so
   * PayOS does not keep sending it again.
   */
  async handlePayosWebhook(body: Webhook): Promise<void> {
    let data;
    try {
      data = await this.payos.verifyWebhook(body);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(`Webhook refused, bad signature or shape: ${String(error)}`);
      throw new BadRequestException(WEBHOOK_INVALID);
    }
    if (data.code !== '00') return;

    const payment = await this.prisma.payment.findUnique({
      where: { orderCode: BigInt(data.orderCode) },
      select: {
        id: true,
        status: true,
        amount: true,
        orderCode: true,
        order: { select: { orderNumber: true, status: true } },
      },
    });
    if (!payment || payment.orderCode === null) {
      this.logger.warn(`Webhook for an unknown order code ${data.orderCode}`);
      return;
    }
    if (payment.status === 'PAID') return;
    const done = await this.markPaid(
      payment.orderCode,
      payment.amount,
      data.amount,
      data.reference,
    );
    if (!done) {
      this.logger.warn(
        `Payment of order code ${data.orderCode} was not marked paid (status ${payment.status}, received ${data.amount})`,
      );
    } else if (payment.order.status === 'CANCELLED') {
      this.logger.warn(
        `Order ${payment.order.orderNumber} was already cancelled when ${data.amount} VND arrived: it needs a refund`,
      );
    }
  }

  /** PAID only for the whole amount, and only from a state money can still arrive in. */
  private async markPaid(
    orderCode: bigint,
    amount: Prisma.Decimal,
    received: number,
    reference: string | null,
  ): Promise<boolean> {
    if (Math.round(received) < toPayosAmount(amount)) return false;
    const result = await this.prisma.payment.updateMany({
      where: { orderCode, status: { in: PAYABLE_BY_WEBHOOK } },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        reference,
        failureReason: null,
      },
    });
    return result.count === 1;
  }

  /** The customer's order with its payment. A QR past its time is saved as EXPIRED on the way. */
  private async find(userId: string, orderNumber: string): Promise<OrderRow> {
    const row = await this.prisma.order.findFirst({
      where: { userId, orderNumber },
      select: orderSelect,
    });
    if (!row) throw new NotFoundException(ORDER_NOT_FOUND);
    const { payment } = row;
    const due =
      payment?.status === 'PENDING' &&
      payment.expiresAt !== null &&
      payment.expiresAt.getTime() <= Date.now();
    if (!payment || !due) return row;

    const expired = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'EXPIRED', failureReason: PAYMENT_EXPIRED_REASON },
    });
    // Someone else changed it first (for example the webhook marked it paid): show what is saved now.
    if (expired.count === 0) {
      const fresh = await this.prisma.order.findFirst({
        where: { userId, orderNumber },
        select: orderSelect,
      });
      return fresh ?? row;
    }
    return { ...row, payment: { ...payment, status: 'EXPIRED' } };
  }

  /** Where the customer site lives: the first of the allowed origins. */
  private frontendBase(): string {
    const origins = this.config.get<string>('frontendUrl', 'http://localhost:3000');
    return (origins.split(',')[0] ?? '').trim().replace(/\/+$/, '');
  }
}
