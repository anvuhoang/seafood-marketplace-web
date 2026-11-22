import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";
import { formatPrice } from "@/lib/utils";
import type { CheckoutVendor } from "../types/checkout.types";

const QUANTITY = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });

/** Step 2: the goods of each vendor with that vendor's shipping fee. Everything shown comes from the server. */
export function VendorReview({ vendors }: { vendors: CheckoutVendor[] }) {
  return (
    <section aria-labelledby="review-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div>
        <h2 id="review-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F3860] text-[11px] text-white">2</span>
          Kiểm tra hàng hóa theo từng vựa
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Mỗi vựa xử lý và giao phần hàng của mình ({vendors.length} vựa trong đơn này).
        </p>
      </div>

      {vendors.map(({ vendor, items, subtotal, shippingFee, total }) => (
        <div key={vendor.id} className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <Store className="h-4 w-4 shrink-0 text-[#0F3860]" aria-hidden />
            <Link href={`/vendor/${vendor.slug}`} className="truncate text-sm font-bold text-slate-900 hover:underline">
              {vendor.name}
            </Link>
            <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3" aria-hidden />
              {vendor.district}, {vendor.province}
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.offerId} className="flex items-center gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl ?? FALLBACK_PRODUCT_IMAGE} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-bold text-slate-900">{item.productName}</p>
                  <p className="text-[11px] text-slate-500">{[item.variantName, item.sizeLabel].filter(Boolean).join(" · ")}</p>
                  {item.problem && <p className="mt-1 text-[11px] font-semibold text-rose-600">{item.problem}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-900">{item.available ? formatPrice(item.subtotal) : "Không mua được"}</p>
                  <p className="text-[11px] text-slate-500">
                    {QUANTITY.format(item.quantity)} {item.unit} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <dt>Tạm tính vựa này</dt>
              <dd className="font-semibold text-slate-800">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Phí vận chuyển</dt>
              <dd className="font-semibold text-slate-800">{formatPrice(shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-sm">
              <dt className="font-bold text-slate-900">Tổng vựa này</dt>
              <dd className="font-bold text-slate-900">{formatPrice(total)}</dd>
            </div>
          </dl>
        </div>
      ))}
    </section>
  );
}
