"use client";

import Link from "next/link";
import { RelatedProductItem } from "../types/product.types";
import { useCart } from "@/features/cart/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { ChevronRight, Plus, Check } from "lucide-react";
import { useState } from "react";

interface RelatedVendorProductsProps {
  products: RelatedProductItem[];
  vendorName: string;
  vendorSlug: string;
}

export function RelatedVendorProducts({
  products,
  vendorName,
  vendorSlug,
}: RelatedVendorProductsProps) {
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleQuickAdd = (p: RelatedProductItem) => {
    addToCart({
      productId: p.id,
      productName: p.name,
      productImage: p.image,
      price: p.price,
      quantity: 1,
      unit: p.unit,
      preparationOption: "Tiêu chuẩn đóng oxy",
      vendorName: vendorName,
      availableStock: 20,
    });

    setAddedIds((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [p.id]: false }));
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Sản Phẩm Tươi Khác Từ {vendorName}
          </h2>
          <p className="text-xs text-slate-400">
            Giao cùng chuyến xe, tiết kiệm tối đa cước phí vận chuyển thùng oxy
          </p>
        </div>

        <Link
          href={`/vendor/${vendorSlug}`}
          className="flex items-center gap-1 text-xs font-bold text-[#0F3860] hover:underline"
        >
          <span>Xem tất cả 28 sản phẩm của vựa</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-lg"
          >
            <div>
              {/* Product Image */}
              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {item.badge && (
                  <span className="absolute top-2 left-2 rounded-md bg-[#0F3860] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Title & Tag */}
              <div className="mt-3 space-y-1">
                {item.tag && (
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {item.tag}
                  </p>
                )}
                <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#0F3860]">
                  {item.name}
                </h3>
              </div>
            </div>

            {/* Price & Quick Add Button */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-[#E63946]">
                  {formatPrice(item.price)}
                </span>
                <span className="text-[10px] text-slate-400">/ {item.unit}</span>
              </div>

              <button
                type="button"
                onClick={() => handleQuickAdd(item)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 ${
                  addedIds[item.id]
                    ? "bg-emerald-600 text-white"
                    : "bg-sky-50 text-[#0F3860] hover:bg-[#0F3860] hover:text-white"
                }`}
                title="Thêm nhanh vào giỏ"
              >
                {addedIds[item.id] ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
