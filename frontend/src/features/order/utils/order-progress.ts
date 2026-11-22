import type { CustomerOrderDetail, OrderStatus } from "../types/order.types";

export interface ProgressStep {
  label: string;
  state: "done" | "current" | "upcoming";
  /** When it happened, only for the steps the order really has a time for. */
  time: string | null;
}

/**
 * The steps of an order, from what the vendors do with it. Delivery itself is run by another system,
 * so the order only knows when it was handed over for shipping and when it was delivered.
 */
const STEP_LABELS = ["Đã đặt hàng", "Vựa xác nhận", "Đang chuẩn bị", "Bàn giao vận chuyển", "Đã giao"];

/** The step in progress for each order status; the number of steps means everything is done. */
const CURRENT_STEP: Record<Exclude<OrderStatus, "CANCELLED">, number> = {
  PENDING: 1,
  CONFIRMED: 2,
  PROCESSING: 2,
  SHIPPING: 3,
  COMPLETED: STEP_LABELS.length,
};

const pick = (times: Array<string | null | undefined>, latest: boolean): string | null => {
  const known = times.filter((time): time is string => Boolean(time)).sort();
  return (latest ? known[known.length - 1] : known[0]) ?? null;
};

/** The progress of an order, or null for a cancelled one (it has no progress to show). */
export function orderProgress(
  order: Pick<CustomerOrderDetail, "status" | "createdAt" | "vendorOrders">,
  stepCount: number = STEP_LABELS.length,
): ProgressStep[] | null {
  if (order.status === "CANCELLED") return null;
  const current = CURRENT_STEP[order.status];
  const handedOver = pick(order.vendorOrders.map((part) => part.shipment?.shippedAt), false);
  const delivered = pick(order.vendorOrders.map((part) => part.shipment?.deliveredAt), true);
  const times = [order.createdAt, null, null, handedOver, delivered];

  return STEP_LABELS.slice(0, stepCount).map((label, index) => {
    const state = index < current ? "done" : index === current ? "current" : "upcoming";
    return { label, state, time: state === "upcoming" ? null : times[index] };
  });
}

/** The number of products in an order (every line counts once, whatever its quantity). */
export function productCount(order: Pick<CustomerOrderDetail, "vendorOrders">): number {
  return order.vendorOrders.reduce((total, part) => total + part.items.length, 0);
}
