"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Footprints, Loader2, Package, Phone, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { VendorDialog, dialogButton } from "@/features/vendor/components/VendorDialog";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";
import { cn } from "@/lib/utils";
import { cancelMyOrder, getMyOrder } from "../api/customer-order.api";
import { ORDER_STATUS } from "../constants/order-status";
import type { CustomerOrderDetail } from "../types/order.types";
import { errorMessage, formatDateTime } from "../utils/order-format";
import { orderProgress } from "../utils/order-progress";
import { OrderProgress } from "./OrderProgress";
import { PaymentCard, RecipientCard, SupportCard } from "./OrderSidePanels";
import { OrderVendorCard } from "./OrderVendorCard";

type State = { kind: "loading" } | { kind: "error"; message: string; notFound: boolean } | { kind: "ready"; order: CustomerOrderDetail };

/** One of the customer's orders with each vendor's progress; cancellable while no vendor has accepted it. */
export function CustomerOrderDetailView({ orderNumber }: { orderNumber: string }) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadCount, setReloadCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    getMyOrder(accessToken, orderNumber)
      .then((order) => current && setState({ kind: "ready", order }))
      .catch(
        (error: unknown) =>
          current &&
          setState({
            kind: "error",
            message: errorMessage(error, "Không thể tải đơn hàng."),
            notFound: error instanceof ApiError && error.statusCode === 404,
          }),
      );
    return () => {
      current = false;
    };
  }, [accessToken, orderNumber, reloadCount]);

  async function cancel() {
    if (!accessToken) return;
    setBusy(true);
    setNotice(null);
    try {
      const order = await cancelMyOrder(accessToken, orderNumber);
      setState({ kind: "ready", order });
      setNotice({ tone: "success", text: "Đã hủy đơn hàng." });
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error, "Không thể hủy đơn hàng.") });
      setReloadCount((count) => count + 1);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const bar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <Link href="/customer/orders" className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-[#0F3860]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trở về danh sách đơn hàng
        </Link>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <span className="font-bold break-all text-slate-900">Mã đơn: #{orderNumber}</span>
      </div>
      <a
        href={`tel:${SUPPORT_HOTLINE.tel}`}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0F3860] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0A2744]"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Liên hệ hỗ trợ đơn hàng
      </a>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <>
        {bar}
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-[#0F3860] motion-reduce:animate-none" aria-hidden="true" />
          Đang tải đơn hàng...
        </p>
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <>
        {bar}
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">{state.notFound ? "Không tìm thấy đơn hàng" : "Không thể tải đơn hàng"}</p>
          <p className="mt-1">{state.message}</p>
          {!state.notFound && (
            <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="mt-3 font-semibold underline">
              Thử lại
            </button>
          )}
        </div>
      </>
    );
  }

  const { order } = state;
  const paid = order.payment?.status === "PAID";
  const steps = orderProgress(order);

  return (
    <>
      {bar}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {notice.tone === "error" ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {notice.text}
        </p>
      )}

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[#EAF2FB] px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#E63946] uppercase">
                  <span className="h-2 w-2 rounded-full bg-[#E63946]" aria-hidden="true" />
                  Tiến độ đơn hàng
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">Trạng thái: {ORDER_STATUS[order.status].label}</h1>
              </div>
              <p className="text-sm text-slate-600">
                Đặt lúc <time dateTime={order.createdAt} className="font-semibold text-slate-900">{formatDateTime(order.createdAt)}</time>
              </p>
            </div>

            {steps ? (
              <div className="mt-6">
                <OrderProgress steps={steps} />
              </div>
            ) : (
              <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                <p>
                  Đơn hàng này đã được hủy.
                  {order.payment?.status === "REFUNDED" && " Số tiền bạn đã thanh toán được hoàn lại."}
                </p>
              </div>
            )}

            <p className="mt-5 flex items-start gap-3 rounded-xl bg-[#EAF2FB] p-3.5 text-sm text-slate-700">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0F3860]" aria-hidden="true" />
              <span>
                <strong className="text-slate-900">Cam kết độ tươi sống:</strong> hải sản tươi sống được vựa kiểm tra sức khỏe tại hồ oxy trước khi đóng thùng chuyên dụng để đảm bảo độ bơi sống tối đa khi đến tay bạn.
              </span>
            </p>
          </section>

          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Package className="h-5 w-5 text-[#0F3860]" aria-hidden="true" />
            Kiện hàng hải sản theo vựa ({order.vendorOrders.length} kiện)
          </h2>
          <div className="space-y-4">
            {order.vendorOrders.map((part) => (
              <OrderVendorCard key={part.id} part={part} showReview />
            ))}
          </div>

          <section className="flex items-start gap-4 rounded-2xl bg-[#EAF2FB] p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F3860] text-white">
              <Footprints className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Quy trình nhận hàng thùng oxy &amp; túi khí lạnh</h2>
              <p className="mt-1 text-sm text-slate-600">
                Các mặt hàng tôm, cua ghẹ sống được vận chuyển độc lập bằng thùng sục oxy chuyên dụng. Khi nhận hàng, quý khách vui lòng mở nắp thùng kiểm tra tình trạng bơi sống của hải sản trước khi ký nhận.
              </p>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <RecipientCard order={order} />
          <PaymentCard order={order} />

          <section className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
              <Ban className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Quản lý đơn hàng
            </h2>
            {order.canCancel ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Chưa vựa nào nhận đơn nên bạn vẫn có thể hủy toàn bộ đơn hàng. Sau khi một vựa đã nhận đơn, bạn không thể tự hủy nữa.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Yêu cầu hủy đơn hàng này
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                {order.status === "CANCELLED"
                  ? "Đơn hàng đã được hủy."
                  : "Đơn hàng đã được vựa tiếp nhận nên không thể tự hủy. Cần thay đổi, vui lòng liên hệ hỗ trợ."}
              </p>
            )}
          </section>

          <SupportCard />
        </aside>
      </div>

      {confirming && (
        <VendorDialog
          title={`Hủy đơn #${order.orderNumber}?`}
          description="Đơn đã hủy không thể khôi phục."
          tone="danger"
          busy={busy}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={dialogButton.secondary}>
                Giữ đơn
              </button>
              <button type="button" onClick={cancel} disabled={busy} className={dialogButton.danger}>
                {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Hủy đơn
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">
            Toàn bộ đơn hàng, gồm {order.vendorOrders.length} vựa, sẽ được hủy.{" "}
            {paid ? "Số tiền bạn đã thanh toán sẽ được hoàn lại (giả lập)." : "Bạn chưa thanh toán nên không phát sinh hoàn tiền."}
          </p>
        </VendorDialog>
      )}
    </>
  );
}
