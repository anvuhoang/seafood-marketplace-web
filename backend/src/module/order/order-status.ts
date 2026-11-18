import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  VendorOrderStatus,
} from '@prisma/client';

/**
 * Order status rules shared by the vendor and customer sides. Pure functions
 * only, so every rule can be tested without a database.
 */

export const VENDOR_ORDER_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly VendorOrderStatus[];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];

/** Statuses a vendor can move one of its orders to. PENDING is never a target. */
export const VENDOR_ORDER_TARGETS = [
  'ACCEPTED',
  'PREPARING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly VendorOrderStatus[];
export type VendorOrderTarget = (typeof VENDOR_ORDER_TARGETS)[number];

/** One step forward at a time; cancelling only before preparation starts. */
export const VENDOR_ORDER_TRANSITIONS: Readonly<
  Record<VendorOrderStatus, readonly VendorOrderStatus[]>
> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPING'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const VENDOR_ORDER_STATUS_LABELS: Readonly<
  Record<VendorOrderStatus, string>
> = {
  PENDING: 'Chờ xác nhận',
  ACCEPTED: 'Đã nhận đơn',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

/** Slowest first: the parent order is only as far as its slowest vendor. */
const PROGRESS: readonly VendorOrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'SHIPPING',
  'COMPLETED',
];

const PARENT_STATUS_FOR: Readonly<
  Record<Exclude<VendorOrderStatus, 'CANCELLED'>, OrderStatus>
> = {
  PENDING: 'PENDING',
  ACCEPTED: 'CONFIRMED',
  PREPARING: 'PROCESSING',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
};

export function canTransition(
  from: VendorOrderStatus,
  to: VendorOrderStatus,
): boolean {
  return VENDOR_ORDER_TRANSITIONS[from].includes(to);
}

export function transitionRefusedMessage(
  from: VendorOrderStatus,
  to: VendorOrderStatus,
): string {
  if (from === 'COMPLETED' || from === 'CANCELLED') {
    return `Đơn hàng đang ở trạng thái "${VENDOR_ORDER_STATUS_LABELS[from]}" nên không thể thay đổi nữa.`;
  }
  if (to === 'CANCELLED') {
    return `Đơn hàng đang ở trạng thái "${VENDOR_ORDER_STATUS_LABELS[from]}" nên không thể hủy. Chỉ hủy được khi đơn chưa bắt đầu chuẩn bị.`;
  }
  return `Không thể chuyển đơn hàng từ "${VENDOR_ORDER_STATUS_LABELS[from]}" sang "${VENDOR_ORDER_STATUS_LABELS[to]}".`;
}

export interface PaymentState {
  method: PaymentMethod;
  status: PaymentStatus;
}

/**
 * Why a vendor cannot accept the order yet, or null when it can. Paid orders
 * can be accepted; cash on delivery can also be accepted while still unpaid.
 */
export function acceptBlockedReason(
  payment: PaymentState | null,
): string | null {
  if (!payment) return 'Đơn hàng chưa có thông tin thanh toán nên chưa thể nhận.';
  if (payment.status === 'PAID') return null;
  if (payment.status === 'PENDING') {
    return payment.method === 'COD'
      ? null
      : 'Khách hàng chưa thanh toán nên chưa thể nhận đơn.';
  }
  return payment.status === 'REFUNDED'
    ? 'Đơn hàng đã được hoàn tiền nên không thể nhận.'
    : 'Thanh toán của đơn hàng không thành công nên không thể nhận.';
}

/** The next statuses the vendor may pick now; drives the buttons on the order page. */
export function allowedVendorActions(
  status: VendorOrderStatus,
  payment: PaymentState | null,
): VendorOrderTarget[] {
  return VENDOR_ORDER_TRANSITIONS[status].filter(
    (next): next is VendorOrderTarget =>
      next !== 'ACCEPTED' || acceptBlockedReason(payment) === null,
  );
}

/**
 * The parent order's status from its vendor orders: cancelled when all are,
 * otherwise the slowest of the ones still running.
 */
export function deriveOrderStatus(
  statuses: readonly VendorOrderStatus[],
): OrderStatus {
  const live = statuses.filter((status) => status !== 'CANCELLED');
  if (live.length === 0) return 'CANCELLED';
  const slowest = live.reduce((min, status) =>
    PROGRESS.indexOf(status) < PROGRESS.indexOf(min) ? status : min,
  ) as Exclude<VendorOrderStatus, 'CANCELLED'>;
  return PARENT_STATUS_FOR[slowest];
}

/** A customer cancels the whole order, only while no vendor has accepted its part. */
export function canCustomerCancel(
  statuses: readonly VendorOrderStatus[],
): boolean {
  const live = statuses.filter((status) => status !== 'CANCELLED');
  return live.length > 0 && live.every((status) => status === 'PENDING');
}

/**
 * Payment status after the vendor orders changed, or null to leave it.
 * - Everything cancelled: PAID becomes REFUNDED (simulated), PENDING becomes FAILED.
 *   A partial cancellation keeps PAID: the schema has no partial refunds yet.
 * - Cash on delivery: PAID once every vendor order still running is COMPLETED.
 */
export function nextPaymentStatus(
  payment: PaymentState,
  statuses: readonly VendorOrderStatus[],
): PaymentStatus | null {
  const live = statuses.filter((status) => status !== 'CANCELLED');
  if (live.length === 0) {
    if (payment.status === 'PAID') return 'REFUNDED';
    if (payment.status === 'PENDING') return 'FAILED';
    return null;
  }
  if (
    payment.method === 'COD' &&
    payment.status === 'PENDING' &&
    live.every((status) => status === 'COMPLETED')
  ) {
    return 'PAID';
  }
  return null;
}
