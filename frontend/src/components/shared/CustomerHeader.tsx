"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Camera,
  Heart,
  ShoppingCart,
  User,
  Phone,
  Store,
  Sparkles,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart/context/CartContext";
import { formatPrice } from "@/lib/utils";

export function CustomerHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, totalPrice } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      window.location.href = `/customer/search?q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
    }
  };

  const navCategories = [
    { name: "Trang chủ", href: "/", active: true },
    { name: "Cá Tươi & Đông Lạnh", href: "#featured-seafood" },
    { name: "Tôm Sống & Tự Nhiên", href: "#featured-seafood" },
    { name: "Cua & Ghẹ Cà Mau", href: "#featured-seafood" },
    { name: "Mực & Bạch Tuộc", href: "#featured-seafood" },
    { name: "Nghêu, Sò, Ốc", href: "#featured-seafood" },
    { name: "Hải Sản Đặc Sản", href: "#featured-seafood" },
    { name: "Vựa Hải Sản", href: "#trusted-vendors" },
    { name: "Tìm Bằng AI", href: "#visual-search", highlight: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md shadow-xs transition-shadow duration-300">
      {/* 1. Top Utility Bar */}
      <div className="bg-[#0A192F] text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-white">
              Cam kết hải sản tươi sống mỗi ngày
            </span>
            <span className="hidden text-slate-400 md:inline">— Giao hỏa tốc 2h tại TP.HCM</span>
          </div>

          <div className="flex items-center gap-5 text-slate-300">
            <a
              href="tel:19006868"
              className="flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 text-cyan-400" />
              <span>Hotline: <strong className="text-white">1900 6868</strong></span>
            </a>
            <span className="hidden text-slate-600 sm:inline">|</span>
            <Link
              href="/vendor/register"
              className="hidden items-center gap-1.5 transition-colors hover:text-white sm:flex"
            >
              <Store className="h-3.5 w-3.5 text-amber-400" />
              <span>Kênh Người Bán</span>
            </Link>
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
          {/* Logo with 3D hover scale */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-6deg]">
              🐟
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-[#0F3860]">
                HaiSan<span className="text-[#E63946]">Express</span>
              </span>
              <span className="hidden -mt-1 block text-[10px] font-medium tracking-wide text-slate-400 uppercase sm:block">
                Chợ hải sản trực tuyến
              </span>
            </div>
          </Link>

          {/* Search bar with Camera Visual Search button */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 max-w-2xl items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1 transition-all duration-300 focus-within:border-[#0F3860] focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-950/10 md:flex"
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
                href="#visual-search"
                title="Tìm kiếm hải sản bằng hình ảnh (AI)"
                className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition-all duration-200 hover:bg-sky-100 hover:scale-102 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600" />
                <span className="hidden lg:inline">Tìm bằng ảnh</span>
              </Link>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#0F3860] px-5 py-2 text-sm font-bold text-white shadow-xs transition-all duration-200 hover:bg-[#0A2744] hover:shadow-md hover:shadow-blue-950/20 active:scale-95"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
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
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </button>

                      {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-slide-up">
                          <div className="px-3 py-2 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {displayContact}
                            </p>
                          </div>
                          <Link
                            href="/customer/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0F3860]"
                          >
                            <span>Đơn mua của tôi</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Đăng xuất</span>
                          </button>
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-[#E63946] hover:scale-105 active:scale-95"
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
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#E63946] text-[10px] font-black text-white shadow-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold sm:inline">
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
              href="#visual-search"
              className="p-1.5 text-slate-500 hover:text-sky-600"
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
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {navCategories.map((cat, idx) => (
            <Link
              key={idx}
              href={cat.href}
              className={`relative shrink-0 whitespace-nowrap px-3.5 py-3 text-xs font-bold transition-colors ${
                cat.active
                  ? "text-[#0F3860] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#0F3860]"
                  : cat.highlight
                  ? "flex items-center gap-1 text-sky-600 hover:text-sky-700"
                  : "text-slate-600 hover:text-[#0F3860]"
              }`}
            >
              {cat.highlight && <Sparkles className="h-3 w-3 text-amber-500" />}
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* 4. Announcement strip */}
      <div className="bg-sky-50 border-b border-sky-100/80 px-4 py-1.5 text-center text-xs font-medium text-sky-900">
        <span className="mr-1.5">📢</span>
        <strong>Ưu đãi chào hè:</strong> Giảm tới 20% cho đơn hàng hải sản tươi sống từ 500k — Nhập mã:{" "}
        <span className="font-mono font-bold text-[#E63946] bg-white px-1.5 py-0.5 rounded border border-red-200">
          SEAFRESH
        </span>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
          <ul className="space-y-2 text-sm font-semibold text-slate-700">
            {navCategories.map((cat, idx) => (
              <li key={idx}>
                <Link
                  href={cat.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 ${
                    cat.active
                      ? "bg-slate-100 text-[#0F3860]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
