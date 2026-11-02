import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  ChevronRight,
  FilterX,
  Home,
  Lightbulb,
  RotateCcw,
  SearchX,
  SpellCheck,
  Store,
  X,
} from "lucide-react";
import { ProductListing, ProductListingItem, RegionSummary } from "../types/catalog.types";
import { CatalogQuery, buildCatalogHref } from "../utils/catalog-query";
import { ActiveFilterChips } from "./CatalogView";
import { CatalogProductCard } from "./CatalogProductCard";

/** Species that exist in the catalogue, offered as one-click searches. */
const EXAMPLE_KEYWORDS = ["ghẹ xanh", "tôm sú", "mực ống"];

interface CatalogSearchEmptyProps {
  query: CatalogQuery;
  listing: ProductListing;
  suggestions: ProductListingItem[];
  regions: RegionSummary[];
}

/**
 * Shown when a keyword search returns nothing: explains why, offers ways to
 * widen the search and suggests products that are for sale.
 */
export function CatalogSearchEmpty({ query, listing, suggestions, regions }: CatalogSearchEmptyProps) {
  const href = (overrides: Partial<CatalogQuery>) => buildCatalogHref(query, overrides);
  const hasFilters =
    query.categories.length + query.regions.length + query.vendors.length > 0 ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.inStock;
  const clearFilters = href({ categories: [], regions: [], vendors: [], minPrice: undefined, maxPrice: undefined, inStock: false });
  const searchFor = (keyword: string) => buildCatalogHref(query, { q: keyword });

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <Home className="h-3.5 w-3.5" />
        <Link href="/" className="hover:text-[#0F3860]">Trang chủ</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <Link href="/products" className="hover:text-[#0F3860]">Tìm kiếm sản phẩm</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="truncate font-semibold text-[#0F3860]">Kết quả cho &quot;{query.q}&quot;</span>
      </nav>

      {/* Keyword and active conditions */}
      <section className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Từ khóa tìm kiếm</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            &quot;{query.q}&quot;
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-[#E63946]">0 sản phẩm</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ActiveFilterChips listing={listing} query={query} href={href} />
        </div>
      </section>

      {/* Explanation and next steps */}
      <section className="grid grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-[#0F3860]">
            <SearchX className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Không tìm thấy hải sản phù hợp với tìm kiếm của bạn
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Không có sản phẩm nào khớp với từ khóa <b className="text-slate-900">&quot;{query.q}&quot;</b>
              {hasFilters ? " cùng các bộ lọc đang áp dụng." : "."}
            </p>
          </div>

          <ul className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <li className="flex gap-3">
              <SpellCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3860]" />
              <div>
                <p className="font-bold text-slate-900">Kiểm tra chính tả hoặc dùng từ khóa ngắn hơn</p>
                <p className="text-xs text-slate-500">
                  Thử tên loài đơn giản, ví dụ{" "}
                  {EXAMPLE_KEYWORDS.map((keyword, i) => (
                    <span key={keyword}>
                      {i > 0 && ", "}
                      <Link href={searchFor(keyword)} className="font-semibold text-[#0F3860] underline">
                        {keyword}
                      </Link>
                    </span>
                  ))}
                  . Có thể gõ không dấu.
                </p>
              </div>
            </li>
            {hasFilters && (
              <li className="flex gap-3">
                <FilterX className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3860]" />
                <div>
                  <p className="font-bold text-slate-900">Bỏ bớt bộ lọc đang áp dụng</p>
                  <p className="text-xs text-slate-500">Khoảng giá, vùng hoặc vựa đang chọn có thể làm kết quả quá hẹp.</p>
                </div>
              </li>
            )}
          </ul>

          <div className="flex flex-wrap gap-2">
            {hasFilters && (
              <Link
                href={clearFilters}
                className="flex items-center gap-1.5 rounded-lg bg-[#E63946] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#D62839]"
              >
                <FilterX className="h-4 w-4" /> Xóa tất cả bộ lọc
              </Link>
            )}
            <Link
              href={href({ q: "" })}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#0F3860] hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Xóa từ khóa
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#0F3860] hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" /> Xem tất cả hải sản
            </Link>
          </div>
        </div>

        {regions.length > 0 && (
          <aside className="space-y-3">
            <div className="rounded-xl bg-sky-50/70 p-4">
              <p className="text-xs font-semibold text-[#0F3860]">Vựa đang có hàng theo vùng</p>
              <ul className="mt-3 space-y-2 text-xs">
                {regions.slice(0, 4).map((region) => (
                  <li key={region.key}>
                    <Link
                      href={buildCatalogHref(query, { q: "", regions: [region.key], categories: [], vendors: [], minPrice: undefined, maxPrice: undefined, inStock: false })}
                      className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 hover:bg-sky-50"
                    >
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Anchor className="h-3.5 w-3.5 text-[#0F3860]" />
                        {region.district} ({region.province})
                      </span>
                      <b className="text-[#0F3860]">{region.productCount} sản phẩm</b>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <p className="flex gap-2 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-600">
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
              Chọn một vùng ở trên để xem hải sản đang được các vựa tại đó mở bán.
            </p>
          </aside>
        )}
      </section>

      {/* Products that are for sale */}
      {suggestions.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#E63946]">
                <Store className="h-3.5 w-3.5" /> Gợi ý thay thế
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Có thể bạn quan tâm</h2>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-xs font-bold text-[#0F3860] hover:text-[#E63946]">
              Xem tất cả {listing.totalProducts} sản phẩm <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {suggestions.map((item) => (
              <CatalogProductCard key={item.id} product={item} view="grid" />
            ))}
          </div>
        </section>
      )}

      {/* Category shortcuts */}
      {listing.facets.categories.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">Tìm theo danh mục</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.facets.categories.map((category) => (
              <Link
                key={category.value}
                href={`/categories/${category.value}`}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-[#0F3860] hover:text-[#0F3860]"
              >
                # {category.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
