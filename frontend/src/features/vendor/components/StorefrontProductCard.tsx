"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/features/cart/context/CartContext";
import { VendorStorefrontProduct } from "../types/vendor.types";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80";

interface StorefrontProductCardProps {
  product: VendorStorefrontProduct;
  vendorName: string;
  originLabel: string;
}

export function StorefrontProductCard({
  product,
  vendorName,
  originLabel,
}: StorefrontProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const href = `/products/${product.slug}`;
  const image = product.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
  const categoryLabel = product.categories[0]?.name;

  const handleAddToCart = () => {
    const result = addToCart({
      productId: product.id,
      productName: product.name,
      productImage: image,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      preparationOption: "Bơi sống (bao oxy)",
      vendorName,
      availableStock: product.stock,
    });

    if (result.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="relative block aspect-4/3 overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <span className="absolute top-2 left-2 rounded bg-[#0F3860] px-2 py-0.5 text-[10px] font-bold text-white">
          {originLabel}
        </span>

        {product.isFeatured ? (
          <span className="absolute bottom-2 left-2 rounded bg-[#E63946] px-2 py-0.5 text-[10px] font-bold text-white">
            Nổi bật
          </span>
        ) : (
          categoryLabel && (
            <span className="absolute bottom-2 left-2 rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800">
              {categoryLabel}
            </span>
          )
        )}

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

        {product.speciesName && (
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{product.speciesName}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="text-xs text-slate-500">
            <span className="text-base font-black text-[#E63946]">{formatPrice(product.price)}</span>
            {" "}/ {product.unit}
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
