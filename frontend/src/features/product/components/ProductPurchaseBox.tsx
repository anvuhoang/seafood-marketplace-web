"use client";

import { useState } from "react";
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
  Zap,
  Info,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

interface ProductPurchaseBoxProps {
  product: ProductDetail;
}

export function ProductPurchaseBox({ product }: ProductPurchaseBoxProps) {
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

  const isAvailable = product.inStock && !product.isDiscontinued && product.stock > 0;
  const maxStock = product.stock || 0;

  const handleQuantityChange = (delta: number) => {
    if (!isAvailable) return;
    const nextVal = Math.round((quantity + delta) * 10) / 10;
    if (nextVal >= 1 && nextVal <= maxStock) {
      setQuantity(nextVal);
      setActionFeedback(null);
    }
  };

  const handleAddToCart = async () => {
    if (!isAvailable) {
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
      price: product.price,
      quantity,
      unit: product.unit,
      preparationOption: selectedPrep,
      vendorName: product.vendor.name,
      availableStock: maxStock,
      isDiscontinued: product.isDiscontinued,
    });

    // 2. Call backend API asynchronously
    await addToCartBackendApi({
      offerId: product.id,
      quantity,
      preparationOption: selectedPrep,
    });

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
    window.location.href = "/customer/cart";
  };

  const calculatedTotal = product.price * quantity;

  return (
    <div className="space-y-5">
      {/* 1. Header Badges & Product SKU */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#0F3860] border border-sky-200">
          Hải sản Đảo Phú Quốc
        </span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-600">
          Mã: {product.sku || "SBD-TZ04-QSC"}
        </span>

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
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Tình trạng: Còn tươi sống (Bơi trong hồ)
          </span>
        )}
      </div>

      {/* 2. Product Name */}
      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
        {product.name}
      </h1>

      {/* 3. Rating & Sales Statistics */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1 font-bold text-amber-500">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm text-slate-900 font-extrabold">
            {product.reviewsSummary.ratingAverage.toFixed(1)}
          </span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="underline cursor-pointer hover:text-[#0F3860]">
          {product.reviewsSummary.reviewCount} Đánh giá thực tế người mua
        </span>
        <span className="text-slate-300">|</span>
        <span>{product.reviewsSummary.soldCount.toLocaleString()} Đã bán</span>
        <span className="text-slate-300">|</span>
        <span className="underline cursor-pointer hover:text-[#0F3860]">
          {product.reviewsSummary.questionCount} Câu hỏi (Hỏi đáp)
        </span>
      </div>

      {/* 4. Price Box */}
      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-black text-[#E63946] tracking-tight">
            {formatPrice(product.price)}
          </span>
          <span className="text-sm font-medium text-slate-500">
            / 1 {product.unit}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
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
        <div className="space-y-1.5 border-t border-rose-100/80 pt-3 text-xs text-slate-600">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              Cam kết cân đúng tươi sống tại vựa, tặng thùng xốp oxy muối kèm đá gel giữ nhiệt.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
            <span>
              Được hoàn tiền x2 nếu giao hàng sai trọng lượng hoặc tôm chết ươn.
            </span>
          </p>
        </div>
      </div>

      {/* 5. Seafood Preparation Selection */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Khối lượng mua ({product.unit}):
          </label>
          {isAvailable ? (
            <span className="text-xs font-semibold text-emerald-600">
              Còn <strong>{maxStock} {product.unit}</strong> có sẵn tại hồ vựa Phú Quốc
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-600">
              {product.isDiscontinued ? "Ngừng kinh doanh" : "Tạm hết hàng trong kho"}
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

          {/* Estimation note */}
          <span className="text-xs text-slate-500">
            Tương đương ước tính: <strong>{15 * quantity} - {20 * quantity} con</strong>
          </span>
        </div>
      </div>

      {/* 7. Total Price Preview */}
      <div className="flex items-baseline justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200/80">
        <span className="text-xs font-bold text-slate-600 uppercase">
          Tổng tiền tạm tính:
        </span>
        <span className="text-2xl font-black text-[#0F3860]">
          {formatPrice(calculatedTotal)}
        </span>
      </div>

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
          className="flex items-center justify-center gap-2 rounded-xl bg-[#E63946] py-3.5 px-4 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#D62839] hover:shadow-lg hover:shadow-red-500/25 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Thêm vào Giỏ Hàng</span>
        </button>

        <button
          type="button"
          disabled={!isAvailable || isSubmitting}
          onClick={handleBuyNow}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3.5 px-4 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#0A2744] hover:shadow-lg hover:shadow-blue-950/25 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>Mua Ngay - Giao 2 Giờ</span>
        </button>
      </div>

      {/* Decision support link */}
      <div className="text-center">
        <button
          type="button"
          onClick={() =>
            alert(
              "Chính sách bảo hành: Khi shipper giao đến, bạn được mở thùng xốp kiểm tra tôm sống trước khi thanh toán. Nếu không hài lòng có thể từ chối nhận hàng không mất phí."
            )
          }
          className="text-xs font-semibold text-[#0F3860] hover:underline"
        >
          ✦ Hỗ trợ Trả Lại & Quyết Định Nhanh Khi Giao Hàng Cho Bạn
        </button>
      </div>

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
            Chuẩn HACCP & ATTP
          </h5>
          <p className="text-[10px] text-slate-400">Đầy đủ giấy kiểm định</p>
        </div>
      </div>
    </div>
  );
}
