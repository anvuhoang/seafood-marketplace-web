import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma, VendorOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PayosService } from '../payment/payos.service.js';
import {
  acceptBlockedReason,
  canCustomerCancel,
  canTransition,
  deriveOrderStatus,
  nextPaymentStatus,
  transitionRefusedMessage,
  VENDOR_ORDER_STATUS_LABELS,
  type VendorOrderTarget,
} from './order-status.js';

export const VENDOR_ORDER_NOT_FOUND =
  'Không tìm thấy đơn hàng này trong gian hàng của bạn.';
export const ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng của bạn.';
export const ORDER_CHANGED_MEANWHILE =
  'Đơn hàng vừa được cập nhật ở nơi khác. Vui lòng tải lại để xem trạng thái mới nhất.';
export const ORDER_ALREADY_CANCELLED = 'Đơn hàng này đã được hủy trước đó.';
const PAYMENT_LINK_CANCEL_REASON = 'Đơn hàng đã bị hủy';

type Tx = Prisma.TransactionClient;

export interface VendorOrderChange {
  vendorOrderId: string;
  vendorId: string;
  to: VendorOrderTarget;
  /** Saved as the vendor note when given, e.g. the reason for cancelling. */
  note?: string;
}

/**
 * Every status change of a vendor order, by the vendor or the customer, goes
 * through here: the guarded status update, restocking, shipment, payment and
 * the parent order are written in one transaction.
 */
@Injectable()
export class OrderLifecycleService {
  private readonly logger = new Logger(OrderLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Optional so the order rules can be used (and tested) without PayOS.
    @Optional() private readonly payos?: PayosService,
  ) {}

  /**
   * When a cancelled order's unpaid payment is closed, close its PayOS link too, so the QR cannot be
   * paid afterwards. It runs after the order change is saved and never undoes it: if PayOS cannot be
   * reached the QR still expires by itself, and money that arrives anyway is recorded as paid.
   */
  private async closePaymentLink(orderCode: bigint | null): Promise<void> {
    if (orderCode === null || !this.payos?.isConfigured()) return;
    try {
      await this.payos.cancelLink(Number(orderCode), PAYMENT_LINK_CANCEL_REASON);
    } catch (error) {
      this.logger.warn(`Could not cancel the PayOS link ${orderCode}: ${String(error)}`);
    }
  }

  /** Move one vendor order one step. 404 when it is not this vendor's, 409 when the rules refuse it. */
  async changeVendorOrderStatus(change: VendorOrderChange): Promise<void> {
    const closedLink = await this.prisma.$transaction(async (tx) => {
      const found = await tx.vendorOrder.findFirst({
        where: { id: change.vendorOrderId, vendorId: change.vendorId },
        select: { orderId: true },
      });
      if (!found) throw new NotFoundException(VENDOR_ORDER_NOT_FOUND);
      await lockOrder(tx, found.orderId);

      // Read again under the lock, so the checks see the latest committed state.
      const current = await tx.vendorOrder.findFirstOrThrow({
        where: { id: change.vendorOrderId, vendorId: change.vendorId },
        select: {
          id: true,
          orderId: true,
          status: true,
          order: { select: { payment: { select: { method: true, status: true } } } },
        },
      });
      if (!canTransition(current.status, change.to)) {
        throw new ConflictException(
          transitionRefusedMessage(current.status, change.to),
        );
      }
      if (change.to === 'ACCEPTED') {
        const reason = acceptBlockedReason(current.order.payment);
        if (reason) throw new ConflictException(reason);
      }

      await moveVendorOrder(tx, {
        id: current.id,
        vendorId: change.vendorId,
        from: current.status,
        to: change.to,
        note: change.note,
      });
      return syncOrder(tx, current.orderId);
    });
    await this.closePaymentLink(closedLink);
  }

