import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Anchor,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Fish,
  Info,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
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
    { icon: Package, value: String(productCount), label: "Sản phẩm mở bán" },
    {
      icon: Star,
      value: vendor.ratingAverage.toFixed(1),
      suffix: `(${vendor.ratingCount} đánh giá)`,
      label: "Đánh giá thực tế",
    },
    { icon: Fish, value: String(categories.length), label: "Danh mục hải sản" },
    { icon: CalendarDays, value: joined, label: "Tham gia HaiSan Express" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-slate-500">
        <Link href="/" className="hover:text-[#0F3860]">Trang chủ</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        <Link href="/#trusted-vendors" className="hover:text-[#0F3860]">Gian hàng đối tác</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        <span className="truncate font-semibold text-[#0F3860]">{vendor.name}</span>
      </nav>

      {/* Hero: cover, logo, profile, actions, stats */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="relative h-44 bg-linear-to-r from-[#0F3860] to-[#1E3A8A] sm:h-60">
          {vendor.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-[#0F3860]/90 px-2.5 py-1 text-[11px] font-bold text-white">
            <Anchor className="h-3.5 w-3.5" />
            {vendor.district}
          </span>

          {/* On small screens the logo overlaps the banner, so the name moves below it. */}
          <h1 className="absolute bottom-4 left-44 right-4 hidden text-3xl font-black text-white drop-shadow sm:block">
            {vendor.name}
          </h1>
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="absolute -top-12 left-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#0F3860] text-white shadow-md sm:-top-16 sm:left-6 sm:h-32 sm:w-32">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-cover" />
            ) : (
              <Anchor className="h-10 w-10" />
            )}
          </div>

          <div className="flex flex-col gap-4 pt-14 sm:pt-3 sm:pl-40 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-xl font-black text-slate-900 sm:hidden">{vendor.name}</h1>
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#0F3860]/20 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-[#0F3860]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Đối tác Vựa Chuẩn HaiSan Express
                </span>
              )}
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{vendor.address}</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-[#0F3860]">Tham gia từ {joined}</span>
              </p>
              {vendor.phone && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{vendor.phone}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex h-10 items-center gap-2 rounded-lg bg-[#0F3860] px-4 text-xs font-bold text-white transition hover:bg-[#0A2744]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Liên hệ tư vấn
                </a>
              )}
              <VendorShareButton vendorName={vendor.name} />
            </div>
          </div>

          {isActive && (
            <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 sm:p-4 lg:grid-cols-4">
              {stats.map(({ icon: Icon, value, suffix, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-white p-3">
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-[#0F3860] sm:flex">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dd className="text-base font-black text-slate-900">
                      {value}
                      {suffix && <span className="ml-1 text-[11px] font-normal text-slate-500">{suffix}</span>}
                    </dd>
                    <dt className="text-[11px] text-slate-500">{label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {inactiveMessage && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h2 className="text-sm font-black">{inactiveMessage.title}</h2>
            <p className="text-xs text-amber-800">{inactiveMessage.description}</p>
            <Link href="/" className="inline-block pt-1 text-xs font-bold text-[#0F3860] hover:underline">
              ← Khám phá các vựa khác
            </Link>
          </div>
        </section>
      )}

      {isActive && (
        <>
          {/* Tabs */}
          <nav className="flex gap-6 overflow-x-auto border-b border-slate-200 text-sm">
            {[
              { tab: "products" as const, icon: LayoutGrid, label: `Tất cả sản phẩm (${productCount})` },
              { tab: "info" as const, icon: Info, label: "Giới thiệu & Bến cảng" },
            ].map(({ tab, icon: Icon, label }) => (
              <Link
                key={tab}
                href={buildStorefrontHref(vendor.slug, query, { tab, category: undefined, price: undefined })}
                scroll={false}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 font-bold transition ${
                  query.tab === tab
                    ? "border-[#0F3860] text-[#0F3860]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        {/* Categories */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Fish className="h-4 w-4 text-[#0F3860]" />
              Phân loại hải sản
            </h2>
            <span className="text-[11px] text-slate-400">{productCount} món</span>
          </div>
          <ul className="space-y-0.5 text-xs">
            {[{ slug: undefined, name: "Tất cả hải sản", count: productCount }, ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.productCount }))].map(
              (category) => {
                const active = query.category === category.slug;
                return (
                  <li key={category.slug ?? "all"}>
                    <Link
                      href={href({ category: category.slug })}
                      scroll={false}
                      className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
                        active ? "bg-sky-50 font-bold text-[#0F3860]" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className={active ? "" : "text-slate-400"}>{category.count}</span>
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </div>

        {/* Price range */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
            <Wallet className="h-4 w-4 text-[#0F3860]" />
            Khoảng giá (VND/Kg)
          </h2>
          <ul className="space-y-2 text-xs">
            {PRICE_RANGES.map((range) => {
              const active = query.price === range.key;
              return (
                <li key={range.key}>
                  <Link
                    href={href({ price: active ? undefined : range.key })}
                    scroll={false}
                    className="flex items-center gap-2 text-slate-600 hover:text-[#0F3860]"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        active ? "border-[#0F3860]" : "border-slate-300"
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-[#0F3860]" />}
                    </span>
                    <span className={active ? "font-bold text-[#0F3860]" : ""}>{range.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasFilters && (
            <Link
              href={href({ category: undefined, price: undefined })}
              scroll={false}
              className="mt-4 block rounded-md bg-sky-50 py-2 text-center text-xs font-bold text-[#0F3860] hover:bg-sky-100"
            >
              Đặt lại bộ lọc
            </Link>
          )}
        </div>

        {/* Platform commitment */}
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-black text-[#E63946]">
            <ShieldCheck className="h-4 w-4" />
            Cam kết HaiSan Express
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Đổi trả 1 đổi 1: hoàn tiền hoặc đổi mới nếu sản phẩm không đúng mô tả.
          </p>
          {vendor.phone && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#0F3860]">
              <Phone className="h-3.5 w-3.5" />
              Trực tiếp chủ vựa: {vendor.phone}
            </p>
          )}
        </div>
      </aside>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Danh sách hải sản tươi sống</h2>
            <p className="text-xs text-slate-500">
              Hiển thị {items.length} trong tổng số {totalItems} hải sản của {vendor.name}
            </p>
          </div>
          <StorefrontSortSelect
            value={query.sort}
            options={SORT_OPTIONS.map((option) => ({ ...option, href: href({ sort: option.key }) }))}
          />
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            {hasFilters
              ? "Không có sản phẩm nào khớp bộ lọc."
              : "Gian hàng chưa có sản phẩm đang bán."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <StorefrontProductCard
                key={product.id}
                product={product}
                vendorName={vendor.name}
                originLabel={vendor.district}
              />
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              Trang <span className="font-bold text-slate-800">{page}</span> trên {totalPages} ({totalItems} sản phẩm)
            </p>
            {totalPages > 1 && (
              <nav aria-label="Phân trang" className="flex items-center gap-1.5">
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
  const className = `flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${
    active
      ? "border-[#0F3860] bg-[#0F3860] text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  }`;

  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${className} opacity-40`}>
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
    { icon: MapPin, label: "Địa chỉ kho / bến", value: vendor.address },
    { icon: Anchor, label: "Khu vực", value: `${vendor.district}, ${vendor.province}` },
    { icon: Phone, label: "Điện thoại", value: vendor.phone },
    { icon: CalendarDays, label: "Tham gia HaiSan Express", value: joined },
    {
      icon: Star,
      label: "Đánh giá",
      value: `${vendor.ratingAverage.toFixed(1)} / 5 (${vendor.ratingCount} đánh giá)`,
    },
  ].filter((detail) => detail.value);

  return (
    <section className="grid grid-cols-1 gap-6 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="text-lg font-black text-slate-900">Giới thiệu {vendor.name}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {vendor.description || "Vựa chưa cập nhật phần giới thiệu."}
        </p>
      </div>
      <dl className="space-y-3 rounded-xl bg-slate-50 p-4">
        {details.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3860]" />
            <div>
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className="text-xs font-semibold text-slate-800">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
