import { Injectable, Logger } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from './mail.service.js';
import { orderNoticeMail, orderPlacedMail, paymentReceivedMail, type OrderMailData, type OrderNoticeKind } from './mail.templates.js';

const NOTICE_FOR: Partial<Record<OrderStatus, OrderNoticeKind>> = {
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * The mails about an order: placed, paid, on its way, delivered, cancelled. Every method is best effort: a mail
 * that cannot be built or sent is logged and never turns a finished order into an error.
 */
@Injectable()
export class OrderMailer {
  private readonly logger = new Logger(OrderMailer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private async customer(userId: string): Promise<{ email: string; fullName: string } | null> {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
  }

  private async guard(what: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.warn(`Could not send the ${what} mail: ${String(error)}`);
    }
  }

  /** "Thank you, we have your order." Called once, when the order is first created. */
  async orderPlaced(userId: string, order: OrderMailData): Promise<void> {
    await this.guard('order confirmation', async () => {
      const user = await this.customer(userId);
      if (!user) return;
      await this.mail.send(orderPlacedMail({ to: user.email, name: user.fullName, order, appUrl: this.mail.appUrl }));
    });
  }

  /** "We received your payment." Found by the PayOS order code the payment was made with. */
  async paymentReceived(orderCode: bigint): Promise<void> {
    await this.guard('payment', async () => {
      const payment = await this.prisma.payment.findUnique({
        where: { orderCode },
        select: { amount: true, paidAt: true, order: { select: { orderNumber: true, user: { select: { email: true, fullName: true } } } } },
      });
      if (!payment?.order.user) return;
      const { user, orderNumber } = payment.order;
      await this.mail.send(
        paymentReceivedMail({
          to: user.email,
          name: user.fullName,
          orderNumber,
          amount: payment.amount.toString(),
          paidAt: payment.paidAt ?? new Date(),
          appUrl: this.mail.appUrl,
        }),
      );
    });
  }

  /** On its way, delivered or cancelled. Other changes (a vendor accepting) are not worth a mail. */
  async statusChanged(orderId: string, from: OrderStatus, to: OrderStatus): Promise<void> {
    const kind = NOTICE_FOR[to];
    if (!kind || from === to) return;
    await this.guard(`${to} notice`, async () => {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, user: { select: { email: true, fullName: true } } },
      });
      if (!order?.user) return;
      await this.mail.send(orderNoticeMail({ to: order.user.email, name: order.user.fullName, orderNumber: order.orderNumber, kind, appUrl: this.mail.appUrl }));
    });
  }
}
