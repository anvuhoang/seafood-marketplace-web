"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fish, LayoutDashboard, LogOut, Moon, ShieldCheck, Store, Sun, Users } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useAdminTheme } from "../hooks/useAdminTheme";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Duyệt vựa", icon: Store },
  { href: "/admin/users", label: "Tài khoản", icon: Users },
];

/** Frame for every signed-in admin page: a sidebar on desktop, a top bar on mobile. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useAdminTheme();
  const dark = theme === "dark";

  const signOut = () => {
    logout();
    router.replace("/admin/login");
  };

  return (
    <div className={`${dark ? "admin-dark " : ""}min-h-screen bg-slate-50 text-slate-800 lg:flex`}>
      <aside className="admin-chrome sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-shell text-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-shell">
            <Fish className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-bold leading-tight">
            HaiSan Express
            <span className="block text-[11px] font-medium text-white/60">Quản trị</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Điều hướng quản trị">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-cyan-300 transition-all duration-200 ${
                    active ? "opacity-100" : "scale-y-0 opacity-0"
                  }`}
                  aria-hidden
                />
                <Icon className="h-4.5 w-4.5 transition-transform duration-200" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{user?.fullName ?? "Quản trị viên"}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={dark}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {dark ? "Chế độ sáng" : "Chế độ tối"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-chrome sticky top-0 z-20 bg-shell text-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.25} />
              Quản trị
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                aria-pressed={dark}
                aria-label={dark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
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
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
                    active ? "bg-white/15 text-white" : "text-white/70"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Keyed by path so each page fades in when you switch tabs. */}
        <main key={pathname} className="animate-fade-in mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
