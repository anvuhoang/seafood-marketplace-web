"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, useRef, useEffect } from "react";
import {
  Search,
  Camera,
  Heart,
  ShoppingCart,
  User,
  Phone,
  Store,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ShieldCheck,
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart/context/CartContext";
import { useMyStoreSlug } from "@/features/vendor/hooks/useMyStoreSlug";
import { formatPrice } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";

const NAV_LINKS = [
  { name: "Trang chủ", href: "/" },
  { name: "Tất cả hải sản", href: "/products" },
  { name: "Cá tươi & đông lạnh", href: "/categories/ca-bien-tuoi" },
  { name: "Tôm sống", href: "/categories/tom-song" },
  { name: "Cua & ghẹ", href: "/categories/cua-ghe" },
  { name: "Mực & bạch tuộc", href: "/categories/muc-bach-tuoc" },
  { name: "Nghêu, sò, ốc", href: "/categories/ngheu-so-oc" },
  { name: "Đặc sản", href: "/categories/hai-san-dac-san" },
  { name: "Vựa hải sản", href: "/#trusted-vendors" },
  { name: "Tìm bằng ảnh", href: "/#visual-search" },
];

function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname || href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface NavLinksProps {
  variant: "bar" | "drawer";
  onNavigate?: () => void;
}

function renderNavLinks(pathname: string | null, { variant, onNavigate }: NavLinksProps) {
  return NAV_LINKS.map((link) => {
      const active = isActiveLink(pathname, link.href);
      return variant === "bar" ? (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active ? "page" : undefined}
          className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-[13px] font-medium transition-colors ${
            active
              ? "text-[#0F3860] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[#0F3860]"
              : "text-slate-600 hover:text-[#0F3860]"
          }`}
        >
          {link.name}
        </Link>
      ) : (
        <li key={link.href}>
          <Link
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 ${active ? "bg-slate-100 text-[#0F3860]" : "hover:bg-slate-50"}`}
          >
            {link.name}
          </Link>
        </li>
      );
  });
}

function ActiveNavLinks(props: NavLinksProps) {
  return <>{renderNavLinks(usePathname(), props)}</>;
}

/**
 * Category links. Reading the URL must sit inside Suspense on prerendered
 * routes, so the fallback renders the same links with nothing marked active.
 */
