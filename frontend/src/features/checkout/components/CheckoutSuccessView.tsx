"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Anchor, Check, CheckCircle2, Copy, Droplets, Loader2, Package } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getMyOrder } from "@/features/order/api/customer-order.api";
import { OrderProgress } from "@/features/order/components/OrderProgress";
import { PaymentCard, RecipientCard, SupportCard } from "@/features/order/components/OrderSidePanels";
import { OrderVendorCard } from "@/features/order/components/OrderVendorCard";
import { ORDER_STATUS, PAYMENT_METHOD } from "@/features/order/constants/order-status";
import type { CustomerOrderDetail } from "@/features/order/types/order.types";
import { formatDateTime, formatVnd } from "@/features/order/utils/order-format";
import { orderProgress, productCount } from "@/features/order/utils/order-progress";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; order: CustomerOrderDetail };

/** The order that was just placed, read back from the server. */
export function CheckoutSuccessView() {
  const orderNumber = useSearchParams().get("order");
  const { accessToken } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!accessToken || !orderNumber) return;
    let current = true;
    getMyOrder(accessToken, orderNumber)
      .then((order) => current && setState({ kind: "ready", order }))
      .catch((error: unknown) => {
        if (current) setState({ kind: "error", message: error instanceof ApiError ? error.message : "Không tải được đơn hàng." });
      });
    return () => {
      current = false;
    };
  }, [accessToken, orderNumber]);

  if (!orderNumber) {
    return (
      <p role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Không tìm thấy mã đơn hàng.{" "}
        <Link href="/customer/orders" className="font-bold text-[#0F3860] underline">
          Xem đơn mua của tôi
        </Link>
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <p role="status" className="flex min-h-40 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
        Đang tải đơn hàng...
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="space-y-2 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-900">
        <p>{state.message}</p>
        <Link href="/customer/orders" className="font-bold underline">
          Xem đơn mua của tôi
        </Link>
      </div>
    );
  }

  return <Ready order={state.order} />;
}

function Ready({ order }: { order: CustomerOrderDetail }) {
  const steps = orderProgress(order, 4);
  const cod = order.payment?.method === "COD";

  return (
    <div className="space-y-6">
      <section className="grid gap-5 rounded-3xl bg-[#DCE9F8] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Đã ghi nhận đơn hàng
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-bold text-slate-900 sm:text-3xl">Đặt hàng thành công! Cảm ơn bạn đã tin chọn hải sản tươi sống tại HaiSan Express.</h1>
            <p className="mt-2 text-sm text-slate-600">
              Đơn hàng đã được gửi đến các vựa đối tác. Các vựa sẽ xác nhận và chuẩn bị hải sản cho bạn, bạn theo dõi tiến độ trong mục Đơn mua của tôi.
            </p>
          </div>
        </div>

        <dl className="min-w-0 space-y-2.5 rounded-2xl bg-white p-4 text-sm shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Mã đơn hàng</dt>
            <dd className="flex min-w-0 items-center gap-1.5 font-bold break-all text-[#0F3860]">
              #{order.orderNumber}
              <CopyButton text={order.orderNumber} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Thời gian đặt</dt>
            <dd className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</dd>
          </div>
          {order.payment && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Phương thức</dt>
              <dd className="text-right font-semibold text-slate-900">{PAYMENT_METHOD[order.payment.method]}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-2.5">
            <dt className="text-slate-500">{cod ? "Tổng tiền thu hộ" : "Tổng thanh toán"}</dt>
            <dd className="text-xl font-bold tabular-nums text-[#E63946]">{formatVnd(order.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      {steps && (
        <section className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Anchor className="h-5 w-5 text-[#0F3860]" aria-hidden="true" />
              Tiến độ xử lý đơn hàng
            </h2>
            <p className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Trạng thái: {ORDER_STATUS[order.status].label}</p>
          </div>
          <OrderProgress steps={steps} />
        </section>
      )}

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Package className="h-5 w-5 text-[#0F3860]" aria-hidden="true" />
              Chi tiết kiện hàng theo vựa ({order.vendorOrders.length} kiện)
            </h2>
            <p className="text-xs text-slate-500">Tổng cộng {productCount(order)} sản phẩm</p>
          </div>
          {order.vendorOrders.map((part) => (
            <OrderVendorCard key={part.id} part={part} />
          ))}

          <section className="flex items-start gap-4 rounded-2xl bg-emerald-50 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Droplets className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-emerald-800">Hướng dẫn tiếp nhận và bảo quản hải sản tươi sống tại nhà</h2>
              <p className="mt-1 text-sm text-slate-700">
                Hải sản sống được đóng thùng sục oxy chuyên dụng. Khi nhận hàng, quý khách vui lòng chuẩn bị sẵn thau nước muối nhạt (hoặc thau đá bào) để cho tôm và ghẹ vào ngay nếu chưa chế biến liền, và kiểm tra tem niêm phong trước khi ký nhận đơn hàng.
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-emerald-700">
                {["Kiểm tra bơi sống khi nhận hàng", "Bảo quản nơi thoáng mát", "Chế biến sớm để giữ độ tươi"].map((tip) => (
                  <li key={tip} className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <RecipientCard order={order} />
          <PaymentCard order={order} totalLabel={cod ? "Cần thanh toán khi nhận hàng" : "Tổng tiền thanh toán"} />

          <div className="space-y-2">
            <Link
              href={`/customer/orders/${encodeURIComponent(order.orderNumber)}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E63946] px-4 py-3 text-sm font-bold text-white hover:bg-[#C62835]"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Theo dõi đơn hàng
            </Link>
            <Link href="/products" className="flex w-full items-center justify-center rounded-xl bg-[#0F3860] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A2744]">
              Tiếp tục mua sắm
            </Link>
          </div>

          <SupportCard />
        </aside>
      </div>
    </div>
  );
}

/** Copies the order number, and says so for a moment. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The browser refused (for example an insecure page): nothing to copy to, nothing to say.
    }
  }

  return (
    <button type="button" onClick={copy} aria-label={copied ? "Đã sao chép mã đơn" : "Sao chép mã đơn"} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#0F3860]">
      {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
