"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProductListing } from "@/features/catalog/api/catalog.api";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import type { ProductListingItem } from "@/features/catalog/types/catalog.types";
import { useCart } from "../context/CartContext";

const HOW_MANY = 4;

/** Featured products that are in stock and not in the cart yet. Hidden when none can be loaded. */
export function CartSuggestions() {
  const { items } = useCart();
  const [products, setProducts] = useState<ProductListingItem[]>([]);

  useEffect(() => {
    let current = true;
    getProductListing({ q: "", categories: [], regions: [], vendors: [], inStock: true, sort: "featured", page: 1, view: "grid" })
      .then((listing) => current && setProducts(listing.items))
      .catch(() => undefined); // Suggestions are a nicety: no error is shown when they cannot load.
    return () => {
      current = false;
    };
  }, []);

  const inCart = new Set(items.map((item) => item.offerId));
  const shown = products.filter((product) => !inCart.has(product.offerId)).slice(0, HOW_MANY);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="cart-suggestions-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="cart-suggestions-title" className="text-base font-bold text-slate-900">
            Gợi ý mua kèm tươi ngon
          </h2>
          <p className="text-xs text-slate-500">Hải sản đang có hàng, được nhiều khách chọn.</p>
        </div>
        <Link href="/products" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0F3860] hover:underline">
          Xem thêm hải sản
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {shown.map((product) => (
          <CatalogProductCard key={product.id} product={product} view="grid" />
        ))}
      </div>
    </section>
  );
}
