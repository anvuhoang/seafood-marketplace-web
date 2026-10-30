import Link from "next/link";
import { Anchor, MapPin, Phone, ShieldCheck, Star, AlertTriangle } from "lucide-react";
import { ProductCard } from "@/features/home/components/ProductCard";
import { Product } from "@/features/home/data/home.mock";
import { VendorStorefront, VendorStorefrontProduct } from "../types/vendor.types";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80";

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

function toProductCard(
  product: VendorStorefrontProduct,
  storefront: VendorStorefront,
): Product {
  const { vendor } = storefront;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.categories[0]?.slug ?? "",
    origin: vendor.province,
    originDetail: vendor.district,
    shopName: vendor.name,
    badge: product.isFeatured ? "Nổi bật" : undefined,
    badgeType: product.isFeatured ? "red" : undefined,
    note: product.speciesName ?? "",
    price: product.price,
    unit: product.unit,
    image: product.imageUrl ?? FALLBACK_PRODUCT_IMAGE,
    inStock: product.inStock,
  };
}

interface VendorStorefrontViewProps {
  storefront: VendorStorefront;
  activeCategory?: string;
}

export function VendorStorefrontView({
  storefront,
  activeCategory,
}: VendorStorefrontViewProps) {
  const { vendor, status, isActive, productCount, categories, products } = storefront;
  const visibleProducts = products.map((product) => toProductCard(product, storefront));
  const inactiveMessage = isActive
    ? null
    : INACTIVE_STATUS_MESSAGES[status as keyof typeof INACTIVE_STATUS_MESSAGES];

  return (
    <div className="space-y-8">
      {/* Banner & profile */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#0F3860] to-[#1E3A8A] text-white shadow-lg">
        {vendor.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}

        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-[#0F3860] shadow-md">
              {vendor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendor.logoUrl} alt={vendor.name} className="h-full w-full object-cover" />
              ) : (
                <Anchor className="h-10 w-10" />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black">{vendor.name}</h1>
                {isActive && (
                  <span className="flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Đối tác vựa chuẩn xanh
                  </span>
                )}
              </div>

              <p className="flex items-center gap-1 text-xs text-slate-200">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                <span>{vendor.address}</span>
              </p>

              {vendor.phone && (
                <p className="flex items-center gap-1 text-xs text-slate-200">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  <span>{vendor.phone}</span>
                </p>
              )}

              {vendor.description && (
                <p className="max-w-2xl pt-1 text-xs text-slate-300">{vendor.description}</p>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-6 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xs">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-black text-amber-300">
                  <Star className="h-4 w-4 fill-amber-300" />
                  {vendor.ratingAverage.toFixed(1)}
                </div>
                <div className="text-[11px] text-slate-300">{vendor.ratingCount} đánh giá</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-cyan-300">{productCount}</div>
                <div className="text-[11px] text-slate-300">Sản phẩm đang bán</div>
              </div>
            </div>
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Category filter */}
          <aside className="space-y-3 lg:col-span-1">
            <h2 className="text-sm font-black text-slate-900">Phân loại hải sản</h2>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có danh mục.</p>
            ) : (
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/vendor/${vendor.slug}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${
                      !activeCategory ? "bg-[#0F3860] text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Tất cả</span>
                    <span>{productCount}</span>
                  </Link>
                </li>
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/vendor/${vendor.slug}?category=${encodeURIComponent(category.slug)}`}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${
                        activeCategory === category.slug
                          ? "bg-[#0F3860] text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{category.name}</span>
                      <span>{category.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Product grid */}
          <section className="space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                Hải sản của gian hàng ({visibleProducts.length})
              </h2>
            </div>

            {visibleProducts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                {activeCategory
                  ? "Không có sản phẩm nào trong danh mục này."
                  : "Gian hàng chưa có sản phẩm đang bán."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
