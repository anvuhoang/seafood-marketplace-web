"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";
import { useCart } from "@/features/cart/context/CartContext";
import { useMyStoreSlug } from "../hooks/useMyStoreSlug";
import { VendorStorefrontProduct } from "../types/vendor.types";

interface StorefrontProductCardProps {
  product: VendorStorefrontProduct;
  vendorName: string;
  /** Slug of the storefront this card is on, to tell the owner apart from visitors. */
  vendorSlug: string;
  originLabel: string;
}

export function StorefrontProductCard({ product, vendorName, vendorSlug, originLabel }: StorefrontProductCardProps) {
  const { addToCart } = useCart();
  // An owner looking at their own store cannot buy from it; see HideForStoreOwner.
  const isOwnProduct = useMyStoreSlug() === vendorSlug;
  const [justAdded, setJustAdded] = useState(false);

  const href = `/products/${product.slug}`;
  const image = product.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
  const category = product.categories[0]?.name;

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
    <article className="group flex h-full flex-col">
      <Link href={href} className="relative block aspect-4/3 overflow-hidden rounded-xl bg-slate-100">
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

      <div className="flex flex-1 flex-col pt-3">
        {category && <p className="text-xs text-slate-500">{category}</p>}
        <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2 group-hover:text-[#0F3860]">
          <Link href={href}>{product.name}</Link>
        </h3>
        <p className="mt-1 text-xs text-slate-500">{originLabel}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="text-sm text-slate-500">
            <span className="text-base font-bold text-[#D62839]">{formatPrice(product.price)}</span>
            <span className="ml-0.5">/{product.unit}</span>
          </p>
          {isOwnProduct ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Sản phẩm của bạn
            </span>
          ) : (
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
          )}
        </div>
      </div>
    </article>
  );
}
