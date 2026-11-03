"use client";

import { useCart } from "@/features/cart/context/CartContext";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, Trash2, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function CustomerCartPage() {
  const { items, itemCount, totalPrice, removeFromCart, clearCart } = useCart();

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      <CustomerHeader />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Giỏ hàng ({itemCount} món)
              </h1>
              <p className="text-xs text-slate-400">
                Hải sản được đóng thùng oxy giữ sống tới tay bạn
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Giỏ hàng của bạn đang trống
              </h3>
              <p className="text-xs text-slate-500">
                Hãy khám phá các loại hải sản tươi sống mới về hôm nay!
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744]"
            >
              <span>Xem hải sản nổi bật</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-16 w-16 rounded-xl object-cover border border-slate-100"
                    />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.productName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Vựa: {item.vendorName}
                      </p>
                      <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-[#0F3860]">
                        Sơ chế: {item.preparationOption}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold text-[#E63946]">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.quantity} {item.unit} x {formatPrice(item.price)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Xóa món"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 h-fit">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Tóm Tắt Đơn Hàng
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tiền hàng:</span>
                  <span className="font-bold text-slate-800">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thùng xốp oxy muối:</span>
                  <span className="font-bold text-emerald-600">Miễn phí</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cước giao hỏa tốc 2h:</span>
                  <span className="font-bold text-slate-800">30.000 đ</span>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">
                    Tổng thanh toán:
                  </span>
                  <span className="text-lg font-bold text-[#E63946]">
                    {formatPrice(totalPrice + 30000)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  alert(
                    "Đơn hàng mẫu đã được ghi nhận! Shipper vựa sẽ giao hàng và hỗ trợ kiểm tra tôm bơi sống trước khi thanh toán."
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#0A2744] active:scale-98 transition"
              >
                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>Tiến Hành Đặt Hàng Giao 2H</span>
              </button>

              <div className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Chính sách kiểm hàng tại chỗ:</span>
                </div>
                <p className="text-emerald-800/90 leading-relaxed">
                  Quý khách được mở thùng xốp kiểm tra tôm còn bơi sống trước khi trả tiền. Đền bù gấp đôi nếu tôm ngợp ươn.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
