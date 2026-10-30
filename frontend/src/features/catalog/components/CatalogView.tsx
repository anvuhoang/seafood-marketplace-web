import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  PackageOpen,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Wind,
  X,
} from "lucide-react";
import { ProductListing } from "../types/catalog.types";
import {
  CatalogQuery,
  PRICE_PRESETS,
  SORT_OPTIONS,
  buildCatalogHref,
  toggle,
} from "../utils/catalog-query";
import { CatalogProductCard } from "./CatalogProductCard";
import { CatalogSortSelect } from "./CatalogSortSelect";

interface CatalogViewProps {
  listing: ProductListing;
  query: CatalogQuery;
  title: string;
  description: string;
  breadcrumb: Array<{ label: string; href?: string }>;
}

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

export function CatalogView({ listing, query, title, description, breadcrumb }: CatalogViewProps) {
  const { items, pagination, totalProducts } = listing;
  const href = (overrides: Partial<CatalogQuery>) => buildCatalogHref(query, overrides);
  const first = items.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const last = first > 0 ? first + items.length - 1 : 0;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
          <Home className="h-3.5 w-3.5" />
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[#0F3860]">{crumb.label}</Link>
              ) : (
                <span className="font-semibold text-[#0F3860]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-[#0F3860] sm:text-3xl">{title}</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-[#0F3860]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E63946]" />
                Hiển thị {items.length} trên {totalProducts} sản phẩm toàn sàn
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <div className="flex items-center gap-2.5 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 lg:self-auto">
            <BadgeCheck className="h-5 w-5 text-[#E63946]" />
            <div className="text-xs">
              <p className="text-slate-500">Cam kết chất lượng</p>
              <p className="font-bold text-[#0F3860]">Bao ăn 1 đổi 1 trong 60 phút</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters: collapsible on mobile, always open on desktop */}
        <div className="lg:hidden">
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-black text-[#0F3860]">
              <SlidersHorizontal className="h-4 w-4" /> Bộ lọc tìm kiếm
            </summary>
            <div className="border-t border-slate-100 p-4">
              <CatalogFilters listing={listing} query={query} href={href} />
            </div>
          </details>
        </div>
        <aside className="hidden space-y-4 lg:block">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <CatalogFilters listing={listing} query={query} href={href} />
          </div>
          <div className="rounded-xl bg-[#0F3860] p-5 text-white">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-sky-200">
              <Snowflake className="h-3.5 w-3.5" /> CHUỖI LẠNH KHÉP KÍN
            </p>
            <p className="mt-1 text-base font-black">Giao Tận Nơi Bơi Tận Cửa</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-200">
              Đóng thùng xốp nén oxy nguyên chất duy trì sự sống tối đa 8 tiếng cho tôm, cua, ghẹ bơi hồ tự nhiên.
            </p>
          </div>
        </aside>

        <section className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-sm text-slate-600">
                <span className="text-base font-black text-slate-900">{pagination.totalItems}</span> sản phẩm
              </span>
              <ActiveFilterChips listing={listing} query={query} href={href} />
            </div>
            <div className="flex items-center gap-2">
              <CatalogSortSelect
                value={query.sort}
                options={SORT_OPTIONS.map((o) => ({ ...o, href: href({ sort: o.key }) }))}
              />
              <ViewToggle current={query.view} gridHref={href({ view: "grid", page: query.page })} listHref={href({ view: "list", page: query.page })} />
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <PackageOpen className="h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-base font-black text-slate-900">Không có sản phẩm phù hợp</h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Thử bỏ bớt bộ lọc hoặc chọn danh mục khác để xem thêm hải sản đang bán.
              </p>
              <Link
                href={buildCatalogHref(query, { categories: [], regions: [], vendors: [], minPrice: undefined, maxPrice: undefined, inStock: false })}
                className="mt-5 rounded-xl bg-[#0F3860] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744]"
              >
                Xem tất cả hải sản
              </Link>
            </div>
          ) : (
            <div
              className={
                query.view === "list"
                  ? "space-y-3"
                  : "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
              }
            >
              {items.map((item) => (
                <CatalogProductCard key={item.id} product={item} view={query.view} />
              ))}
            </div>
          )}

          {pagination.totalItems > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
              <p className="text-xs text-slate-500">
                Hiển thị <b className="text-slate-800">{first} - {last}</b> trong tổng số{" "}
                <b className="text-slate-800">{pagination.totalItems}</b> sản phẩm
              </p>
              {pagination.totalPages > 1 && (
                <Pagination page={pagination.page} totalPages={pagination.totalPages} href={href} />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 rounded-xl bg-sky-50/70 p-4 sm:grid-cols-3">
            <InfoItem icon={ShieldCheck} title="Nguồn Gốc Minh Bạch" text="Mỗi đơn hàng đều ghi rõ vựa khai thác và nhật ký bơi hồ." />
            <InfoItem icon={Wind} title="Đóng Oxy Chuyên Dụng" text="Tôm ghẹ vẫn bơi khoẻ khi khách khui thùng kiểm tra tại nhà." />
            <InfoItem icon={RefreshCcw} title="Bồi Hoàn Nhanh 60P" text="Gặp hải sản óp hoặc ngộp bù mới 100% không phát sinh phí." />
          </div>
        </section>
      </div>
    </div>
  );
}

type HrefFn = (overrides: Partial<CatalogQuery>) => string;

function CatalogFilters({ listing, query, href }: { listing: ProductListing; query: CatalogQuery; href: HrefFn }) {
  const { facets, totalProducts } = listing;
  const hasFilters =
    query.categories.length + query.regions.length + query.vendors.length > 0 ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.inStock;
  const clearAll = href({ categories: [], regions: [], vendors: [], minPrice: undefined, maxPrice: undefined, inStock: false });

  // The custom price form submits to the current listing URL without price params.
  const priceBase = new URL(href({ minPrice: undefined, maxPrice: undefined }), "http://local");

  return (
    <div className="space-y-5">
      <div className="hidden items-center justify-between lg:flex">
        <h2 className="flex items-center gap-2 text-base font-black text-[#0F3860]">
          <SlidersHorizontal className="h-4 w-4" /> Bộ lọc tìm kiếm
        </h2>
        {hasFilters && (
          <Link href={clearAll} scroll={false} className="text-xs font-bold text-[#E63946] hover:underline">
            Đặt lại
          </Link>
        )}
      </div>

      <FilterGroup title="Loại hải sản">
        <CheckOption
          label="Tất cả loại hải sản"
          count={totalProducts}
          checked={query.categories.length === 0}
          href={href({ categories: [] })}
        />
        {facets.categories.map((option) => (
          <CheckOption
            key={option.value}
            label={option.label}
            count={option.count}
            checked={query.categories.includes(option.value)}
            href={href({ categories: toggle(query.categories, option.value) })}
          />
        ))}
      </FilterGroup>

      {facets.regions.length > 0 && (
        <FilterGroup title="Ngư trường & địa phương" note="Nguồn gốc theo địa chỉ vựa đối tác">
          {facets.regions.map((option) => (
            <CheckOption
              key={option.value}
              label={option.label}
              count={option.count}
              checked={query.regions.includes(option.value)}
              href={href({ regions: toggle(query.regions, option.value) })}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Khoảng giá (VND/Kg)">
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const active = query.minPrice === preset.min && query.maxPrice === preset.max;
            return (
              <Link
                key={preset.label}
                href={active ? href({ minPrice: undefined, maxPrice: undefined }) : href({ minPrice: preset.min, maxPrice: preset.max })}
                scroll={false}
                aria-pressed={active}
                className={`rounded-md px-2 py-1.5 text-center text-[11px] font-bold transition ${
                  active ? "bg-[#0F3860] text-white" : "bg-sky-50 text-[#0F3860] hover:bg-sky-100"
                }`}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
        <form action={priceBase.pathname} className="mt-2 space-y-2">
          {[...priceBase.searchParams.entries()].map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              name="minPrice"
              min={0}
              step={1000}
              defaultValue={query.minPrice}
              placeholder="Từ"
              aria-label="Giá thấp nhất"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#0F3860]"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              name="maxPrice"
              min={0}
              step={1000}
              defaultValue={query.maxPrice}
              placeholder="Đến"
              aria-label="Giá cao nhất"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#0F3860]"
            />
          </div>
          <button type="submit" className="w-full rounded-md bg-[#0F3860] py-2 text-xs font-bold text-white hover:bg-[#0A2744]">
            Áp dụng khoảng giá
          </button>
        </form>
      </FilterGroup>

      {facets.vendors.length > 0 && (
        <FilterGroup title="Vựa hải sản tiêu biểu">
          {facets.vendors.map((option) => (
            <CheckOption
              key={option.value}
              label={option.label}
              count={option.count}
              checked={query.vendors.includes(option.value)}
              href={href({ vendors: toggle(query.vendors, option.value) })}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Tình trạng sẵn có">
        <CheckOption label="Còn hàng sẵn hồ / kho lạnh" checked={query.inStock} href={href({ inStock: !query.inStock })} />
      </FilterGroup>

      {hasFilters && (
        <Link
          href={clearAll}
          scroll={false}
          className="block rounded-md border border-slate-200 py-2 text-center text-xs font-bold text-[#E63946] lg:hidden"
        >
          Đặt lại bộ lọc
        </Link>
      )}
    </div>
  );
}

function FilterGroup({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-[#0F3860]">{title}</h3>
      <div className="space-y-1">{children}</div>
      {note && <p className="mt-2 text-[11px] italic text-slate-400">{note}</p>}
    </div>
  );
}

function CheckOption({ label, count, checked, href }: { label: string; count?: number; checked: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      role="checkbox"
      aria-checked={checked}
      className="flex items-center gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50"
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
          checked ? "border-[#0F3860] bg-[#0F3860]" : "border-slate-300 bg-white"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-[1px] bg-white" />}
      </span>
      <span className={`flex-1 ${checked ? "font-bold text-[#0F3860]" : ""}`}>{label}</span>
      {count !== undefined && (
        <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">{count}</span>
      )}
    </Link>
  );
}

function ActiveFilterChips({ listing, query, href }: { listing: ProductListing; query: CatalogQuery; href: HrefFn }) {
  const labelOf = (options: ProductListing["facets"]["categories"], value: string) =>
    options.find((o) => o.value === value)?.label ?? value;

  const chips: Array<{ label: string; href: string }> = [
    ...query.categories.map((value) => ({
      label: `Loại: ${labelOf(listing.facets.categories, value)}`,
      href: href({ categories: toggle(query.categories, value) }),
    })),
    ...query.regions.map((value) => ({
      label: `Địa phương: ${labelOf(listing.facets.regions, value)}`,
      href: href({ regions: toggle(query.regions, value) }),
    })),
    ...query.vendors.map((value) => ({
      label: `Vựa: ${labelOf(listing.facets.vendors, value)}`,
      href: href({ vendors: toggle(query.vendors, value) }),
    })),
  ];

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const from = query.minPrice !== undefined ? formatVnd(query.minPrice) : "0đ";
    const to = query.maxPrice !== undefined ? formatVnd(query.maxPrice) : "trở lên";
    chips.push({ label: `Giá: ${from} - ${to}`, href: href({ minPrice: undefined, maxPrice: undefined }) });
  }
  if (query.inStock) {
    chips.push({ label: "Còn hàng", href: href({ inStock: false }) });
  }

  if (chips.length === 0) {
    return <span className="rounded-md bg-sky-50 px-2 py-1 font-bold text-[#0F3860]">Loại: Tất cả · Địa phương: Toàn quốc</span>;
  }

  return (
    <>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          scroll={false}
          className="flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 font-bold text-[#0F3860] hover:bg-sky-100"
        >
          {chip.label} <X className="h-3 w-3" />
        </Link>
      ))}
      <Link
        href={href({ categories: [], regions: [], vendors: [], minPrice: undefined, maxPrice: undefined, inStock: false })}
        scroll={false}
        className="text-slate-500 underline hover:text-[#E63946]"
      >
        Xóa tất cả
      </Link>
    </>
  );
}

function ViewToggle({ current, gridHref, listHref }: { current: CatalogQuery["view"]; gridHref: string; listHref: string }) {
  const base = "flex h-8 w-8 items-center justify-center rounded-md border transition";
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Kiểu hiển thị">
      <Link href={gridHref} scroll={false} aria-label="Dạng lưới" aria-pressed={current === "grid"} className={`${base} ${current === "grid" ? "border-[#0F3860] bg-[#0F3860] text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
        <LayoutGrid className="h-4 w-4" />
      </Link>
      <Link href={listHref} scroll={false} aria-label="Dạng danh sách" aria-pressed={current === "list"} className={`${base} ${current === "list" ? "border-[#0F3860] bg-[#0F3860] text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
        <List className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** Page numbers with ellipses, e.g. 1 2 3 … 14. */
function pageNumbers(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: HrefFn }) {
  const base = "flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition";
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1.5">
      {page > 1 ? (
        <Link href={href({ page: page - 1 })} className={`${base} bg-slate-50 text-slate-700 hover:bg-slate-100`}>
          <ChevronLeft className="h-3.5 w-3.5" /> Trước
        </Link>
      ) : (
        <span aria-disabled="true" className={`${base} bg-slate-50 text-slate-300`}>
          <ChevronLeft className="h-3.5 w-3.5" /> Trước
        </span>
      )}
      {pageNumbers(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <Link
            key={p}
            href={href({ page: p })}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-[#0F3860] text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href({ page: page + 1 })} className={`${base} bg-slate-50 text-slate-700 hover:bg-slate-100`}>
          Sau <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <span aria-disabled="true" className={`${base} bg-slate-50 text-slate-300`}>
          Sau <ChevronRight className="h-3.5 w-3.5" />
        </span>
      )}
    </nav>
  );
}

function InfoItem({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0F3860]">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-black text-[#0F3860]">{title}</p>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
