"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight, Headset, Loader2, LogIn, RefreshCw, ShieldCheck, ShoppingCart, Trash2, Zap } from "lucide-react";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CartSuggestions } from "@/features/cart/components/CartSuggestions";
import { CartVendorGroup } from "@/features/cart/components/CartVendorGroup";
import { useCart } from "@/features/cart/context/CartContext";
import type { CartItemView } from "@/features/cart/types/cart.types";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";
import { formatPrice } from "@/lib/utils";

export default function CustomerCartPage() {
  const {
    items,
    vendors,
    itemCount,
    hasProblems,
    isSignedIn,
    isLoading,
    loadError,
    isBusy,
    updateQuantity,
    removeItem,
    removeItems,
    refresh,
  } = useCart();

  // Lines are ticked unless the customer unticked them, so a line added later starts ticked.
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const buyable = items.filter((item) => item.available);
  const selected = buyable.filter((item) => !unticked.has(item.offerId));
  const selectedIds = new Set(selected.map((item) => item.offerId));
  const allSelected = buyable.length > 0 && selected.length === buyable.length;
  // The sum of the lines' totals as the server worked them out, added in whole hundredths so it never drifts.
  const selectedTotal = selected.reduce((sum, item) => sum + Math.round(item.subtotal * 100), 0) / 100;

  const tick = (lines: CartItemView[], checked: boolean) =>
    setUnticked((current) => {
      const next = new Set(current);
      for (const line of lines) {
        if (checked) next.delete(line.offerId);
        else next.add(line.offerId);
      }
      return next;
    });

  const removeSelected = () => {
    if (selected.length > 0 && window.confirm(`Xóa ${selected.length} sản phẩm đã chọn khỏi giỏ hàng?`)) void removeItems(selected);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/40">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            Trang chủ
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="font-semibold text-slate-800">Giỏ hàng của bạn</span>
        </nav>

        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-white">
            <ShoppingCart className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Giỏ hàng của bạn</h1>
            <p className="text-xs text-slate-500">
              {itemCount > 0 ? `${itemCount} món từ ${vendors.length} vựa đối tác · ` : ""}Giá và tồn kho được cập nhật từ vựa mỗi lần bạn mở giỏ hàng
            </p>
          </div>
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
              <p className="text-xs text-slate-500">Hải sản tươi sống từ các vựa sẽ xuất hiện ở đây khi bạn thêm vào.</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744]"
            >
              <span>Tiếp tục khám phá hải sản</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={isBusy || buyable.length === 0}
                    onChange={(event) => tick(buyable, event.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[#0F3860]"
                  />
                  Chọn tất cả ({buyable.length} sản phẩm)
                </label>
                <button
                  type="button"
                  onClick={removeSelected}
                  disabled={isBusy || selected.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Xóa mục đã chọn
                </button>
              </div>

              {vendors.map((group) => (
                <CartVendorGroup
                  key={group.vendor.id}
                  group={group}
                  items={items.filter((item) => item.vendor.id === group.vendor.id)}
                  selectedOfferIds={selectedIds}
                  busy={isBusy}
                  onToggleVendor={tick}
                  onToggleLine={(item, checked) => tick([item], checked)}
                  onQuantityChange={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            <aside className="h-fit space-y-4 lg:sticky lg:top-24 lg:col-span-4" aria-label="Thông tin thanh toán">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">Thông tin thanh toán</h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Tạm tính hàng ({selected.length} sản phẩm):</span>
                    <span className="font-bold text-slate-800">{formatPrice(selectedTotal)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-bold text-slate-900">Tổng cộng:</span>
                    <span className="text-xl font-bold text-[#E63946]">{formatPrice(selectedTotal)}</span>
                  </div>
                </div>

                {hasProblems && (
                  <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Có sản phẩm không thể mua như hiện tại; chúng không được chọn và không tính vào tổng tiền.
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
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-xs">
                <Headset className="mt-0.5 h-5 w-5 shrink-0 text-[#0F3860]" aria-hidden />
                <div>
                  <p className="font-bold text-slate-900">Cần tư vấn chọn hải sản sống?</p>
                  <p>
                    Hotline:{" "}
                    <a href={`tel:${SUPPORT_HOTLINE.tel}`} className="font-bold text-[#0F3860] hover:underline">
                      {SUPPORT_HOTLINE.display}
                    </a>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {!isLoading && !loadError && <CartSuggestions />}
      </main>

      <CustomerFooter />
    </div>
  );
}
