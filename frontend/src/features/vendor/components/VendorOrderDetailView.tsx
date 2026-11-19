"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChefHat,
  CircleCheckBig,
  Clock,
  CreditCard,
  ImageIcon,
  Loader2,
  MapPin,
  PackageCheck,
  StickyNote,
  TriangleAlert,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { StatusBadge } from "@/features/order/components/StatusBadge";
import { PAYMENT_METHOD, VENDOR_ORDER_STATUS, VENDOR_ORDER_STEPS, paymentStyle } from "@/features/order/constants/order-status";
import { errorMessage, formatDateTime, formatQuantity, formatVnd, fullAddress } from "@/features/order/utils/order-format";
import { cn } from "@/lib/utils";
import { changeOrderStatus, getMyOrder } from "../api/vendor-order.api";
import { useMyStore } from "../hooks/useMyStore";
import type { VendorOrderDetail, VendorOrderTarget } from "../types/vendor-order.types";
import { VendorDialog, dialogButton, fieldClass } from "./VendorDialog";

const NOTE_MAX = 500;

/** Button text, icon and confirmation for each forward step. Cancelling has its own dialog. */
const ACTIONS: Record<Exclude<VendorOrderTarget, "CANCELLED">, { label: string; icon: LucideIcon; done: string }> = {
  ACCEPTED: { label: "Nhận đơn", icon: CheckCircle2, done: "Đã nhận đơn." },
  PREPARING: { label: "Bắt đầu chuẩn bị", icon: ChefHat, done: "Đơn đang được chuẩn bị." },
  SHIPPING: { label: "Giao cho vận chuyển", icon: Truck, done: "Đã bàn giao đơn cho vận chuyển." },
  COMPLETED: { label: "Đã giao xong", icon: PackageCheck, done: "Đơn đã được giao xong." },
};

type State = { kind: "loading" } | { kind: "error"; message: string; notFound: boolean } | { kind: "ready"; order: VendorOrderDetail };

