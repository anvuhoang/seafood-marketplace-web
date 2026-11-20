"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, LogIn, RefreshCw, ShieldCheck, ShoppingCart, Zap } from "lucide-react";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CartLineRow } from "@/features/cart/components/CartLineRow";
import { useCart } from "@/features/cart/context/CartContext";
import { formatPrice } from "@/lib/utils";

export default function CustomerCartPage() {
  const {
    items,
    itemCount,
    totalPrice,
    hasProblems,
    isSignedIn,
    isLoading,
    loadError,
    isBusy,
    updateQuantity,
    removeItem,
    clearCart,
    refresh,
  } = useCart();

  const handleClear = () => {
    if (window.confirm("Xóa tất cả sản phẩm khỏi giỏ hàng?")) void clearCart();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/40">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-white">
              <ShoppingCart className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Giỏ hàng ({itemCount} món)</h1>
              <p className="text-xs text-slate-400">Giá và tồn kho được cập nhật từ vựa mỗi lần bạn mở giỏ hàng</p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isBusy}
              className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-40"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {isLoading ? (
          <p
            role="status"
            className="flex min-h-48 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500"
          >
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
            Đang tải giỏ hàng...
          </p>
        ) : loadError ? (
          <div role="alert" className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" aria-hidden />
            <p className="text-sm text-rose-900">{loadError}</p>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A2744]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800">Giỏ hàng của bạn đang trống</h2>
              <p className="text-xs text-slate-500">Hãy khám phá các loại hải sản tươi sống mới về hôm nay!</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744]"
            >
              <span>Xem hải sản</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <ul className="space-y-3 lg:col-span-8" aria-label="Sản phẩm trong giỏ hàng">
              {items.map((item) => (
                <CartLineRow key={item.offerId} item={item} busy={isBusy} onQuantityChange={updateQuantity} onRemove={removeItem} />
              ))}
            </ul>

            <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4" aria-label="Tóm tắt đơn hàng">
              <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">Tóm tắt đơn hàng</h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền hàng ({itemCount} món):</span>
                  <span className="font-bold text-slate-800">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí giao hàng:</span>
                  <span className="text-slate-500">Tính ở bước đặt hàng</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-900">Tạm tính:</span>
                  <span className="text-lg font-bold text-[#E63946]">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              {hasProblems && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Có sản phẩm không thể mua như hiện tại và chưa được tính vào tổng tiền.
                </p>
              )}

              {isSignedIn ? (
                <>
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3 text-xs font-bold text-white opacity-50"
                  >
                    <Zap className="h-4 w-4" aria-hidden />
                    <span>Tiến hành đặt hàng</span>
                  </button>
                  <p className="text-center text-[11px] text-slate-400">Chức năng đặt hàng đang được hoàn thiện.</p>
                </>
              ) : (
                <>
                  <Link
                    href="/customer/login?redirect=/customer/cart"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744]"
                  >
                    <LogIn className="h-4 w-4" aria-hidden />
                    <span>Đăng nhập để đặt hàng</span>
                  </Link>
                  <p className="text-center text-[11px] text-slate-400">
                    Giỏ hàng của bạn được giữ lại và gộp vào tài khoản sau khi đăng nhập.
                  </p>
                </>
              )}

              <div className="space-y-1 rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-900">
                <div className="flex items-center gap-1 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                  <span>Chính sách kiểm hàng tại chỗ:</span>
                </div>
                <p className="leading-relaxed text-emerald-800/90">
                  Quý khách được mở thùng xốp kiểm tra tôm còn bơi sống trước khi trả tiền. Đền bù gấp đôi nếu tôm ngợp ươn.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
