"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anchor, Loader2, MapPin, Store } from "lucide-react";
import { AccountPageHeader, AccountShell } from "@/features/account/components/AccountShell";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getFollowedVendors } from "@/features/vendor/api/vendor.api";
import { VendorSummary } from "@/features/vendor/types/vendor.types";

export default function FollowedVendorsPage() {
  return (
    <AccountShell>
      <FollowedVendors />
    </AccountShell>
  );
}

function FollowedVendors() {
  const { accessToken } = useAuth();
  const [vendors, setVendors] = useState<VendorSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getFollowedVendors(accessToken)
      .then((list) => {
        if (!cancelled) setVendors(list);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <>
      <AccountPageHeader
        eyebrow="Vựa hải sản"
        title="Vựa đang theo dõi"
        description="Theo dõi để xem nhanh các vựa bạn yêu thích và cập nhật hàng mới của họ."
      />

      {loadError ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600">
          Không tải được danh sách. Vui lòng thử lại sau.
        </p>
      ) : vendors === null ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
          <Store className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-800">Bạn chưa theo dõi vựa nào</p>
          <p className="mt-1 text-sm text-slate-500">Mở một gian hàng và bấm Theo dõi để lưu lại tại đây.</p>
          <Link href="/#trusted-vendors" className="mt-4 inline-block text-sm font-semibold text-[#0F3860] hover:underline">
            Xem các vựa đối tác
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {vendors.map((vendor) => (
            <li key={vendor.id}>
              <Link href={`/vendor/${vendor.slug}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50 sm:p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {vendor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={vendor.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Anchor className="h-5 w-5 text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{vendor.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {vendor.location}
                  </span>
                </span>
                <span className="hidden text-sm text-slate-500 sm:block">{vendor.productCount} sản phẩm</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
