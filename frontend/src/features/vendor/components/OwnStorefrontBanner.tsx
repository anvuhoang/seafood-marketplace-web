"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Settings } from "lucide-react";
import { useMyStoreSlug } from "../hooks/useMyStoreSlug";

/**
 * A slim bar above the shop header, shown only to the owner of the storefront
 * they are looking at: this page is what customers see, so the owner gets a
 * clear label and a way back to the console. Everyone else sees nothing.
 */
export function OwnStorefrontBanner({ slug }: { slug: string }) {
  const mySlug = useMyStoreSlug();
  if (mySlug !== slug) return null;

  return (
    <aside aria-label="Chế độ xem trước gian hàng" className="bg-shell text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />
          Bạn đang xem gian hàng của mình như khách hàng nhìn thấy.
        </p>
        <nav aria-label="Quay lại khu quản lý" className="flex flex-wrap items-center gap-2">
          <Link
            href="/vendor/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-shell transition-colors hover:bg-sky-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Quay lại quản lý
          </Link>
          <Link
            href="/vendor/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Chỉnh sửa gian hàng
          </Link>
        </nav>
      </div>
    </aside>
  );
}
