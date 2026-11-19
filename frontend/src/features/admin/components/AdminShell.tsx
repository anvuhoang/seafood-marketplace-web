"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MapPin, Moon, Store, Sun, Tags, UserRound, Users } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminVendors } from "../api/admin-vendor.api";
import { useAdminTheme } from "../hooks/useAdminTheme";

const VENDORS_PATH = "/admin/vendors";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: VENDORS_PATH, label: "Phê duyệt vựa", icon: Store },
  { href: "/admin/users", label: "Quản lý người dùng", icon: Users },
  { href: "/admin/categories", label: "Quản lý danh mục", icon: Tags },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Frame for every signed-in admin page: a sidebar and top bar on desktop, a navy bar on mobile. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, accessToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useAdminTheme();
  const dark = theme === "dark";
  const [pendingVendors, setPendingVendors] = useState(0);

  // Refreshed on every page change, so the badge follows approvals as you move around.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminVendors(accessToken, { status: "PENDING" })
      .then((list) => !cancelled && setPendingVendors(list.counts.PENDING))
      .catch(() => undefined); // The badge is a hint; the page itself reports real errors.
    return () => {
      cancelled = true;
    };
  }, [accessToken, pathname]);

  const signOut = () => {
    logout();
    router.replace("/admin/login");
  };

  const currentLabel = NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label ?? "Tổng quan";
  const themeLabel = dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối";

  return (
    <div className={`${dark ? "admin-dark " : ""}min-h-screen bg-slate-50 text-slate-800 lg:flex`}>
      <aside className="admin-chrome sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-shell text-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <BrandLogo variant="dark" className="h-9" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Điều hướng quản trị">
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-white/55 uppercase">Quản trị sàn</p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1">{label}</span>
                {href === VENDORS_PATH && pendingVendors > 0 && (
                  <span className="rounded bg-[#C62835] px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
                    <span className="sr-only">Số vựa chờ duyệt: </span>
                    {pendingVendors}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 bg-white/8 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10" aria-hidden>
            <UserRound className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user?.fullName ?? "Quản trị viên"}</span>
            <span className="block truncate text-xs text-white/65">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden />
            Cổng quản trị
            <span aria-hidden>/</span>
            <span className="font-semibold text-slate-900">{currentLabel}</span>
          </p>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-pressed={dark}
              aria-label={themeLabel}
              title={themeLabel}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-shell text-[#fff]" aria-hidden>
              <UserRound className="h-4.5 w-4.5" />
            </span>
          </span>
        </header>

        <header className="admin-chrome sticky top-0 z-20 bg-shell text-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <BrandLogo variant="dark" className="h-7" />
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                aria-pressed={dark}
                aria-label={themeLabel}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20"
              >
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Điều hướng quản trị">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                    active ? "bg-white/15 text-white" : "text-white/70"
                  }`}
                >
                  {label}
                  {href === VENDORS_PATH && pendingVendors > 0 && (
                    <span className="rounded bg-[#C62835] px-1 text-[10px] text-white">{pendingVendors}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Page changes are cross-faded by the browser (see view-transitions.css); fading in here too would blank the content twice. */}
        <main key={pathname} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
