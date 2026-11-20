import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { VendorStorefront } from "../types/vendor.types";
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  StorefrontQuery,
  applyStorefrontQuery,
  buildStorefrontHref,
} from "../utils/storefront-query";
import { StorefrontProductCard } from "./StorefrontProductCard";
import { StorefrontSortSelect } from "./StorefrontSortSelect";
import { FollowVendorButton } from "./FollowVendorButton";
import { HideForStoreOwner } from "./HideForStoreOwner";
import { VendorShareButton } from "./VendorShareButton";

const INACTIVE_STATUS_MESSAGES = {
  PENDING: {
    title: "Gian hàng đang chờ duyệt",
    description: "Vựa này chưa được duyệt để bán hàng trên HaiSan Express.",
  },
  REJECTED: {
    title: "Gian hàng chưa được chấp nhận",
    description: "Hồ sơ đăng ký của vựa này không được chấp nhận, nên hiện chưa bán hàng.",
  },
  SUSPENDED: {
    title: "Gian hàng đang tạm ngưng",
    description: "Vựa này đang tạm ngưng hoạt động. Vui lòng quay lại sau.",
  },
} as const;

function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

interface VendorStorefrontViewProps {
  storefront: VendorStorefront;
  query: StorefrontQuery;
}

export function VendorStorefrontView({ storefront, query }: VendorStorefrontViewProps) {
  const { vendor, status, isActive, productCount, categories } = storefront;
  const joined = formatJoinedDate(vendor.joinedAt);
  const inactiveMessage = isActive
    ? null
    : INACTIVE_STATUS_MESSAGES[status as keyof typeof INACTIVE_STATUS_MESSAGES];
  const href = (overrides: Partial<StorefrontQuery>) =>
    buildStorefrontHref(vendor.slug, query, overrides);

  const stats = [
    { value: String(productCount), label: "sản phẩm đang bán" },
    { value: vendor.ratingAverage.toFixed(1), label: `đánh giá (${vendor.ratingCount})` },
    { value: String(categories.length), label: "nhóm hải sản" },
    { value: joined, label: "tham gia HaiSan Express" },
  ];

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-slate-500">
        <Link href="/" className="hover:text-[#0F3860]">Trang chủ</Link>
        <span aria-hidden className="text-slate-300">/</span>
        <Link href="/#trusted-vendors" className="hover:text-[#0F3860]">Gian hàng đối tác</Link>
        <span aria-hidden className="text-slate-300">/</span>
        <span className="truncate text-slate-900">{vendor.name}</span>
      </nav>

      <ScrollReveal>
        <section>
          <div className="relative aspect-[3/1] min-h-40 w-full overflow-hidden rounded-2xl bg-[#0B2540]">
            {vendor.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>

          <div className="flex flex-col gap-6 pb-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4 sm:gap-5">
              <div className="relative z-10 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 sm:-mt-14 sm:h-28 sm:w-28">
                {vendor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#0F3860]">{vendor.name.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{vendor.name}</h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {vendor.district}, {vendor.province}
                  </span>
                  {isActive && <span className="text-emerald-700">Đối tác đã duyệt</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HideForStoreOwner slug={vendor.slug}>
                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F3860] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0A2744]"
                  >
                    <Phone className="h-4 w-4" />
                    Gọi vựa
                  </a>
                )}
                <FollowVendorButton slug={vendor.slug} initialFollowerCount={vendor.followerCount} />
              </HideForStoreOwner>
              <VendorShareButton vendorName={vendor.name} />
            </div>
          </div>

          {isActive && (
            <dl className="mt-6 grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
              {stats.map(({ value, label }) => (
                <div key={label} className="px-4 py-4 sm:px-5">
                  <dd className="text-xl font-bold tabular-nums text-slate-900">{value}</dd>
                  <dt className="mt-0.5 text-xs text-slate-500">{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </section>
      </ScrollReveal>

      {inactiveMessage && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{inactiveMessage.title}</h2>
            <p className="text-sm text-amber-800">{inactiveMessage.description}</p>
            <Link href="/" className="inline-block pt-1 text-sm font-semibold text-[#0F3860] hover:underline">
              Khám phá các vựa khác
            </Link>
          </div>
        </section>
      )}

      {isActive && (
        <>
          <nav className="flex gap-6 overflow-x-auto border-b border-slate-200 text-sm">
            {[
              { tab: "products" as const, label: `Sản phẩm (${productCount})` },
              { tab: "info" as const, label: "Giới thiệu" },
            ].map(({ tab, label }) => (
              <Link
                key={tab}
                href={buildStorefrontHref(vendor.slug, query, { tab, category: undefined, price: undefined })}
                scroll={false}
                aria-current={query.tab === tab ? "page" : undefined}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 font-semibold transition-colors ${
                  query.tab === tab
                    ? "border-[#0F3860] text-[#0F3860]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {query.tab === "info" ? (
            <VendorInfoTab storefront={storefront} joined={joined} />
          ) : (
            <ProductsTab storefront={storefront} query={query} href={href} />
          )}
        </>
      )}
    </div>
  );
}

function ProductsTab({
  storefront,
  query,
  href,
}: {
  storefront: VendorStorefront;
  query: StorefrontQuery;
  href: (overrides: Partial<StorefrontQuery>) => string;
}) {
  const { vendor, productCount, categories, products } = storefront;
  const { items, totalItems, page, totalPages } = applyStorefrontQuery(products, query);
  const hasFilters = Boolean(query.category || query.price);

  const filters = (
      <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Nhóm hải sản</h2>
            <ul className="space-y-0.5 text-sm">
              {[{ slug: undefined, name: "Tất cả", count: productCount }, ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.productCount }))].map(
                (category) => {
                  const active = query.category === category.slug;
                  return (
                    <li key={category.slug ?? "all"}>
                      <Link
                        href={href({ category: category.slug })}
                        scroll={false}
                        aria-current={active ? "true" : undefined}
                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors ${
                          active ? "bg-slate-100 font-semibold text-[#0F3860]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span>{category.name}</span>
                        <span className="text-xs tabular-nums text-slate-400">{category.count}</span>
                      </Link>
                    </li>
                  );
                },
              )}
            </ul>
          </div>
  
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Mức giá (VND/kg)</h2>
            <ul className="space-y-1 text-sm">
              {PRICE_RANGES.map((range) => {
                const active = query.price === range.key;
                return (
                  <li key={range.key}>
                    <Link
                      href={href({ price: active ? undefined : range.key })}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                        active ? "bg-slate-100 font-semibold text-[#0F3860]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-3.5 w-3.5 rounded-full border ${active ? "border-[#0F3860] bg-[#0F3860] shadow-[inset_0_0_0_2px_white]" : "border-slate-300"}`}
                      />
                      {range.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hasFilters && (
              <Link
                href={href({ category: undefined, price: undefined })}
                scroll={false}
                className="mt-3 inline-block px-2.5 text-sm font-semibold text-[#0F3860] hover:underline"
              >
                Xoá bộ lọc
              </Link>
            )}
          </div>
  
          <p className="border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-600">
            Đổi trả 1 đổi 1 nếu hải sản không đúng mô tả.
            {vendor.phone && (
              <span className="mt-2 block text-slate-900">Liên hệ trực tiếp: {vendor.phone}</span>
            )}
          </p>
        </div>
    );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
      <details className="group rounded-xl border border-slate-200 bg-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900">
          Lọc sản phẩm
          <span className="text-xs font-normal text-slate-500 group-open:hidden">Nhóm, mức giá</span>
        </summary>
        <div className="border-t border-slate-200 p-4">{filters}</div>
      </details>
      <aside className="hidden lg:sticky lg:top-40 lg:block lg:self-start">{filters}</aside>


      <section className="min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hải sản đang bán</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {totalItems} sản phẩm từ {vendor.name}
            </p>
          </div>
          <StorefrontSortSelect
            value={query.sort}
            options={SORT_OPTIONS.map((option) => ({ ...option, href: href({ sort: option.key }) }))}
          />
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
            {hasFilters ? "Không có sản phẩm nào khớp bộ lọc." : "Gian hàng chưa có sản phẩm đang bán."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {items.map((product, index) => (
              <ScrollReveal key={product.id} delay={(index % 3) * 60} className="h-full">
                <StorefrontProductCard product={product} vendorSlug={vendor.slug} originLabel={vendor.district} />
              </ScrollReveal>
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
            <p className="text-sm text-slate-500">
              Trang <span className="font-semibold text-slate-900">{page}</span> / {totalPages}
            </p>
            {totalPages > 1 && (
              <nav aria-label="Phân trang" className="flex items-center gap-1">
                <PageLink href={href({ page: page - 1 })} disabled={page <= 1} label="Trang trước">
                  <ChevronLeft className="h-4 w-4" />
                </PageLink>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PageLink key={p} href={href({ page: p })} active={p === page} label={`Trang ${p}`}>
                    {p}
                  </PageLink>
                ))}
                <PageLink href={href({ page: page + 1 })} disabled={page >= totalPages} label="Trang sau">
                  <ChevronRight className="h-4 w-4" />
                </PageLink>
              </nav>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function PageLink({
  href,
  children,
  label,
  active = false,
  disabled = false,
}: {
  href: string;
  children: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors ${
    active ? "bg-[#0F3860] text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${className} opacity-30`}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} scroll={false} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

function VendorInfoTab({ storefront, joined }: { storefront: VendorStorefront; joined: string }) {
  const { vendor } = storefront;
  const details = [
    { label: "Địa chỉ kho / bến", value: vendor.address },
    { label: "Khu vực", value: `${vendor.district}, ${vendor.province}` },
    { label: "Điện thoại", value: vendor.phone },
    { label: "Tham gia HaiSan Express", value: joined },
    { label: "Đánh giá", value: `${vendor.ratingAverage.toFixed(1)} / 5 (${vendor.ratingCount} đánh giá)` },
  ].filter((detail) => detail.value);

  return (
    <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Giới thiệu {vendor.name}</h2>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-600">
          {vendor.description || "Vựa chưa cập nhật phần giới thiệu."}
        </p>
      </div>
      <dl className="divide-y divide-slate-200 border-t border-slate-200 lg:border-t-0 lg:border-l lg:pl-8">
        {details.map(({ label, value }) => (
          <div key={label} className="py-3 first:pt-0">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
