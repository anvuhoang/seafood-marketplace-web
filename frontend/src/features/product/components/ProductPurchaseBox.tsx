"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductDetail } from "../types/product.types";
import { useCart } from "@/features/cart/context/CartContext";
import { addToCartBackendApi } from "../api/product.api";
import { formatPrice } from "@/lib/utils";
import {
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";

interface ProductPurchaseBoxProps {
  product: ProductDetail;
}

export function ProductPurchaseBox({ product }: ProductPurchaseBoxProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedPrep, setSelectedPrep] = useState<string>(
    product.preparationOptions.find((o) => o.isDefault)?.label ||
      product.preparationOptions[0]?.label ||
      "Bơi sống (bao oxy)"
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // null when no approved vendor sells it; never treated as a price of 0.
  const price = product.price;
  const isAvailable =
    product.inStock &&
    !product.isDiscontinued &&
    product.stock > 0 &&
    product.offerId !== null &&
    price !== null;
  const maxStock = product.stock || 0;
  const { reviewsSummary, vendor } = product;

  const handleQuantityChange = (delta: number) => {
    if (!isAvailable) return;
    const nextVal = Math.round((quantity + delta) * 10) / 10;
    if (nextVal >= 1 && nextVal <= maxStock) {
      setQuantity(nextVal);
      setActionFeedback(null);
    }
  };

  const handleAddToCart = async () => {
    if (!isAvailable || price === null) {
      setActionFeedback({
        type: "error",
        text: "Sản phẩm hiện không khả dụng để thêm vào giỏ hàng.",
      });
      return;
    }

    if (quantity > maxStock) {
      setActionFeedback({
        type: "error",
        text: `Số lượng vượt quá số lượng còn lại trong kho (${maxStock} ${product.unit}).`,
      });
      return;
    }

    setIsSubmitting(true);
    // 1. Call context to update client-side cart
    const contextResult = addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.imageUrl || "",
      price,
      quantity,
      unit: product.unit,
      preparationOption: selectedPrep,
      vendorName: vendor?.name ?? "",
      availableStock: maxStock,
      isDiscontinued: product.isDiscontinued,
    });

    // 2. Call backend API asynchronously with the offer being sold
    if (product.offerId) {
      await addToCartBackendApi({
        offerId: product.offerId,
        quantity,
        preparationOption: selectedPrep,
      });
    }

    setIsSubmitting(false);
    if (contextResult.success) {
      setActionFeedback({
        type: "success",
        text: `Đã thêm ${quantity} ${product.unit} vào giỏ hàng thành công!`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({
        type: "error",
        text: contextResult.message,
      });
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    router.push("/customer/cart");
  };

  const calculatedTotal = price === null ? null : price * quantity;

  return (
    <div className="space-y-5">
      {/* 1. Header Badges & Product SKU */}
      <div className="flex flex-wrap items-center gap-2">
        {vendor && (
          <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#0F3860] border border-sky-200">
            Hải sản {vendor.district}
          </span>
        )}
        {product.sku && (
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Mã: {product.sku}
          </span>
        )}

        {/* Dynamic Availability Status Indicator */}
        {product.isDiscontinued ? (
          <span className="flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            Tình trạng: Ngừng kinh doanh
          </span>
        ) : product.stock <= 0 ? (
          <span className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Tình trạng: Tạm hết hàng
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Tình trạng: Còn hàng
          </span>
        )}
      </div>

      {/* 2. Product Name */}
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
        {product.name}
      </h1>

      {/* 3. Rating & Sales Statistics */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {reviewsSummary.reviewCount > 0 ? (
          <>
            <div className="flex items-center gap-1 font-bold text-amber-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm text-slate-900 font-extrabold">
                {reviewsSummary.ratingAverage.toFixed(1)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <a href="#product-reviews" className="underline hover:text-[#0F3860]">
              {reviewsSummary.reviewCount} đánh giá từ người mua
            </a>
          </>
        ) : (
          <span>Chưa có đánh giá</span>
        )}
      </div>

      {/* 4. Price Box */}
      <div className="rounded-xl bg-slate-50 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-baseline gap-3">
          {price !== null ? (
            <>
              <span className="text-3xl font-bold text-[#E63946] tracking-tight">
                {formatPrice(price)}
              </span>
              <span className="text-sm font-medium text-slate-500">
                / 1 {product.unit}
              </span>
            </>
          ) : (
            // No approved vendor sells it, so there is no price to show.
            <span className="text-xl font-bold text-slate-500">Chưa có giá bán</span>
          )}
          {price !== null && product.originalPrice && product.originalPrice > price && (
            <>
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
              <span className="rounded-full bg-[#E63946] px-2.5 py-0.5 text-xs font-bold text-white">
                -{product.discountPercent}% Giảm Giá
              </span>
            </>
          )}
        </div>

        {/* Guarantees */}
        <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>Đóng thùng xốp oxy/đá gel chuyên dụng giữ tươi khi vận chuyển.</span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
            <span>Đổi trả 1 đổi 1: hoàn tiền hoặc đổi mới nếu sản phẩm không đúng mô tả.</span>
          </p>
        </div>
      </div>

      {/* 5. Seafood Preparation Selection */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-700">
          Lựa chọn sơ chế trước khi giao:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {product.preparationOptions.map((opt) => {
            const isSelected = selectedPrep === opt.label;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPrep(opt.label)}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[#0F3860] bg-sky-50/50 shadow-xs ring-2 ring-[#0F3860]/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    isSelected ? "text-[#0F3860]" : "text-slate-800"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Quantity Selection & Stock Enforcements */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            Khối lượng mua ({product.unit}):
          </label>
          {isAvailable ? (
            <span className="text-xs font-semibold text-emerald-600">
              Còn <strong>{maxStock} {product.unit}</strong>
              {vendor ? ` tại ${vendor.name}` : ""}
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-600">
              {product.isDiscontinued
                ? "Ngừng kinh doanh"
                : product.offerId
                  ? "Tạm hết hàng trong kho"
                  : "Hiện chưa có vựa mở bán"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Stepper */}
          <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1 shadow-2xs">
            <button
              type="button"
              disabled={!isAvailable || quantity <= 1}
              onClick={() => handleQuantityChange(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxStock}
              value={quantity}
              readOnly
              className="w-14 text-center text-sm font-bold text-slate-800 outline-none"
            />
            <button
              type="button"
              disabled={!isAvailable || quantity >= maxStock}
              onClick={() => handleQuantityChange(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          {product.sizeLabel && (
            <span className="text-xs text-slate-500">
              Quy cách: <strong>{product.sizeLabel}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 7. Total Price Preview */}
      {isAvailable && calculatedTotal !== null && (
        <div className="flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200/80">
          <span className="text-sm font-medium text-slate-600">
            Tổng tiền tạm tính:
          </span>
          <span className="text-2xl font-bold text-[#0F3860]">
            {formatPrice(calculatedTotal)}
          </span>
        </div>
      )}

      {/* Action Feedback Alert */}
      {actionFeedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold animate-slide-up ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* 8. Purchase CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!isAvailable || isSubmitting}
          onClick={handleAddToCart}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#E63946] py-3.5 px-4 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#D62839] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Thêm vào giỏ hàng</span>
        </button>

        <button
          type="button"
          disabled={!isAvailable || isSubmitting}
          onClick={handleBuyNow}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 px-4 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#0A2744] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Mua ngay</span>
        </button>
      </div>

      {/* Delivery check policy, expanded inline instead of a browser alert. */}
      <details className="group rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700 marker:text-slate-400">
          Được kiểm hàng trước khi thanh toán
        </summary>
        <p className="mt-2 leading-relaxed text-slate-600">
          Khi nhận hàng, bạn được mở thùng kiểm tra hải sản trước khi thanh toán. Nếu không hài lòng, bạn có thể từ chối
          nhận mà không mất phí.
        </p>
      </details>

      {/* 9. Three Trust Badges */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
        <div className="p-2">
          <Sparkles className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
          <h5 className="text-[11px] font-bold text-slate-900">
            Cam kết 100% tươi sống
          </h5>
          <p className="text-[10px] text-slate-400">Bao bơi, bao ăn tận nơi</p>
        </div>
        <div className="p-2">
          <Clock className="mx-auto h-5 w-5 text-sky-600 mb-1" />
          <h5 className="text-[11px] font-bold text-slate-900">
            Giao nhanh 2 giờ
          </h5>
          <p className="text-[10px] text-slate-400">Nội thành, giữ lạnh sống</p>
        </div>
        <div className="p-2">
          <ShieldCheck className="mx-auto h-5 w-5 text-amber-600 mb-1" />
          <h5 className="text-[11px] font-bold text-slate-900">
            Đổi trả 1 đổi 1
          </h5>
          <p className="text-[10px] text-slate-400">Khi không đúng mô tả</p>
        </div>
      </div>
    </div>
  );
}
