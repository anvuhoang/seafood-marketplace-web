"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MapPin, ShoppingCart, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";
import { useCart } from "@/features/cart/context/CartContext";
import { ProductListingItem } from "../types/catalog.types";
import type { ViewMode } from "../utils/catalog-query";

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
      className={`group flex overflow-hidden rounded-xl border border-slate-200 bg-white transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_32px_-16px_rgba(15,23,42,0.3)] ${
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
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {product.isFeatured && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-[#C62835]">
            Nổi bật
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold text-slate-700">
            Tạm hết hàng
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {product.vendor.district}
        </p>
        <h3 className="mt-1 text-sm leading-snug font-semibold text-slate-900 line-clamp-2 group-hover:text-[#0F3860] sm:text-[15px]">
          <Link href={href}>{product.name}</Link>
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{subtitle}</p>}
        <Link
          href={`/vendor/${product.vendor.slug}`}
          className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-[#0F3860]"
        >
          <Store className="h-3 w-3 shrink-0" />
          <span className="truncate">{product.vendor.name}</span>
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="text-xs text-slate-500">
            <span className="text-base font-bold text-[#D62839] sm:text-lg">{formatPrice(product.price)}</span>
            <span className="ml-0.5">/{product.unit}</span>
          </p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 ${
              justAdded
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 text-[#0F3860] hover:border-[#0F3860] hover:bg-[#0F3860] hover:text-white"
            }`}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}
