"use client";

import Link from "next/link";
import { ShoppingCart, MapPin, Check } from "lucide-react";
import { Product } from "../data/home.mock";
import { formatPrice } from "@/lib/utils";
import { TiltCard } from "@/components/ui/TiltCard";
import { useCart } from "@/features/cart/context/CartContext";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const fallbackIdentifier =
    product.id === "prod-1" ? "tom-su-bien-tuoi-song-loai-1" : product.id;
  const productHref = `/products/${product.slug ?? fallbackIdentifier}`;

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      preparationOption: "Bơi sống (bao oxy)",
      vendorName: product.shopName,
      availableStock: product.inStock ? 14 : 0,
      isDiscontinued: !product.inStock,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case "red":
        return "bg-rose-500 text-white shadow-sm shadow-rose-500/30";
      case "cyan":
        return "bg-sky-500 text-white shadow-sm shadow-sky-500/30";
      case "amber":
        return "bg-amber-500 text-white shadow-sm shadow-amber-500/30";
      case "green":
        return "bg-emerald-600 text-white shadow-sm shadow-emerald-500/30";
      case "blue":
      default:
        return "bg-[#0F3860] text-white shadow-sm shadow-blue-950/30";
    }
  };

  return (
    <TiltCard maxTilt={6} scale={1.02} className="h-full rounded-2xl">
      <article className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-300/60 preserve-3d">
        <div>
          {/* Product Image & Badges */}
          <Link
            href={productHref}
            className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />

            {/* Badge: Phổ biến / Bán chạy with 3D Depth Layer */}
            {product.badge && (
              <span
                style={{ transform: "translateZ(26px)" }}
                className={`absolute top-3 left-3 rounded-md px-2.5 py-1 text-[11px] font-bold ${getBadgeStyle(
                  product.badgeType
                )}`}
              >
                {product.badge}
              </span>
            )}

            {/* Origin Tag pill at bottom left with 3D Depth */}
            <span
              style={{ transform: "translateZ(22px)" }}
              className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-xs"
            >
              {product.originDetail}
            </span>
          </Link>

          {/* Content details */}
          <div className="p-4">
            {/* Shop / Vendor info */}
            <p
              style={{ transform: "translateZ(12px)" }}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400"
            >
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{product.shopName}</span>
            </p>

            {/* Title */}
            <h3
              style={{ transform: "translateZ(16px)" }}
              className="mt-1.5 text-sm font-bold text-slate-900 leading-snug line-clamp-2 transition-colors group-hover:text-[#0F3860]"
            >
              <Link href={productHref}>
                {product.name}
              </Link>
            </h3>

            {/* Note / Subtitle */}
            <p
              style={{ transform: "translateZ(10px)" }}
              className="mt-1 text-xs text-slate-500 italic truncate"
            >
              {product.note}
            </p>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div
          style={{ transform: "translateZ(20px)" }}
          className="border-t border-slate-100 p-4 pt-3 bg-slate-50/50"
        >
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
            onClick={handleAddToCart}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 active:translate-y-0.5 ${
              justAdded
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#E63946] hover:bg-[#D62839] hover:shadow-md hover:shadow-red-500/25"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Đã thêm vào giỏ!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                <span>Thêm vào giỏ</span>
              </>
            )}
          </button>
        </div>
      </article>
    </TiltCard>
  );
}
