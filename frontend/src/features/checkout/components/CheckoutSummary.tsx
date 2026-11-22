import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CheckoutPreview } from "../types/checkout.types";

interface CheckoutSummaryProps {
  preview: CheckoutPreview;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
}

/** The totals as the server worked them out, and the button that places the order. */
export function CheckoutSummary({ preview, submitting, error, onConfirm }: CheckoutSummaryProps) {
  return (
    <aside className="h-fit space-y-4 lg:sticky lg:top-24" aria-label="Tóm tắt đơn hàng">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Tóm tắt đơn hàng</h2>
          <span className="text-xs text-slate-500">{preview.lineCount} sản phẩm</span>
        </div>

        <dl className="space-y-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <dt>Tiền hàng</dt>
            <dd className="font-bold text-slate-800">{formatPrice(preview.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Phí vận chuyển ({preview.vendors.length} vựa)</dt>
            <dd className="font-bold text-slate-800">{formatPrice(preview.shippingTotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
            <dt className="text-sm font-bold text-slate-900">Tổng thanh toán</dt>
            <dd className="text-xl font-bold text-[#E63946]">{formatPrice(preview.grandTotal)}</dd>
          </div>
        </dl>

        {preview.problems.length > 0 && (
          <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Chưa thể đặt hàng
            </p>
            <ul className="list-disc pl-6">
              {preview.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            <Link href="/customer/cart" className="inline-block font-bold underline">
              Quay lại giỏ hàng để điều chỉnh
            </Link>
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting || !preview.canCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E63946] py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#C62835] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
          {submitting ? "Đang đặt hàng..." : "Xác nhận đặt hàng"}
        </button>

        <Link href="/customer/cart" className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Quay lại giỏ hàng
        </Link>
      </div>
    </aside>
  );
}
