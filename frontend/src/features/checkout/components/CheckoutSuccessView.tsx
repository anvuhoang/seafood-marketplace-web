"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Package } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { PAYMENT_METHOD } from "@/features/order/constants/order-status";
import { getMyOrder } from "@/features/order/api/customer-order.api";
import type { CustomerOrderDetail } from "@/features/order/types/order.types";
import { formatPrice } from "@/lib/utils";
import { CheckoutSteps } from "./CheckoutSteps";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; order: CustomerOrderDetail };

/** Step 3: the order that was just placed, read back from the server. */
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-center">
        <CheckoutSteps current={2} />
      </div>

      {state.kind === "loading" && (
        <p role="status" className="flex min-h-40 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          Đang tải đơn hàng...
        </p>
      )}

      {state.kind === "error" && (
        <div role="alert" className="space-y-2 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-900">
          <p>{state.message}</p>
          <Link href="/customer/orders" className="font-bold underline">
            Xem đơn mua của tôi
          </Link>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xs sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">Đặt hàng thành công!</h1>
            <p className="text-sm text-slate-600">
              Mã đơn hàng của bạn: <strong className="text-[#0F3860]">#{state.order.orderNumber}</strong>
            </p>
            <p className="text-xs text-slate-500">Các vựa sẽ xác nhận và chuẩn bị hải sản cho bạn. Bạn theo dõi trạng thái trong mục Đơn mua của tôi.</p>
          </div>

          <dl className="space-y-3 rounded-2xl bg-slate-50 p-4 text-left text-xs text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Tổng thanh toán</dt>
              <dd className="text-sm font-bold text-[#E63946]">{formatPrice(Number(state.order.grandTotal))}</dd>
            </div>
            {state.order.payment && (
              <div className="flex justify-between gap-4">
                <dt>Thanh toán</dt>
                <dd className="text-right font-semibold text-slate-800">
                  {PAYMENT_METHOD[state.order.payment.method]}
                  {state.order.payment.status === "PENDING" && " (chưa thanh toán)"}
                </dd>
              </div>
            )}
            <div className="flex items-start gap-2 border-t border-slate-200 pt-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <dd className="text-slate-700">
                <span className="font-bold text-slate-900">
                  {state.order.recipient.name} · {state.order.recipient.phone}
                </span>
                <br />
                {[state.order.recipient.address, state.order.recipient.ward, state.order.recipient.district, state.order.recipient.province].filter(Boolean).join(", ")}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href={`/customer/orders/${encodeURIComponent(state.order.orderNumber)}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744]"
            >
              <Package className="h-4 w-4" aria-hidden />
              Xem chi tiết đơn hàng
            </Link>
            <Link href="/products" className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
