import Link from "next/link";
import { ImageIcon, Star, Store } from "lucide-react";
import { VENDOR_ORDER_STATUS } from "../constants/order-status";
import type { CustomerVendorOrder } from "../types/order.types";
import { formatDateTime, formatQuantity, formatVnd } from "../utils/order-format";
import { StatusBadge } from "./StatusBadge";

/** The part of an order that one vendor prepares: its status, the products with quantities, and its own total. */
export function OrderVendorCard({ part, showReview = false }: { part: CustomerVendorOrder; showReview?: boolean }) {
  const delivered = part.status === "COMPLETED";
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-xs sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#EAF2FB] px-3 py-2.5">
        <h3 className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F3860] text-white">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <Link href={`/vendor/${part.vendor.slug}`} className="block text-base leading-tight font-bold break-words text-slate-900 hover:underline">
              {part.vendor.name}
            </Link>
            <span className="text-xs text-slate-500">{part.items.length} sản phẩm</span>
          </span>
        </h3>
        <StatusBadge style={VENDOR_ORDER_STATUS[part.status]} />
      </div>

      {(part.shipment?.shippedAt || part.shipment?.deliveredAt) && (
        <p className="mt-3 text-xs text-slate-500">
          {part.shipment.shippedAt && <>Bàn giao vận chuyển: {formatDateTime(part.shipment.shippedAt)}</>}
          {part.shipment.shippedAt && part.shipment.deliveredAt && " · "}
          {part.shipment.deliveredAt && <>Đã giao: {formatDateTime(part.shipment.deliveredAt)}</>}
        </p>
      )}
      {part.vendorNote && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm break-words text-slate-700">
          <span className="font-semibold">{part.status === "CANCELLED" ? "Lý do từ vựa:" : "Ghi chú từ vựa:"}</span> {part.vendorNote}
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {part.items.map((item) => (
          <li key={item.id} className="flex gap-3 py-3.5 sm:gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-20 sm:w-20">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-300">
                  <ImageIcon className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <span className="inline-block rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold break-words text-[#0F3860]">{item.variantName}</span>
                <Link href={`/products/${item.productSlug}`} className="mt-1 block text-base leading-snug font-bold break-words text-slate-900 hover:underline">
                  {item.productName}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatVnd(item.unitPrice)}/{item.unit}
                </p>
                {showReview &&
                  delivered &&
                  (item.reviewed ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">Đã đánh giá</p>
                  ) : (
                    <Link href="/customer/reviews" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0F3860] hover:underline">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      Viết đánh giá
                    </Link>
                  ))}
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-base font-bold tabular-nums text-[#E63946]">{formatVnd(item.lineTotal)}</p>
                <p className="text-xs text-slate-500">
                  SL: <span className="font-semibold tabular-nums text-slate-700">{formatQuantity(item.quantity)} {item.unit}</span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-[#EAF2FB] px-3 py-2.5 text-sm">
        <span className="text-slate-600">
          Phí vận chuyển: <span className="font-semibold tabular-nums text-slate-900">{formatVnd(part.shippingFee)}</span>
        </span>
        <span className="font-bold text-slate-900">
          Tạm tính: <span className="tabular-nums">{formatVnd(part.grandTotal)}</span>
        </span>
      </div>
    </section>
  );
}
