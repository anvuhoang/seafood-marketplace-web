import Link from "next/link";
import { ShoppingCart, MapPin } from "lucide-react";
import { Product } from "../data/home.mock";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case "red":
        return "bg-rose-500 text-white";
      case "cyan":
        return "bg-sky-500 text-white";
      case "amber":
        return "bg-amber-500 text-white";
      case "green":
        return "bg-emerald-600 text-white";
      case "blue":
      default:
        return "bg-[#0F3860] text-white";
    }
  };

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50">
      <div>
        {/* Product Image & Badges */}
        <Link href={`#product-${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badge: Phổ biến / Bán chạy... */}
          {product.badge && (
            <span
              className={`absolute top-3 left-3 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-sm ${getBadgeStyle(
                product.badgeType
              )}`}
            >
              {product.badge}
            </span>
          )}

          {/* Origin Tag pill at bottom left */}
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-xs">
            {product.originDetail}
          </span>
        </Link>

        {/* Content details */}
        <div className="p-4">
          {/* Shop / Vendor info */}
          <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{product.shopName}</span>
          </p>

          {/* Title */}
          <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug line-clamp-2 transition-colors group-hover:text-[#0F3860]">
            <Link href={`#product-${product.id}`}>
              {product.name}
            </Link>
          </h3>

          {/* Note / Subtitle */}
          <p className="mt-1 text-xs text-slate-500 italic truncate">
            {product.note}
          </p>
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="border-t border-slate-100 p-4 pt-3 bg-slate-50/50">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-extrabold text-[#E63946]">
            {formatPrice(product.price)}
          </span>
          <span className="text-xs font-normal text-slate-400">
            / {product.unit}
          </span>
        </div>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E63946] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#D62839] active:scale-98"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Thêm vào giỏ</span>
        </button>
      </div>
    </article>
  );
}
