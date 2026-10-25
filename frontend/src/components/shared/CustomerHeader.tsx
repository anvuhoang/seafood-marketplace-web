"use client";

import Link from "next/link";
import { useState } from "react";
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
} from "lucide-react";

export function CustomerHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-50 w-full bg-white shadow-xs">
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
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:gap-8 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-xl text-white shadow-sm">
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
            className="hidden flex-1 max-w-2xl items-center rounded-xl border border-slate-200 bg-slate-50/80 p-1 transition-all focus-within:border-[#0F3860] focus-within:bg-white md:flex"
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
                className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600" />
                <span className="hidden lg:inline">Tìm bằng ảnh</span>
              </Link>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#0F3860] px-5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#0A2744]"
            >
              Tìm kiếm
            </button>
          </form>

          {/* Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/customer/login"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#0F3860]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden text-xs font-bold sm:inline">Tài khoản</span>
            </Link>

            <Link
              href="/customer/wishlist"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50 hover:text-[#E63946]"
              title="Danh sách yêu thích"
            >
              <Heart className="h-5 w-5" />
            </Link>

            <Link
              href="/customer/cart"
              className="flex items-center gap-2 rounded-xl bg-[#0F3860] px-3.5 py-2 text-white shadow-xs transition hover:bg-[#0A2744]"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden text-xs font-bold sm:inline">Giỏ hàng</span>
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