  /**
   * The customer cancels the whole order, only while every vendor order still
   * running is PENDING. Each one is cancelled and restocked once.
   */
  async cancelOrderByCustomer(userId: string, orderNumber: string): Promise<void> {
    const closedLink = await this.prisma.$transaction(async (tx) => {
      const found = await tx.order.findFirst({
        where: { orderNumber, userId },
        select: { id: true },
      });
      if (!found) throw new NotFoundException(ORDER_NOT_FOUND);
      await lockOrder(tx, found.id);

      const vendorOrders = await tx.vendorOrder.findMany({
        where: { orderId: found.id },
        select: {
          id: true,
          vendorId: true,
          status: true,
          vendor: { select: { name: true } },
        },
      });
      const statuses = vendorOrders.map((row) => row.status);
      if (!canCustomerCancel(statuses)) {
        const started = vendorOrders.find(
          (row) => row.status !== 'PENDING' && row.status !== 'CANCELLED',
        );
        throw new ConflictException(
          started
            ? `Không thể hủy đơn vì ${started.vendor.name} đã ở trạng thái "${VENDOR_ORDER_STATUS_LABELS[started.status]}".`
            : ORDER_ALREADY_CANCELLED,
        );
      }

      for (const row of vendorOrders) {
        if (row.status === 'CANCELLED') continue;
        await moveVendorOrder(tx, {
          id: row.id,
          vendorId: row.vendorId,
          from: row.status,
          to: 'CANCELLED',
        });
      }
      return syncOrder(tx, found.id);
    });
    await this.closePaymentLink(closedLink);
  }
}

/**
 * Serialises changes to one order: two vendors (or a vendor and the customer)
 * acting at once would otherwise each compute the parent status from stale rows.
 */
async function lockOrder(tx: Tx, orderId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
}

/** The status update is conditional on the old status, so a double click changes (and restocks) once. */
async function moveVendorOrder(
  tx: Tx,
  move: {
    id: string;
    vendorId: string;
    from: VendorOrderStatus;
    to: VendorOrderStatus;
    note?: string;
  },
): Promise<void> {
  const { count } = await tx.vendorOrder.updateMany({
    where: { id: move.id, vendorId: move.vendorId, status: move.from },
    data: {
      status: move.to,
      ...(move.note !== undefined && { vendorNote: move.note }),
    },
  });
  if (count === 0) throw new ConflictException(ORDER_CHANGED_MEANWHILE);

  const now = new Date();
  if (move.to === 'SHIPPING' || move.to === 'COMPLETED') {
    const stamp =
      move.to === 'SHIPPING' ? { shippedAt: now } : { deliveredAt: now };
    await tx.shipment.upsert({
      where: { vendorOrderId: move.id },
      create: { vendorOrderId: move.id, status: move.to, ...stamp },
      update: { status: move.to, ...stamp },
    });
  } else {
    await tx.shipment.updateMany({
      where: { vendorOrderId: move.id },
      data: { status: move.to },
    });
  }

  if (move.to === 'CANCELLED') {
    // Back to the vendor's stock, whatever the offer's status is now.
    const items = await tx.orderItem.findMany({
      where: { vendorOrderId: move.id },
      select: { offerId: true, quantity: true },
    });
    for (const item of items) {
      await tx.vendorOffer.update({
        where: { id: item.offerId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
}

/**
 * Recompute the parent order's status and, when the rules say so, its payment. Returns the PayOS order
 * code of an unpaid payment that was just closed because the order was cancelled, so its link can be closed.
 */
async function syncOrder(tx: Tx, orderId: string): Promise<bigint | null> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      status: true,
      vendorOrders: { select: { status: true } },
      payment: { select: { method: true, status: true, orderCode: true } },
    },
  });
  const statuses = order.vendorOrders.map((row) => row.status);

  const status = deriveOrderStatus(statuses);
  if (status !== order.status) {
    await tx.order.update({ where: { id: orderId }, data: { status } });
  }

  if (!order.payment) return null;
  const paymentStatus = nextPaymentStatus(order.payment, statuses);
  if (!paymentStatus) return null;
  const { status: before, orderCode } = order.payment;
  const { count } = await tx.payment.updateMany({
    where: { orderId, status: before },
    data: {
      status: paymentStatus,
      ...(paymentStatus === 'PAID' && { paidAt: new Date() }),
    },
  });
  const closedUnpaid = count === 1 && before === 'PENDING' && paymentStatus === 'FAILED';
  return closedUnpaid ? (orderCode ?? null) : null;
}
