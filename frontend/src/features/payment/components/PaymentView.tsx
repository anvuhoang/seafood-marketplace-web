"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { getPayment, requestQr, syncPayment } from "../api/payment.api";
import type { PaymentDetail } from "../types/payment.types";

/** How often the saved status is read, and how many reads pass before PayOS itself is asked. */
const POLL_MS = 3000;
const ASK_PAYOS_EVERY = 4;

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; payment: PaymentDetail };

const messageOf = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

/** The current time, refreshed every second while `active`, for the countdown. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function countdown(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null;
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Pay one order by scanning a QR. The server decides what happened to the payment; this screen only shows it. */
export function PaymentView({ orderNumber }: { orderNumber: string }) {
  const { accessToken } = useAuth();
  // PayOS sends the customer back here with these in the address, whether they paid or cancelled.
  const params = useSearchParams();
  const cameBackFromPayos = params.has("orderCode") || params.has("status");

  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const autoRequested = useRef(false);
  const ticks = useRef(0);

  const payment = state.kind === "ready" ? state.payment : null;
  const waiting = payment?.status === "PENDING" && payment.qrCode !== null;
  const now = useNow(waiting);

  // First look. Coming back from PayOS, ask it what happened instead of trusting the address.
  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    (cameBackFromPayos ? syncPayment : getPayment)(accessToken, orderNumber)
      .then((detail) => current && setState({ kind: "ready", payment: detail }))
      .catch((error: unknown) => {
        if (current) setState({ kind: "error", message: messageOf(error, "Không tải được thông tin thanh toán.") });
      });
    return () => {
      current = false;
    };
  }, [accessToken, orderNumber, cameBackFromPayos]);

  const run = useCallback(
    async (action: typeof requestQr, failure: string) => {
      if (!accessToken) return;
      setBusy(true);
      setNotice(null);
      try {
        setState({ kind: "ready", payment: await action(accessToken, orderNumber) });
      } catch (error) {
        setNotice(messageOf(error, failure));
      } finally {
        setBusy(false);
      }
    },
    [accessToken, orderNumber],
  );

  // A new QR is made once by itself when there is none yet; after a failure the customer chooses to retry.
  useEffect(() => {
    if (payment && payment.method === "BANK_TRANSFER" && payment.status === "PENDING" && !payment.qrCode && !autoRequested.current) {
      autoRequested.current = true;
      void run(requestQr, "Không tạo được mã QR. Vui lòng thử lại.");
    }
  }, [payment, run]);

  // While the QR is open, read the saved status often and now and then ask PayOS (the webhook may be slow).
  useEffect(() => {
    if (!accessToken || !waiting) return;
    let current = true;
    const timer = setInterval(() => {
      ticks.current += 1;
      const askPayos = ticks.current % ASK_PAYOS_EVERY === 0;
      (askPayos ? syncPayment : getPayment)(accessToken, orderNumber)
        .then((detail) => current && setState({ kind: "ready", payment: detail }))
        .catch(() => undefined); // a missed read is fine, the next one tries again
    }, POLL_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [accessToken, orderNumber, waiting]);

  const orderHref = `/customer/orders/${encodeURIComponent(orderNumber)}`;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Thanh toán đơn hàng</h1>

      {state.kind === "loading" && (
        <p role="status" className="flex min-h-48 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          Đang tải thông tin thanh toán...
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

      {payment && (
        <section aria-labelledby="payment-summary" className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <dl id="payment-summary" className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Mã tham chiếu</dt>
              <dd className="font-bold text-[#0F3860]">#{payment.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Số tiền</dt>
              <dd className="text-sm font-bold text-[#E63946]">{formatPrice(Number(payment.amount))}</dd>
            </div>
          </dl>

          {payment.method !== "BANK_TRANSFER" && (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-700">Đơn hàng này không thanh toán bằng mã QR.</p>
          )}

          {payment.method === "BANK_TRANSFER" && payment.status === "PAID" && (
            <div role="status" className="space-y-2 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
              <p className="text-lg font-bold text-slate-900">Thanh toán thành công</p>
              <p className="text-xs text-slate-500">Các vựa sẽ xác nhận và chuẩn bị hải sản cho bạn.</p>
            </div>
          )}

          {payment.method === "BANK_TRANSFER" && waiting && payment.qrCode && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-700">Mở ứng dụng ngân hàng và quét mã QR để chuyển khoản.</p>
              <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3">
                <QRCodeSVG value={payment.qrCode} size={224} level="M" role="img" aria-label={`Mã QR thanh toán đơn ${payment.orderNumber}`} />
              </div>
              <p className="flex items-center justify-center gap-2 text-sm text-slate-600" role="status">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Đang chờ thanh toán
                {countdown(payment.expiresAt, now) && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="h-4 w-4" aria-hidden />
                    còn {countdown(payment.expiresAt, now)}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">Trang sẽ tự cập nhật khi nhận được tiền. Vui lòng giữ nguyên nội dung chuyển khoản.</p>
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void run(syncPayment, "Chưa kiểm tra được. Vui lòng thử lại.")}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744] disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
                  Tôi đã thanh toán, kiểm tra lại
                </button>
                {payment.checkoutUrl && (
                  <a
                    href={payment.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Mở trang thanh toán
                  </a>
                )}
              </div>
            </div>
          )}

          {payment.method === "BANK_TRANSFER" && payment.status === "PENDING" && !payment.qrCode && (
            <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Đang tạo mã QR...
            </p>
          )}

          {payment.method === "BANK_TRANSFER" && (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "EXPIRED") && (
            <div role="alert" className="space-y-3 text-center">
              {payment.status === "EXPIRED" ? (
                <Clock className="mx-auto h-12 w-12 text-amber-600" aria-hidden />
              ) : (
                <XCircle className="mx-auto h-12 w-12 text-rose-600" aria-hidden />
              )}
              <p className="text-lg font-bold text-slate-900">
                {payment.status === "EXPIRED" ? "Mã QR đã hết hạn" : payment.status === "CANCELLED" ? "Bạn đã hủy giao dịch" : "Thanh toán không thành công"}
              </p>
              <p className="text-xs text-slate-500">Đơn hàng chưa được thanh toán. Bạn có thể tạo mã QR mới và thử lại.</p>
              <button
                type="button"
                onClick={() => void run(requestQr, "Không tạo được mã QR. Vui lòng thử lại.")}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                Thử thanh toán lại
              </button>
            </div>
          )}

          {payment.status === "REFUNDED" && <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-700">Đơn hàng này đã được hoàn tiền.</p>}

          {notice && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {notice}
            </p>
          )}

          <div className="flex flex-col justify-center gap-2 border-t border-slate-100 pt-4 sm:flex-row">
            <Link href={orderHref} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Xem chi tiết đơn hàng
            </Link>
            <Link href="/products" className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Tiếp tục mua sắm
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
