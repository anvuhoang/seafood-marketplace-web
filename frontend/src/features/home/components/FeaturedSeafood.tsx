"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getProductListing } from "@/features/catalog/api/catalog.api";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import {
  CatalogQuery,
  PRICE_PRESETS,
  SORT_OPTIONS,
  SortKey,
} from "@/features/catalog/utils/catalog-query";
import { FacetOption, ProductListingItem } from "@/features/catalog/types/catalog.types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const QUICK_FILTER_CHIPS = ["Cá hồi", "Cua Cà Mau", "Tôm càng xanh", "Mực Côn Đảo", "Hàu sữa"];

const selectClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0F3860]";
const labelClassName = "mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider";

export function FeaturedSeafood() {
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [priceIndex, setPriceIndex] = useState(-1);
  const [sort, setSort] = useState<SortKey>("featured");
  const [keyword, setKeyword] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // The result is tagged with the filters it was fetched for, so "loading" is
  // simply "the latest result belongs to older filters".
  const [result, setResult] = useState<{
    key: string;
    items: ProductListingItem[];
    failed: boolean;
  } | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<FacetOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<FacetOption[]>([]);
  // Dropdown options come from the first, unfiltered response so they stay put while filtering.
  const facetsLoaded = useRef(false);

  const filterKey = [category, region, priceIndex, sort, keyword, attempt].join("|");

  useEffect(() => {
    let mounted = true;
    const price = priceIndex >= 0 ? PRICE_PRESETS[priceIndex] : undefined;
    const query: CatalogQuery = {
      q: keyword ?? "",
      categories: category ? [category] : [],
      regions: region ? [region] : [],
      vendors: [],
      minPrice: price?.min,
      maxPrice: price?.max,
      inStock: false,
      sort,
      page: 1,
      view: "grid",
    };

    getProductListing(query)
      .then((listing) => {
        if (!mounted) return;
        setResult({ key: filterKey, items: listing.items, failed: false });
        if (!facetsLoaded.current) {
          facetsLoaded.current = true;
          setCategoryOptions(listing.facets.categories);
          setRegionOptions(listing.facets.regions);
        }
      })
      .catch((error) => {
        console.error("Failed to load featured products:", error);
        if (mounted) setResult({ key: filterKey, items: [], failed: true });
      });

    return () => {
      mounted = false;
    };
  }, [filterKey, category, region, priceIndex, sort, keyword]);

  const items = result?.items ?? [];
  const isLoading = result?.key !== filterKey;
  const hasError = !isLoading && result?.failed === true;

  const resetAllFilters = () => {
    setCategory("");
    setRegion("");
    setPriceIndex(-1);
    setSort("featured");
    setKeyword(null);
  };

  return (
    <section id="featured-seafood" className="bg-slate-50/60 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up-3d">
          <SectionHeading
            eyebrow="TUYỂN CHỌN TƯƠI NGON"
            title="Hải sản nổi bật"
            description="Sản phẩm đánh bắt mới về trong ngày từ các vựa đối tác uy tín"
            note="*Giá có thể thay đổi nhẹ tùy theo ngày đánh bắt và kích cỡ"
            actionHref="/products"
            actionLabel="Xem tất cả hải sản"
          />
        </ScrollReveal>

        <ScrollReveal animation="fade-up-3d" delay={80}>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <label className={labelClassName}>Loại hải sản</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setKeyword(null);
                  }}
                  className={selectClassName}
                >
                  <option value="">Tất cả danh mục</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Nguồn gốc</label>
                <select
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setKeyword(null);
                  }}
                  className={selectClassName}
                >
                  <option value="">Tất cả nguồn gốc</option>
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Mức giá</label>
                <select
                  value={priceIndex}
                  onChange={(e) => setPriceIndex(Number(e.target.value))}
                  className={selectClassName}
                >
                  <option value={-1}>Tất cả mức giá</option>
                  {PRICE_PRESETS.map((preset, index) => (
                    <option key={preset.label} value={index}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName}>Sắp xếp</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className={selectClassName}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

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

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Gợi ý nhanh:</span>
              {QUICK_FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setKeyword(keyword === chip ? null : chip)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                    keyword === chip
                      ? "bg-[#0F3860] text-white shadow-md shadow-blue-950/20"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:shadow-xs"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {hasError ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-base font-semibold text-slate-700">
              Không tải được danh sách hải sản. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-3 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white"
            >
              Tải lại
            </button>
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-xl bg-slate-200/60" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div
            className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${
              isLoading ? "opacity-60" : ""
            }`}
          >
            {items.map((product) => (
              <CatalogProductCard key={product.id} product={product} view="grid" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-base font-semibold text-slate-700">
              Không tìm thấy sản phẩm hải sản phù hợp với tiêu chí lọc
            </p>
            <button
              type="button"
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