/** One of the vendor's orders. Buttons come only from `allowedActions`, which the API computes. */
export function VendorOrderDetailView({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const { state: storeState } = useMyStore();
  const store = storeState.kind === "ready" ? storeState.store : null;
  const readOnly = store ? store.status === "SUSPENDED" || store.status === "REJECTED" : false;

  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadCount, setReloadCount] = useState(0);
  const [busy, setBusy] = useState<VendorOrderTarget | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    getMyOrder(accessToken, orderId)
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
  }, [accessToken, orderId, reloadCount]);

  async function act(target: VendorOrderTarget, note?: string): Promise<boolean> {
    if (!accessToken) return false;
    setBusy(target);
    setNotice(null);
    try {
      const order = await changeOrderStatus(accessToken, orderId, target, note);
      setState({ kind: "ready", order });
      setNotice({ tone: "success", text: target === "CANCELLED" ? "Đã hủy đơn và hoàn lại tồn kho." : ACTIONS[target].done });
      return true;
    } catch (error) {
      const prefix =
        error instanceof ApiError && error.statusCode === 409
          ? "Không thể đổi trạng thái: "
          : error instanceof ApiError && error.statusCode === 403
            ? "Không có quyền: "
            : "";
      setNotice({ tone: "error", text: prefix + errorMessage(error, "Không thể đổi trạng thái đơn hàng.") });
      // The order may have moved elsewhere; show what it is now.
      setReloadCount((count) => count + 1);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const back = (
    <Link href="/vendor/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Danh sách đơn hàng
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <>
        {back}
        <p className="mt-6 flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải đơn hàng...
        </p>
      </>
    );
  }
  if (state.kind === "error") {
    return (
      <>
        {back}
        <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
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
  const forward = order.allowedActions.filter((action): action is Exclude<VendorOrderTarget, "CANCELLED"> => action !== "CANCELLED");
  const canCancel = order.allowedActions.includes("CANCELLED");

  return (
    <>
      {back}
      <header className="mt-3 mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-all text-slate-900 sm:text-[28px]">Đơn #{order.orderNumber}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            Đặt lúc <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
          </p>
        </div>
        <StatusBadge style={VENDOR_ORDER_STATUS[order.status]} className="self-start text-sm sm:self-auto" />
      </header>

      {readOnly && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Gian hàng đang {store?.status === "SUSPENDED" ? "bị tạm ngưng" : "bị từ chối"} nên chỉ có thể xem đơn, không thể xử lý.
            Vui lòng liên hệ quản trị viên.
          </p>
        </div>
      )}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
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

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5 lg:order-1">
          <Card title="Mặt hàng" icon={PackageCheck}>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {item.imageUrl ? (
                      // Cloudinary or seeded URLs; next/image is not configured for remote hosts.
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
                      <p className="font-semibold break-words text-slate-900">{item.productName}</p>
                      <p className="text-xs break-words text-slate-500">{item.variantName}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-semibold tabular-nums">
                          {formatQuantity(item.quantity)} {item.unit}
                        </span>{" "}
                        × {formatVnd(item.unitPrice)}/{item.unit}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-slate-900 sm:text-right">{formatVnd(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
              <Row label="Tạm tính" value={formatVnd(order.subtotal)} />
              <Row label="Phí giao hàng" value={formatVnd(order.shippingFee)} />
              <div className="flex items-center justify-between gap-3 pt-1 text-base">
                <dt className="font-bold text-slate-900">Tổng tiền của gian hàng</dt>
                <dd className="font-bold tabular-nums text-danger">{formatVnd(order.grandTotal)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Tiến trình đơn hàng" icon={Clock}>
            <Timeline order={order} />
          </Card>
        </div>

        <aside className="min-w-0 space-y-5 lg:order-2">
          {!readOnly && (forward.length > 0 || canCancel || order.acceptBlockedReason) && (
            <Card title="Xử lý đơn" icon={CircleCheckBig}>
              {order.status === "PENDING" && order.acceptBlockedReason && (
                <p className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{order.acceptBlockedReason}</span>
                </p>
              )}
              <div className="flex flex-col gap-2">
                {forward.map((target) => {
                  const { label, icon: Icon } = ACTIONS[target];
                  return (
                    <button
                      key={target}
                      type="button"
                      onClick={() => act(target)}
                      disabled={busy !== null}
                      className={cn(dialogButton.primary, "w-full py-2.5")}
                    >
                      {busy === target ? (
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      )}
                      {label}
                    </button>
                  );
                })}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setCancelling(true)}
                    disabled={busy !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Hủy đơn
                  </button>
                )}
              </div>
            </Card>
          )}

          <Card title="Người nhận" icon={MapPin}>
            <p className="font-semibold break-words text-slate-900">{order.recipient.name}</p>
            <p className="text-sm text-slate-600">
              <a href={`tel:${order.recipient.phone}`} className="hover:underline">
                {order.recipient.phone}
              </a>
            </p>
            <p className="mt-1 text-sm break-words text-slate-600">{fullAddress(order.recipient)}</p>
            {order.customerNote && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm break-words text-slate-700">
                <span className="font-semibold">Ghi chú của khách:</span> {order.customerNote}
              </p>
            )}
          </Card>

          <Card title="Thanh toán" icon={CreditCard}>
            {order.payment ? (
              <dl className="space-y-2 text-sm">
                <Row label="Phương thức" value={PAYMENT_METHOD[order.payment.method]} />
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd>
                    <StatusBadge style={paymentStyle(order.payment)} />
                  </dd>
                </div>
                {order.payment.paidAt && <Row label="Thanh toán lúc" value={formatDateTime(order.payment.paidAt)} />}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Đơn hàng chưa có thông tin thanh toán.</p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Trạng thái thanh toán do hệ thống cập nhật. Đơn thanh toán khi nhận hàng được ghi nhận đã thanh toán khi giao xong.
            </p>
          </Card>

          {order.vendorNote && (
            <Card title="Ghi chú của gian hàng" icon={StickyNote}>
              <p className="text-sm break-words text-slate-700">{order.vendorNote}</p>
            </Card>
          )}
        </aside>
      </div>

      {cancelling && (
        <CancelOrderDialog
          order={order}
          busy={busy === "CANCELLED"}
          onClose={() => setCancelling(false)}
          onConfirm={async (note) => {
            if (await act("CANCELLED", note)) setCancelling(false);
          }}
        />
      )}
    </>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
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

/**
 * The steps so far. Only the order date, hand-over and delivery times are
 * stored, so the other steps show as done without a time.
 */
function Timeline({ order }: { order: VendorOrderDetail }) {
  if (order.status === "CANCELLED") {
    return (
      <ol className="space-y-3 text-sm">
        <Step state="done" label="Đặt hàng" time={order.createdAt} />
        <Step state="cancelled" label="Đơn đã bị hủy" time={order.updatedAt} />
      </ol>
    );
  }
  const reached = VENDOR_ORDER_STEPS.indexOf(order.status);
  const times: Partial<Record<string, string | null>> = {
    PENDING: order.createdAt,
    SHIPPING: order.shipment?.shippedAt ?? null,
    COMPLETED: order.shipment?.deliveredAt ?? null,
  };
  const labels: Record<string, string> = {
    PENDING: "Đặt hàng",
    ACCEPTED: "Nhận đơn",
    PREPARING: "Chuẩn bị hàng",
    SHIPPING: "Giao cho vận chuyển",
    COMPLETED: "Đã giao xong",
  };
  return (
    <ol className="space-y-3 text-sm">
      {VENDOR_ORDER_STEPS.map((step, index) => (
        <Step
          key={step}
          state={index < reached || (index === reached && step === "COMPLETED") ? "done" : index === reached ? "current" : "upcoming"}
          label={labels[step]!}
          time={index <= reached ? (times[step] ?? null) : null}
        />
      ))}
    </ol>
  );
}

function Step({ state, label, time }: { state: "done" | "current" | "upcoming" | "cancelled"; label: string; time: string | null }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2",
          state === "done" && "bg-emerald-600 ring-emerald-600 text-white",
          state === "current" && "bg-white ring-brand",
          state === "upcoming" && "bg-white ring-slate-200",
          state === "cancelled" && "bg-rose-600 ring-rose-600 text-white",
        )}
        aria-hidden="true"
      >
        {state === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
        {state === "current" && <span className="h-2 w-2 rounded-full bg-brand" />}
        {state === "cancelled" && <Ban className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className={cn("font-semibold", state === "upcoming" ? "text-slate-400" : "text-slate-900")}>
          {label}
          {state === "current" && <span className="ml-2 text-xs font-semibold text-brand">Hiện tại</span>}
        </p>
        {time && (
          <time dateTime={time} className="text-xs text-slate-500">
            {formatDateTime(time)}
          </time>
        )}
      </div>
    </li>
  );
}

function CancelOrderDialog({
  order,
  busy,
  onClose,
  onConfirm,
}: {
  order: VendorOrderDetail;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const paid = order.payment?.status === "PAID";
  return (
    <VendorDialog
      title={`Hủy đơn #${order.orderNumber}?`}
      description="Đơn đã hủy không thể khôi phục."
      tone="danger"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={dialogButton.secondary}>
            Giữ đơn
          </button>
          <button type="button" onClick={() => onConfirm(note.trim() || undefined)} disabled={busy} className={dialogButton.danger}>
            {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Hủy đơn
          </button>
        </>
      }
    >
      <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>Số lượng của {order.items.length} mặt hàng sẽ được cộng lại vào tồn kho của gian hàng.</li>
        {paid ? (
          <li>Khách đã thanh toán: tiền sẽ được hoàn lại cho khách (giả lập) khi mọi gian hàng trong đơn đều đã hủy.</li>
        ) : (
          <li>Khách chưa thanh toán nên không phát sinh hoàn tiền.</li>
        )}
        <li>Khách hàng sẽ thấy đơn đã bị hủy và lý do bên dưới (nếu có).</li>
      </ul>
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">Lý do hủy (không bắt buộc)</span>
        <textarea
          data-autofocus
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          disabled={busy}
          placeholder="Ví dụ: hết hàng tươi trong ngày"
          className={fieldClass(false, "mt-1.5 resize-y")}
        />
        <span className="mt-1 block text-right text-xs text-slate-500">
          {note.length}/{NOTE_MAX}
        </span>
      </label>
    </VendorDialog>
  );
}
