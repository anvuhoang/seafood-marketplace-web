import Link from "next/link";
import { VendorDetail } from "../types/product.types";
import { Anchor, MapPin, ShieldCheck, Star, Store } from "lucide-react";

interface SellerStoreCardProps {
  vendor: VendorDetail;
}

export function SellerStoreCard({ vendor }: SellerStoreCardProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Left: Vendor Profile */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0F3860] text-white shadow-sm">
          {vendor.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-cover" />
          ) : (
            <Anchor className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{vendor.name}</h3>
            {vendor.verified && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Đối tác đã duyệt
              </span>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{vendor.address}</span>
          </p>
        </div>
      </div>

      {/* Middle: Vendor rating */}
      <div className="flex items-center gap-2 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0 md:px-6 w-full md:w-auto justify-center">
        {vendor.ratingCount > 0 ? (
          <>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <div>
              <div className="text-base font-black text-[#0F3860]">
                {vendor.ratingAverage.toFixed(1)} / 5.0
              </div>
              <div className="text-[11px] text-slate-400">{vendor.ratingCount} đánh giá vựa</div>
            </div>
          </>
        ) : (
          <span className="text-xs text-slate-400">Vựa chưa có đánh giá</span>
        )}
      </div>

      {/* Right: Vendor storefront */}
      <Link
        href={`/vendor/${vendor.slug}`}
        className="w-full md:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-[#0F3860] px-4 py-2.5 text-xs font-bold text-[#0F3860] transition hover:bg-sky-50 active:scale-95"
      >
        <Store className="h-3.5 w-3.5" />
        <span>Xem Gian Hàng</span>
      </Link>
    </div>
  );
}
