import Link from "next/link";
import { CreditCard, ImageIcon, Loader2, RotateCcw, Star, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS, PAYMENT_METHOD, VENDOR_ORDER_STATUS, paymentStyle, qrPaymentAction } from "../constants/order-status";
import type { CustomerOrderSummary } from "../types/order.types";
import { formatDateTime, formatQuantity, formatVnd } from "../utils/order-format";
import { productCount } from "../utils/order-progress";
import { StatusBadge } from "./StatusBadge";

const outline = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50";
const dark = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F3860] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0A2744]";
const red = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#E63946] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#C62835] disabled:cursor-not-allowed disabled:opacity-60";

interface OrderHistoryCardProps {
  order: CustomerOrderSummary;
  /** True while this very order is being put into the cart again. */
  reordering: boolean;
  /** Another order is being bought again, so this button waits. */
  reorderDisabled: boolean;
  onReorder: (orderNumber: string) => void;
}

/** One order in the history: its products grouped by vendor, both statuses, the total, and what to do next. */
export function OrderHistoryCard({ order, reordering, reorderDisabled, onReorder }: OrderHistoryCardProps) {
  const href = `/customer/orders/${encodeURIComponent(order.orderNumber)}`;
  const multiple = order.vendorOrders.length > 1;
  const count = productCount(order);
  const payAction = qrPaymentAction(order);
  const hasUnreviewed = order.status === "COMPLETED" && order.vendorOrders.some((part) => part.items.some((item) => !item.reviewed));
  const cancelled = order.status === "CANCELLED";
  const inProgress = !cancelled && order.status !== "COMPLETED";

  const reorderButton = (label: string) => (
    <button type="button" onClick={() => onReorder(order.orderNumber)} disabled={reorderDisabled || reordering} className={red}>
      {reordering ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#EAF2FB] px-4 py-3 text-xs sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={href} className="font-mono text-sm font-bold break-all text-slate-900 hover:underline">
            #{order.orderNumber}
          </Link>
          <span className="text-slate-300" aria-hidden="true">
            •
          </span>
          <span className="text-slate-600">
            Ngày đặt: <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
          </span>
          <span className="text-slate-300" aria-hidden="true">
            •
          </span>
          <span className="flex min-w-0 items-center gap-1 font-semibold text-slate-700">
            <Store className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="break-words">{order.vendorOrders.map((part) => part.vendor.name).join(", ")}</span>
          </span>
        </div>
        <StatusBadge style={ORDER_STATUS[order.status]} />
      </div>

      <div className="divide-y divide-slate-100 px-4 sm:px-5">
        {order.vendorOrders.map((part) => (
          <div key={part.id} className="py-3">
            {multiple && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Store className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="break-words">{part.vendor.name}</span>
                </p>
                <StatusBadge style={VENDOR_ORDER_STATUS[part.status]} />
              </div>
            )}
            <ul className="space-y-3">
              {part.items.map((item) => (
                <li key={item.id} className="flex gap-3 sm:gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className={cn("h-full w-full object-cover", cancelled && "grayscale")} loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold break-words text-[#0F3860]">{item.variantName}</span>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className={cn("mt-0.5 block text-sm font-bold break-words text-slate-900 hover:underline sm:text-base", cancelled && "text-slate-500 line-through")}
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Số lượng: <strong className="text-slate-700">{formatQuantity(item.quantity)} {item.unit}</strong>
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 sm:text-base">{formatVnd(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#EAF2FB] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-600">
          <StatusBadge style={paymentStyle(order.payment)} />
          {order.payment && <span>{PAYMENT_METHOD[order.payment.method]}</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
          <p className="text-right text-xs text-slate-500">
            Tổng thanh toán ({count} sản phẩm)
            <span className={cn("block text-xl font-bold tabular-nums", cancelled ? "text-slate-400" : "text-[#E63946]")}>{formatVnd(order.grandTotal)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href} className={outline}>
              {cancelled ? "Xem chi tiết" : "Chi tiết đơn"}
            </Link>
            {payAction && (
              <Link href={`${href}/payment`} className={dark}>
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                {payAction}
              </Link>
            )}
            {inProgress && !payAction && (
              <Link href={href} className={dark}>
                Theo dõi đơn hàng
              </Link>
            )}
            {hasUnreviewed && (
              <Link href="/customer/reviews" className={outline}>
                <Star className="h-4 w-4" aria-hidden="true" />
                Đánh giá hải sản
              </Link>
            )}
            {order.status === "COMPLETED" && reorderButton("Mua lại đơn này")}
            {cancelled && reorderButton("Đặt lại món này")}
          </div>
        </div>
      </div>
    </article>
  );
}
