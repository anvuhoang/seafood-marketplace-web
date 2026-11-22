import Link from "next/link";
import { CreditCard, Headset, MapPin, Phone } from "lucide-react";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";
import { PAYMENT_METHOD, paymentStyle, qrPaymentAction } from "../constants/order-status";
import type { CustomerOrderDetail } from "../types/order.types";
import { formatVnd, fullAddress } from "../utils/order-format";
import { productCount } from "../utils/order-progress";
import { StatusBadge } from "./StatusBadge";

const card = "min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs";

/** Who receives the order and where, with the customer's own note to the vendors. */
export function RecipientCard({ order }: { order: CustomerOrderDetail }) {
  return (
    <section className={card}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <MapPin className="h-4 w-4 text-[#0F3860]" aria-hidden="true" />
        Thông tin nhận hàng
      </h2>
      <p className="font-bold break-words text-slate-900">
        {order.recipient.name} <span className="mx-1 font-normal text-slate-300">|</span> {order.recipient.phone}
      </p>
      <p className="mt-1 text-sm break-words text-slate-600">{fullAddress(order.recipient)}</p>
      {order.customerNote && (
        <div className="mt-3 rounded-xl bg-[#EAF2FB] p-3">
          <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Lời dặn</p>
          <p className="mt-1 text-sm break-words text-slate-700 italic">&ldquo;{order.customerNote}&rdquo;</p>
        </div>
      )}
    </section>
  );
}

/**
 * The money of the order, with the payment status kept apart from the order status. The button to pay
 * by QR shows only while there is something to pay that way.
 */
export function PaymentCard({ order, totalLabel = "Tổng tiền thanh toán" }: { order: CustomerOrderDetail; totalLabel?: string }) {
  const payAction = qrPaymentAction(order);
  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <CreditCard className="h-4 w-4 text-[#0F3860]" aria-hidden="true" />
          Thanh toán
        </h2>
        <StatusBadge style={paymentStyle(order.payment)} />
      </div>
      <dl className="space-y-2 text-sm">
        <Row label={`Tiền hàng hải sản (${productCount(order)} sản phẩm)`} value={formatVnd(order.subtotal)} />
        <Row label="Phí vận chuyển" value={formatVnd(order.shippingTotal)} />
      </dl>
      <div className="mt-3 rounded-xl bg-[#EAF2FB] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-slate-900">{totalLabel}</p>
          <p className="text-2xl font-bold tabular-nums text-[#E63946]">{formatVnd(order.grandTotal)}</p>
        </div>
        {order.payment && (
          <p className="mt-1 text-xs text-slate-600">
            Phương thức: <span className="font-semibold">{PAYMENT_METHOD[order.payment.method]}</span>
          </p>
        )}
      </div>
      {payAction && (
        <Link
          href={`/customer/orders/${encodeURIComponent(order.orderNumber)}/payment`}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0A2744]"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          {payAction}
        </Link>
      )}
    </section>
  );
}

/** Who to call about the order. The number is the site's own hotline. */
export function SupportCard() {
  return (
    <section className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#EAF2FB] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F3860]">
        <Headset className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">Cần trợ giúp về đơn hàng?</p>
        <p className="text-xs text-slate-600">Tổng đài {SUPPORT_HOTLINE.display} luôn sẵn sàng hỗ trợ.</p>
      </div>
      <a
        href={`tel:${SUPPORT_HOTLINE.tel}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0F3860] px-3 py-2 text-xs font-bold text-white hover:bg-[#0A2744]"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
        Gọi ngay
      </a>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
