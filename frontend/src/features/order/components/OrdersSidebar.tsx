"use client";

import Link from "next/link";
import { ClipboardList, Heart, MapPin, Phone, Settings, Star, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/customer/addresses", label: "Sổ địa chỉ nhận hàng", icon: MapPin },
  { href: "/customer/followed-vendors", label: "Vựa đã theo dõi", icon: Heart },
  { href: "/customer/reviews", label: "Đánh giá của tôi", icon: Star },
  { href: "/customer/profile", label: "Cài đặt tài khoản", icon: Settings },
];

/** The customer's account menu next to the order history, with the hotline underneath. */
export function OrdersSidebar({ orderCount }: { orderCount: number | null }) {
  const { user } = useAuth();
  const name = user?.fullName ?? user?.name ?? "Khách hàng";

  return (
    <aside className="hidden min-w-0 space-y-4 lg:block" aria-label="Tài khoản">
      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF2FB] text-[#0F3860]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <nav className="mt-4 space-y-1 text-sm" aria-label="Menu tài khoản">
          <Link
            href="/customer/orders"
            aria-current="page"
            className="flex items-center gap-2.5 rounded-lg bg-[#EAF2FB] px-3 py-2.5 font-bold text-[#0F3860]"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Tất cả đơn hàng</span>
            {orderCount !== null && <span className="rounded-full bg-[#0F3860] px-2 py-0.5 text-[11px] font-bold text-white">{orderCount}</span>}
          </Link>
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0F3860]")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="rounded-2xl bg-[#0F3860] p-5 text-white">
        <span className="inline-block rounded bg-[#E63946] px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">Hỗ trợ</span>
        <p className="mt-3 text-base leading-snug font-bold">Cần kiểm tra hay đổi đơn hàng?</p>
        <p className="mt-1 text-xs text-sky-100">Gọi tổng đài để được hỗ trợ nhanh nhất.</p>
        <a
          href={`tel:${SUPPORT_HOTLINE.tel}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Hotline: {SUPPORT_HOTLINE.display}
        </a>
      </section>
    </aside>
  );
}
