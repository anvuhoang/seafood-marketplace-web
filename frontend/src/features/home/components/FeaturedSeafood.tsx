"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProductListing } from "@/features/catalog/api/catalog.api";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import { CatalogQuery } from "@/features/catalog/utils/catalog-query";
import { FacetOption, ProductListingItem } from "@/features/catalog/types/catalog.types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

/** The home page shows a short pick; full filtering lives on /products. */
const HOME_PRODUCT_LIMIT = 8;

export function FeaturedSeafood() {
  const [category, setCategory] = useState("");
  const [attempt, setAttempt] = useState(0);

  // The result is tagged with the filters it was fetched for, so "loading" is
  // simply "the latest result belongs to older filters".
  const [result, setResult] = useState<{
    key: string;
    items: ProductListingItem[];
    failed: boolean;
  } | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<FacetOption[]>([]);
  // Tabs come from the first, unfiltered response so they stay put while switching.
  const facetsLoaded = useRef(false);

  const filterKey = [category, attempt].join("|");

  useEffect(() => {
    let mounted = true;
    const query: CatalogQuery = {
      q: "",
      categories: category ? [category] : [],
      regions: [],
      vendors: [],
      inStock: false,
      sort: "featured",
      page: 1,
      view: "grid",
    };

    getProductListing(query)
      .then((listing) => {
        if (!mounted) return;
        setResult({ key: filterKey, items: listing.items.slice(0, HOME_PRODUCT_LIMIT), failed: false });
        if (!facetsLoaded.current) {
          facetsLoaded.current = true;
          setCategoryOptions(listing.facets.categories);
        }
      })
      .catch((error) => {
        console.error("Failed to load featured products:", error);
        if (mounted) setResult({ key: filterKey, items: [], failed: true });
      });

    return () => {
      mounted = false;
    };
  }, [filterKey, category]);

  const items = result?.items ?? [];
  const isLoading = result?.key !== filterKey;
  const hasError = !isLoading && result?.failed === true;
  const tabs = [{ value: "", label: "Tất cả" }, ...categoryOptions];
  const seeAllHref = category ? `/categories/${category}` : "/products";

  return (
    <section id="featured-seafood" className="bg-slate-50 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Hải sản nổi bật hôm nay"
          description="Hàng mới về trong ngày từ các vựa đối tác. Giá có thể thay đổi nhẹ theo kích cỡ."
          actionHref="/products"
          actionLabel="Xem tất cả hải sản"
        />

        <div
          role="tablist"
          aria-label="Lọc theo danh mục"
          className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {tabs.map((tab) => {
            const active = category === tab.value;
            return (
              <button
                key={tab.value || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(tab.value)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-[#0F3860] bg-[#0F3860] font-medium text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {hasError ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-700">Không tải được danh sách hải sản.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-3 text-sm font-semibold text-[#0F3860] hover:underline"
            >
              Thử lại
            </button>
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: HOME_PRODUCT_LIMIT }, (_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-xl bg-slate-200/60" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div
            className={`grid grid-cols-2 gap-4 transition-opacity sm:gap-5 lg:grid-cols-4 ${
              isLoading ? "opacity-60" : ""
            }`}
          >
            {items.map((product, index) => (
              <ScrollReveal key={product.id} delay={(index % 4) * 70} className="h-full">
                <CatalogProductCard product={product} view="grid" />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            Danh mục này tạm hết hàng.
          </p>
        )}

        <div className="mt-8 text-center">
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-[#0F3860] hover:text-[#0F3860]"
          >
            {category ? "Xem cả danh mục" : "Xem tất cả hải sản"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
