"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KeyRound, LogOut, MapPin, ReceiptText, SquarePen, UserCog, UserRound } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { useAuth } from "@/features/auth/context/AuthContext";

const NAV_ITEMS = [
  { href: "/customer/profile", label: "Thông tin tài khoản", icon: UserCog },
  { href: "/customer/addresses", label: "Sổ địa chỉ nhận hàng", icon: MapPin },
  { href: "/customer/orders", label: "Lịch sử & Đơn hàng", icon: ReceiptText },
  { href: "/customer/reviews", label: "Đánh giá sản phẩm", icon: SquarePen },
  { href: "/customer/password", label: "Đổi mật khẩu", icon: KeyRound },
];

const ROLE_TEXT: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  VENDOR: "Chủ vựa",
  ADMIN: "Quản trị viên",
};

/** "0912345678" -> "0912***678". */
export function maskPhone(phone?: string | null): string | null {
  if (!phone || phone.length < 7) return phone ?? null;
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

/** Signed-in account area: header, account sidebar and the page content. */
export function AccountShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/60 flex flex-col">
        <CustomerHeader />

        <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 lg:self-start">
            <div className="flex items-center gap-3 p-1">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F3860] text-white">
                <UserRound className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500">
                  {ROLE_TEXT[user?.role ?? ""] ?? "Thành viên"}
                  {user?.phone ? ` • ${maskPhone(user.phone)}` : ""}
                </p>
              </div>
            </div>

            <p className="mt-5 px-3 text-xs font-medium text-slate-400">Tài khoản của tôi</p>
            <nav aria-label="Tài khoản" className="mt-2 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active ? "bg-slate-100 font-semibold text-[#0F3860]" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 flex items-center gap-3 border-t border-slate-100 px-3 pt-4 text-sm font-bold text-[#E63946] hover:text-[#D62839]"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </aside>

          <main className="min-w-0 space-y-6">{children}</main>
        </div>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

/** "SỔ ĐỊA CHỈ" -> "Sổ địa chỉ"; pages pass their eyebrow in capitals. */
function toSentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase("vi-VN");
  return lower.charAt(0).toLocaleUpperCase("vi-VN") + lower.slice(1);
}

/** Title block at the top of each account page. */
export function AccountPageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-sky-700">{toSentenceCase(eyebrow)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      {aside}
    </section>
  );
}
