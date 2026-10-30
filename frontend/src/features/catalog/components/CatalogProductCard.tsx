"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MapPin, ShoppingCart, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/features/cart/context/CartContext";
import { ProductListingItem } from "../types/catalog.types";
import type { ViewMode } from "../utils/catalog-query";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80";

interface CatalogProductCardProps {
  product: ProductListingItem;
  view: ViewMode;
}

export function CatalogProductCard({ product, view }: CatalogProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // Product detail resolves products by UUID.
  const href = `/products/${product.id}`;
  const image = product.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
  const badge = product.isFeatured ? "Nổi bật" : product.categories[0]?.name;
  const subtitle = product.speciesName ?? product.description;

  const handleAddToCart = () => {
    const result = addToCart({
      productId: product.id,
      productName: product.name,
      productImage: image,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      preparationOption: "Bơi sống (bao oxy)",
      vendorName: product.vendor.name,
      availableStock: product.stock,
    });

    if (result.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const isList = view === "list";

  return (
    <article
      className={`group flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg ${
        isList ? "flex-row" : "h-full flex-col"
      }`}
    >
      <Link
        href={href}
        className={`relative block shrink-0 overflow-hidden bg-slate-100 ${
          isList ? "w-36 sm:w-56" : "aspect-4/3"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {badge && (
          <span
            className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold text-white ${
              product.isFeatured ? "bg-[#E63946]" : "bg-[#0F3860]"
            }`}
          >
            {badge}
          </span>
        )}
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
          <MapPin className="h-3 w-3" />
          {product.vendor.district}
        </span>
        {!product.inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-xs font-bold text-white">
            Tạm hết hàng
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-[#0F3860]">
          <Link href={href}>{product.name}</Link>
        </h3>
        {subtitle && <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{subtitle}</p>}
        <Link
          href={`/vendor/${product.vendor.slug}`}
          className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0F3860]"
        >
          <Store className="h-3 w-3 shrink-0" />
          <span className="truncate">{product.vendor.name}</span>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="text-xs text-slate-500">
            <span className="block text-base font-black text-[#E63946]">{formatPrice(product.price)}</span>
            / {product.unit}
          </p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 ${
              justAdded ? "bg-emerald-600" : "bg-[#E63946] hover:bg-[#D62839]"
            }`}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
