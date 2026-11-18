"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, CreditCard, ImageIcon, Loader2, MapPin, Star, Store, TriangleAlert } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { VendorDialog, dialogButton } from "@/features/vendor/components/VendorDialog";
import { cn } from "@/lib/utils";
import { cancelMyOrder, getMyOrder } from "../api/customer-order.api";
import { ORDER_STATUS, PAYMENT_METHOD, VENDOR_ORDER_STATUS, paymentStyle } from "../constants/order-status";
import type { CustomerOrderDetail, CustomerVendorOrder } from "../types/order.types";
import { errorMessage, formatDateTime, formatQuantity, formatVnd, fullAddress } from "../utils/order-format";
import { StatusBadge } from "./StatusBadge";

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

  const back = (
    <Link href="/customer/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#0F3860]">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Đơn mua của tôi
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <>
        {back}
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
        {back}
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

  return (
    <>
      {back}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold break-all text-slate-900">Đơn #{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Đặt lúc <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge style={ORDER_STATUS[order.status]} className="text-sm" />
          {order.canCancel && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              Hủy đơn
            </button>
          )}
        </div>
      </header>

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

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {order.vendorOrders.map((vendorOrder) => (
            <VendorPart key={vendorOrder.id} part={vendorOrder} />
          ))}
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-[#0F3860]" aria-hidden="true" />
              Người nhận
            </h2>
            <p className="font-semibold break-words text-slate-900">{order.recipient.name}</p>
            <p className="text-sm text-slate-600">{order.recipient.phone}</p>
            <p className="mt-1 text-sm break-words text-slate-600">{fullAddress(order.recipient)}</p>
            {order.customerNote && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm break-words text-slate-700">
                <span className="font-semibold">Ghi chú:</span> {order.customerNote}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <CreditCard className="h-4 w-4 text-[#0F3860]" aria-hidden="true" />
              Thanh toán
            </h2>
            <dl className="space-y-2 text-sm">
              {order.payment && (
                <>
                  <Row label="Phương thức" value={PAYMENT_METHOD[order.payment.method]} />
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Trạng thái</dt>
                    <dd>
                      <StatusBadge style={paymentStyle(order.payment)} />
                    </dd>
                  </div>
                </>
              )}
              <Row label="Tạm tính" value={formatVnd(order.subtotal)} />
              <Row label="Phí giao hàng" value={formatVnd(order.shippingTotal)} />
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-base">
                <dt className="font-bold text-slate-900">Tổng cộng</dt>
                <dd className="font-bold tabular-nums text-[#E63946]">{formatVnd(order.grandTotal)}</dd>
              </div>
            </dl>
          </section>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function VendorPart({ part }: { part: CustomerVendorOrder }) {
  const delivered = part.status === "COMPLETED";
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900">
          <Store className="h-4 w-4 shrink-0 text-[#0F3860]" aria-hidden="true" />
          <Link href={`/vendor/${part.vendor.slug}`} className="break-words hover:underline">
            {part.vendor.name}
          </Link>
        </h2>
        <StatusBadge style={VENDOR_ORDER_STATUS[part.status]} />
      </div>

      {(part.shipment?.shippedAt || part.shipment?.deliveredAt) && (
        <p className="mb-3 text-xs text-slate-500">
          {part.shipment.shippedAt && <>Bàn giao vận chuyển: {formatDateTime(part.shipment.shippedAt)}</>}
          {part.shipment.shippedAt && part.shipment.deliveredAt && " · "}
          {part.shipment.deliveredAt && <>Đã giao: {formatDateTime(part.shipment.deliveredAt)}</>}
        </p>
      )}
      {part.vendorNote && (
        <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm break-words text-slate-700">
          <span className="font-semibold">{part.status === "CANCELLED" ? "Lý do từ vựa:" : "Ghi chú từ vựa:"}</span> {part.vendorNote}
        </p>
      )}

      <ul className="divide-y divide-slate-100">
        {part.items.map((item) => (
          <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-300">
                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <Link href={`/products/${item.productSlug}`} className="font-semibold break-words text-slate-900 hover:underline">
                  {item.productName}
                </Link>
                <p className="text-xs break-words text-slate-500">{item.variantName}</p>
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold tabular-nums">
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>{" "}
                  × {formatVnd(item.unitPrice)}/{item.unit}
                </p>
                {delivered &&
                  (item.reviewed ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">Đã đánh giá</p>
                  ) : (
                    <Link
                      href="/customer/reviews"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0F3860] hover:underline"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      Viết đánh giá
                    </Link>
                  ))}
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-slate-900 sm:text-right">{formatVnd(item.lineTotal)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-100 pt-3 text-right text-sm text-slate-600">
        Tổng của vựa: <span className="font-semibold tabular-nums text-slate-900">{formatVnd(part.grandTotal)}</span>
      </p>
    </section>
  );
}
