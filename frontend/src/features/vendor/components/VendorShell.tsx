"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartLine,
  ExternalLink,
  Headset,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useAuth } from "@/features/auth/context/AuthContext";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";
import { cn } from "@/lib/utils";
import { STORE_STATUS_BADGES } from "../constants/store-status";
import { VendorDashboardProvider, useVendorDashboard } from "../context/VendorDashboardContext";
import { useMyStore } from "../hooks/useMyStore";

const ORDERS_PATH = "/vendor/orders";

const NAV_ITEMS = [
  { href: "/vendor/dashboard", label: "Tổng quan", icon: LayoutGrid },
  { href: "/vendor/products", label: "Sản phẩm", icon: Package },
  { href: ORDERS_PATH, label: "Đơn hàng", icon: ShoppingBag },
  { href: "/vendor/statistics", label: "Thống kê và doanh thu", icon: ChartLine },
  { href: "/vendor/settings", label: "Cài đặt cửa hàng", icon: Store },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Frame for every vendor console page: navy sidebar, store top bar and a short footer. */
export function VendorShell({ children }: { children: React.ReactNode }) {
  return (
    <VendorDashboardProvider>
      <VendorShellFrame>{children}</VendorShellFrame>
    </VendorDashboardProvider>
  );
}

function VendorShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  // Opening another page closes the mobile menu.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const signOut = () => {
    logout();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand text-white lg:flex">
        <Brand />
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Điều hướng kênh vựa">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="space-y-3 px-3 pb-5">
          <SupportBox />
          <SignOutButton onClick={signOut} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="vendor-mobile-menu"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            >
              {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <StoreBar />
          </div>

          {menuOpen && (
            <div id="vendor-mobile-menu" className="animate-fade-in space-y-3 bg-brand px-3 py-4 text-white lg:hidden">
              <nav aria-label="Điều hướng kênh vựa">
                <NavLinks pathname={pathname} />
              </nav>
              <SupportBox />
              <SignOutButton onClick={signOut} />
            </div>
          )}
        </header>

        <main key={pathname} className="animate-fade-in mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-700">HaiSan Express · Kênh vựa</p>
            <p>
              Đường dây nóng:{" "}
              <a href={`tel:${SUPPORT_HOTLINE.tel}`} className="font-semibold text-slate-700 hover:underline">
                {SUPPORT_HOTLINE.display}
              </a>
            </p>
            <p>© 2026 HaiSan Express</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="border-b border-white/10 px-5 py-5">
      <BrandLogo variant="dark" className="h-10" />
      <span className="mt-2 block text-xs text-white/65">Đối tác vựa hải sản</span>
    </div>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  const dashboard = useVendorDashboard();
  // Only a number the API actually returned is shown.
  const pendingOrders = dashboard.kind === "ready" ? dashboard.dashboard.summary.ordersNeedingActionCount : 0;

  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white text-brand" : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              {href === ORDERS_PATH && pendingOrders > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
                  <span className="sr-only">Đơn cần xử lý: </span>
                  {pendingOrders}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SupportBox() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-xs">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Headset className="h-4 w-4 shrink-0" aria-hidden />
        Hỗ trợ đối tác vựa
      </p>
      <p className="mt-1 text-white/70">
        Tổng đài:{" "}
        <a href={`tel:${SUPPORT_HOTLINE.tel}`} className="font-semibold text-white hover:underline">
          {SUPPORT_HOTLINE.display}
        </a>
      </p>
    </div>
  );
}

function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-4.5 w-4.5" aria-hidden />
      Đăng xuất
    </button>
  );
}

/** Store name, area and status from GET /vendors/me/store, plus the signed-in user. */
function StoreBar() {
  const { user } = useAuth();
  const { state } = useMyStore();
  const store = state.kind === "ready" ? state.store : null;
  const badge = store ? STORE_STATUS_BADGES[store.status] : null;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {store?.name ??
              (state.kind === "no-store" ? "Chưa có gian hàng" : state.kind === "loading" ? "Đang tải gian hàng..." : "Kênh vựa")}
          </p>
          {store && (
            <p className="truncate text-xs text-slate-500">
              {store.district}, {store.province}
            </p>
          )}
        </div>
        {badge && (
          <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset sm:inline", badge.className)}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {store && (
          <Link
            href={`/vendor/${encodeURIComponent(store.slug)}`}
            // The public page opens beside the console, so the vendor never loses their place.
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Xem gian hàng
            <span className="sr-only"> (mở trong tab mới)</span>
          </Link>
        )}
        <span className="hidden h-8 w-px bg-slate-200 md:block" aria-hidden />
        <span className="hidden min-w-0 text-right md:block">
          <span className="block max-w-48 truncate text-sm font-semibold text-slate-900">{user?.fullName}</span>
          <span className="block max-w-48 truncate text-xs text-slate-500">{user?.email}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-white" aria-hidden>
          {store?.logoUrl ? (
            // Store logo from Cloudinary or seed data; next/image is not set up for remote hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4.5 w-4.5" />
          )}
        </span>
      </div>
      {badge && (
        <span className="w-full text-xs sm:hidden">
          <span className={cn("rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset", badge.className)}>{badge.label}</span>
        </span>
      )}
    </div>
  );
}
