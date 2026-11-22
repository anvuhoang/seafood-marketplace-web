import type { CustomerOrderSummaryDto } from '../../order/dto/customer-order.dto.js';
import type { ChatCard } from '../chat.types.js';

type Order = CustomerOrderSummaryDto;

/** Same words as the customer pages (frontend order-status.ts), so the chat and the screens never disagree. */
export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const VENDOR_ORDER_STATUS_LABEL: Record<Order['vendorOrders'][number]['status'], string> = {
  PENDING: 'Chờ xác nhận',
  ACCEPTED: 'Đã nhận đơn',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

const PAYMENT_METHOD_LABEL = {
  COD: 'Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản QR',
  E_WALLET: 'Ví điện tử',
  CARD: 'Thẻ',
} as const;

const PAYMENT_STATUS_LABEL = {
  PENDING: 'chưa thanh toán',
  PAID: 'đã thanh toán',
  FAILED: 'thanh toán thất bại',
  REFUNDED: 'đã hoàn tiền',
  CANCELLED: 'đã hủy thanh toán',
  EXPIRED: 'mã QR hết hạn',
} as const;

/** "Chuyển khoản QR · đã thanh toán", or null when the order has no payment. */
export function paymentLabel(order: Order): string | null {
  const { payment } = order;
  if (!payment) return null;
  const status =
    payment.method === 'COD' && payment.status === 'PENDING' ? 'thu khi giao' : PAYMENT_STATUS_LABEL[payment.status];
  return `${PAYMENT_METHOD_LABEL[payment.method]} · ${status}`;
}

function itemNames(order: Order): string[] {
  return order.vendorOrders.flatMap((part) =>
    part.items.map((item) => `${item.productName} x${Number(item.quantity)} ${item.unit}`),
  );
}

/** The order as the model needs it to answer: facts only, in words a customer would use. */
export function orderForModel(order: Order): Record<string, unknown> {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    grandTotal: Number(order.grandTotal),
    payment: paymentLabel(order),
    canCancel: order.canCancel,
    parts: order.vendorOrders.map((part) => ({
      vendor: part.vendor.name,
      status: VENDOR_ORDER_STATUS_LABEL[part.status],
      carrier: part.shipment?.carrier ?? null,
      trackingNumber: part.shipment?.trackingNumber ?? null,
      items: part.items.map((item) => `${item.productName} x${Number(item.quantity)} ${item.unit}`),
    })),
  };
}

export function orderCard(order: Order): ChatCard {
  return {
    type: 'order',
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    paymentLabel: paymentLabel(order),
    grandTotal: order.grandTotal,
    createdAt: order.createdAt,
    items: itemNames(order).slice(0, 4),
  };
}

export { itemNames };
