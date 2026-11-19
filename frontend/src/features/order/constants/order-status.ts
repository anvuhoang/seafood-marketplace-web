import type { OrderPayment, OrderStatus, PaymentMethod, PaymentStatus, VendorOrderStatus } from "../types/order.types";

/** The one table of Vietnamese order labels, used by the customer pages, the vendor console and its dashboard. */
export interface StatusStyle {
  label: string;
  className: string;
}

export const VENDOR_ORDER_STATUS: Record<VendorOrderStatus, StatusStyle> = {
  PENDING: { label: "Chờ xác nhận", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  ACCEPTED: { label: "Đã nhận đơn", className: "bg-sky-50 text-sky-800 ring-sky-200" },
  PREPARING: { label: "Đang chuẩn bị", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  SHIPPING: { label: "Đang giao", className: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  COMPLETED: { label: "Đã giao", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-100 text-slate-700 ring-slate-300" },
};

/** The customer's order as a whole; CONFIRMED and PROCESSING match ACCEPTED and PREPARING above. */
export const ORDER_STATUS: Record<OrderStatus, StatusStyle> = {
  PENDING: VENDOR_ORDER_STATUS.PENDING,
  CONFIRMED: { label: "Đã xác nhận", className: VENDOR_ORDER_STATUS.ACCEPTED.className },
  PROCESSING: VENDOR_ORDER_STATUS.PREPARING,
  SHIPPING: VENDOR_ORDER_STATUS.SHIPPING,
  COMPLETED: VENDOR_ORDER_STATUS.COMPLETED,
  CANCELLED: VENDOR_ORDER_STATUS.CANCELLED,
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusStyle> = {
  PENDING: { label: "Chưa thanh toán", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  PAID: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  FAILED: { label: "Thanh toán thất bại", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  REFUNDED: { label: "Đã hoàn tiền", className: "bg-slate-100 text-slate-700 ring-slate-300" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng",
  BANK_TRANSFER: "Chuyển khoản",
  E_WALLET: "Ví điện tử",
  CARD: "Thẻ",
};

/** Cash on delivery not collected yet reads better as "collect on delivery" than "unpaid". */
export function paymentStyle(payment: OrderPayment | null): StatusStyle {
  if (!payment) return { label: "Chưa có thanh toán", className: "bg-slate-100 text-slate-700 ring-slate-300" };
  if (payment.method === "COD" && payment.status === "PENDING") {
    return { label: "Thu khi giao", className: "bg-amber-50 text-amber-800 ring-amber-200" };
  }
  return PAYMENT_STATUS[payment.status];
}

/** Order of progress, for timelines. */
export const VENDOR_ORDER_STEPS: VendorOrderStatus[] = ["PENDING", "ACCEPTED", "PREPARING", "SHIPPING", "COMPLETED"];
