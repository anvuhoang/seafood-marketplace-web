"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { featuredProducts } from "../data/home.mock";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FeaturedSeafood() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  const quickFilterChips = [
    { label: "Cá hồi tươi", category: "ca-bien-tuoi" },
    { label: "Cua Cà Mau", origin: "Cà Mau" },
    { label: "Tôm càng xanh", category: "tom-song" },
    { label: "Mực Côn Đảo", origin: "Côn Đảo" },
    { label: "Hàu Sữa", category: "ngheu-so-hau" },
  ];

  const filteredList = useMemo(() => {
    let result = [...featuredProducts];

    // Quick filter check
    if (quickFilter) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(quickFilter.toLowerCase()) ||
          p.origin.toLowerCase().includes(quickFilter.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Origin filter
    if (selectedOrigin !== "all") {
      result = result.filter((p) => p.origin === selectedOrigin);
    }

    // Price filter
    if (selectedPriceRange === "under-300") {
      result = result.filter((p) => p.price < 300000);
    } else if (selectedPriceRange === "300-500") {
      result = result.filter((p) => p.price >= 300000 && p.price <= 500000);
    } else if (selectedPriceRange === "above-500") {
      result = result.filter((p) => p.price > 500000);
    }

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [selectedCategory, selectedOrigin, selectedPriceRange, sortBy, quickFilter]);

  const resetAllFilters = () => {
    setSelectedCategory("all");
    setSelectedOrigin("all");
    setSelectedPriceRange("all");
    setSortBy("default");
    setQuickFilter(null);
  };

  return (
    <section id="featured-seafood" className="bg-slate-50/60 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="TUYỂN CHỌN TƯƠI NGON"
          title="Hải sản nổi bật"
          description="Sản phẩm đánh bắt mới về trong ngày từ các vựa đối tác uy tín"
          note="*Giá có thể thay đổi nhẹ tùy theo ngày đánh bắt và kích cỡ"
          actionHref="#featured-seafood"
          actionLabel="Xem tất cả hải sản"
        />

        {/* Filter and Control Bar matching the design */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Category Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Loại hải sản
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setQuickFilter(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0F3860]"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="ca-bien-tuoi">Cá biển tươi</option>
                <option value="tom-song">Tôm sống</option>
                <option value="cua-ghe">Cua & Ghẹ</option>
                <option value="muc-bach-tuoc">Mực & Bạch Tuộc</option>
                <option value="ngheu-so-hau">Nghêu, Sò, Hàu</option>
              </select>
            </div>

            {/* Origin Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nguồn gốc
              </label>
              <select
                value={selectedOrigin}
                onChange={(e) => {
                  setSelectedOrigin(e.target.value);
                  setQuickFilter(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0F3860]"
              >
                <option value="all">Tất cả nguồn gốc</option>
                <option value="Phú Quốc">Phú Quốc</option>
                <option value="Phan Thiết">Phan Thiết</option>
                <option value="Côn Đảo">Côn Đảo</option>
                <option value="Cà Mau">Cà Mau</option>
                <option value="Nha Trang">Nha Trang</option>
                <option value="Vũng Tàu">Vũng Tàu</option>
                <option value="Quảng Ninh">Quảng Ninh</option>
                <option value="Quảng Ngãi">Quảng Ngãi</option>
                <option value="Nhập khẩu Na Uy">Nhập khẩu Na Uy</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Mức giá
              </label>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0F3860]"
              >
                <option value="all">Tất cả mức giá</option>
                <option value="under-300">Dưới 300.000 đ</option>
                <option value="300-500">300.000 đ - 500.000 đ</option>
                <option value="above-500">Trên 500.000 đ</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sắp xếp
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0F3860]"
              >
                <option value="default">Mới nhất / Nổi bật</option>
                <option value="price-asc">Giá thấp đến cao</option>
                <option value="price-desc">Giá cao đến thấp</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Xóa lọc</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Tag Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Gợi ý nhanh:
            </span>
            {quickFilterChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() =>
                  setQuickFilter(quickFilter === chip.label ? null : chip.label)
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  quickFilter === chip.label
                    ? "bg-[#0F3860] text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid (4 columns) */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredList.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-base font-semibold text-slate-700">
              Không tìm thấy sản phẩm hải sản phù hợp với tiêu chí lọc
            </p>
            <button
              onClick={resetAllFilters}
              className="mt-3 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