function NavLinks(props: NavLinksProps) {
  return (
    <Suspense fallback={renderNavLinks(null, props)}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

export function CustomerHeader() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, totalPrice } = useCart();
  // Hidden until the vendor's own store is known; no link when the account has none.
  const myStoreSlug = useMyStoreSlug();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  // Flat at the top of the page, lifted with a soft shadow once content scrolls under it.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.replace("/");
    router.refresh();
  };


  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_6px_24px_-12px_rgba(15,23,42,0.25)]" : "shadow-none"
      }`}
    >
      {/* 1. Top Utility Bar */}
      <div className="bg-[#0A192F] text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <p className="truncate">
            <span className="text-white">Hải sản tươi sống từ vựa</span>
            <span className="hidden text-slate-400 md:inline"> · Giao trong 2 giờ tại TP.HCM</span>
          </p>

          <div className="flex items-center gap-5 text-slate-300">
            <a
              href={`tel:${SUPPORT_HOTLINE.tel}`}
              className="flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 text-cyan-400" />
              <span>Hotline: <strong className="text-white">{SUPPORT_HOTLINE.display}</strong></span>
            </a>
            {/* Role-specific top bar action (hides register for existing vendors/admins) */}
            {user?.role === "VENDOR" ? (
              <>
                <span className="hidden text-slate-600 sm:inline">|</span>
                <Link
                  href="/vendor/dashboard"
                  className="hidden items-center gap-1.5 transition-colors text-amber-300 hover:text-white sm:flex font-semibold"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Kênh Vựa / Dashboard</span>
                </Link>
              </>
            ) : user?.role === "ADMIN" ? (
              <>
                <span className="hidden text-slate-600 sm:inline">|</span>
                <Link
                  href="/admin/dashboard"
                  className="hidden items-center gap-1.5 transition-colors text-purple-300 hover:text-white sm:flex font-semibold"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Cổng Quản Trị Admin</span>
                </Link>
              </>
            ) : (
              <>
                <span className="hidden text-slate-600 sm:inline">|</span>
                <Link
                  href="/vendor/register"
                  className="hidden items-center gap-1.5 transition-colors hover:text-white sm:flex"
                >
                  <Store className="h-3.5 w-3.5 text-amber-400" />
                  <span>Kênh Người Bán</span>
                </Link>
              </>
            )}
            <span className="hidden text-slate-600 sm:inline">|</span>
            <Link
              href="/help"
              className="hidden transition-colors hover:text-white sm:inline"
            >
              Trợ giúp
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Navbar */}
      <div className="border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:gap-8 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo className="h-9 sm:h-10" />
          </Link>

          {/* Search bar with Camera Visual Search button */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 max-w-2xl items-center rounded-xl border border-slate-200 bg-slate-50 p-1 transition-colors focus-within:border-[#0F3860] focus-within:bg-white md:flex"
          >
            <div className="flex flex-1 items-center px-3">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm cá, tôm, cua, mực tươi bơi lội..."
                className="w-full bg-transparent px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              <Link
                href="/#visual-search"
                title="Tìm hải sản bằng hình ảnh"
                aria-label="Tìm hải sản bằng hình ảnh"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0F3860]"
              >
                <Camera className="h-4 w-4" />
              </Link>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#0F3860] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A2744]"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-1 sm:gap-4">
            {isAuthenticated && user ? (
              <div ref={userMenuRef} className="relative">
                {(() => {
                  const displayName = user.name || user.fullName || "Tài khoản";
                  const displayContact = user.emailOrPhone || user.phone || user.email;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-[#0F3860] active:scale-95"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 font-bold text-xs text-[#0F3860]">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="hidden text-xs font-bold sm:inline truncate max-w-[120px]">
                          {displayName}
                        </span>
                        {/* Left out on phones: with the arrow the signed-in header is 21px wider than the screen. */}
                        <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                      </button>

                      {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-slide-up">
                          <div className="px-3 py-2 border-b border-slate-100">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {displayName}
                              </p>
                              {user.role === "ADMIN" ? (
                                <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                                  Quản trị
                                </span>
                              ) : user.role === "VENDOR" ? (
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  Chủ Vựa
                                </span>
                              ) : (
                                <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                                  Khách Hàng
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {displayContact}
                            </p>
                          </div>

                          <div className="py-1">
                            {/* Role-specific menu options */}
                            {user.role === "ADMIN" ? (
                              <>
                                <Link
                                  href="/admin/dashboard"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-purple-900 hover:bg-purple-50 transition"
                                >
                                  <LayoutDashboard className="h-3.5 w-3.5 text-purple-600" />
                                  <span>Bảng điều khiển Admin</span>
                                </Link>
                                <Link
                                  href="/admin/vendors"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                  <Store className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Duyệt Vựa & Người bán</span>
                                </Link>
                                <Link
                                  href="/admin/users"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                  <Users className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Quản lý Người dùng</span>
                                </Link>
                              </>
                            ) : user.role === "VENDOR" ? (
                              <>
                                <Link
                                  href="/vendor/dashboard"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 transition"
                                >
                                  <LayoutDashboard className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Bảng điều khiển Vựa</span>
                                </Link>
                                <Link
                                  href="/vendor/products"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                  <Package className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Quản lý Sản phẩm</span>
                                </Link>
                                <Link
                                  href="/vendor/orders"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                  <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Quản lý Đơn hàng</span>
                                </Link>
                                {myStoreSlug && (
                                  <Link
                                    href={`/vendor/${encodeURIComponent(myStoreSlug)}`}
                                    onClick={() => setUserMenuOpen(false)}
                                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    <Store className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Gian hàng của bạn</span>
                                  </Link>
                                )}
                              </>
                            ) : (
                              <>
                                <Link
                                  href="/customer/orders"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F3860] transition"
                                >
                                  <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Đơn mua của tôi</span>
                                </Link>
                                <Link
                                  href="/customer/profile"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F3860] transition"
                                >
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Hồ sơ tài khoản</span>
                                </Link>
                                <Link
                                  href="/vendor/register"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
                                >
                                  <Store className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Đăng ký mở Vựa</span>
                                </Link>
                              </>
                            )}
                          </div>

                          <div className="border-t border-slate-100 pt-1">
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              <span>Đăng xuất</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <Link
                href="/customer/login"
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-[#0F3860] active:scale-95"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden text-xs font-bold sm:inline">Tài khoản</span>
              </Link>
            )}

            <Link
              href="/customer/wishlist"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-[#E63946] hover:scale-105 active:scale-95 sm:flex"
              title="Danh sách yêu thích"
            >
              <Heart className="h-5 w-5" />
            </Link>

            <Link
              href="/customer/cart"
              className="flex items-center gap-2.5 rounded-xl bg-[#0F3860] px-3.5 py-2 text-white shadow-xs transition-all duration-200 hover:bg-[#0A2744] hover:shadow-md hover:shadow-blue-950/20 hover:scale-102 active:scale-95"
            >
              <div className="relative">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#E63946] text-[10px] font-bold text-white shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              {/* Icon only on phones; the label would push the menu button off screen. */}
              <span className="sr-only sm:hidden">Giỏ hàng</span>
              <span className="hidden text-xs font-bold sm:inline">
                {itemCount > 0 ? formatPrice(totalPrice) : "Giỏ hàng"}
              </span>
            </Link>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <form
            onSubmit={handleSearch}
            className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm cá, tôm, cua tươi bơi lội..."
              className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none"
            />
            <Link
              href="/#visual-search"
              aria-label="Tìm hải sản bằng hình ảnh"
              className="p-1.5 text-slate-500 hover:text-[#0F3860]"
            >
              <Camera className="h-4 w-4" />
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-[#0F3860] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Tìm
            </button>
          </form>
        </div>
      </div>

      {/* 3. Sub-Navigation (Category Pills) */}
      <nav className="hidden border-b border-slate-200/80 bg-white md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 scrollbar-none sm:px-6 lg:px-8">
          <NavLinks variant="bar" />
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-lg md:hidden space-y-4">
          {isAuthenticated && user && (
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">
                  {user.name || user.fullName}
                </span>
                <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-[#0F3860]">
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/60 text-xs">
                {user.role === "ADMIN" ? (
                  <>
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-semibold text-purple-700"
                    >
                      Bảng điều khiển Admin
                    </Link>
                    <Link
                      href="/admin/vendors"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-600"
                    >
                      Duyệt Vựa & Người bán
                    </Link>
                  </>
                ) : user.role === "VENDOR" ? (
                  <>
                    <Link
                      href="/vendor/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-semibold text-emerald-700"
                    >
                      Bảng điều khiển Vựa
                    </Link>
                    <Link
                      href="/vendor/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-600"
                    >
                      Quản lý sản phẩm
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/customer/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-700"
                    >
                      Đơn mua của tôi
                    </Link>
                    <Link
                      href="/customer/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-700"
                    >
                      Hồ sơ tài khoản
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left font-semibold text-rose-600 pt-1"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          )}

          <ul className="space-y-2 text-sm font-semibold text-slate-700">
            <NavLinks variant="drawer" onNavigate={() => setMobileMenuOpen(false)} />
          </ul>
        </div>
      )}
    </header>
  );
}
