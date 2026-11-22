import { Banknote, Landmark, Wallet } from "lucide-react";
import type { PaymentMethod } from "../types/checkout.types";

const OPTIONS: Array<{ method: PaymentMethod; title: string; description: string; badge?: string; icon: typeof Banknote }> = [
  {
    method: "COD",
    title: "Thanh toán khi nhận hàng (COD)",
    description: "Quý khách kiểm tra hải sản rồi mới trả tiền cho người giao.",
    badge: "Khuyên dùng",
    icon: Banknote,
  },
  {
    method: "BANK_TRANSFER",
    title: "Chuyển khoản bằng mã QR",
    description: "Quét mã QR bằng ứng dụng ngân hàng để thanh toán ngay sau khi đặt hàng.",
    icon: Landmark,
  },
  {
    method: "E_WALLET",
    title: "Ví MoMo / VNPay",
    description: "Thanh toán trước bằng ví điện tử.",
    icon: Wallet,
  },
];

interface PaymentSectionProps {
  /** What the server accepts; the others are shown but cannot be chosen. */
  supported: PaymentMethod[];
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled: boolean;
}

/** Step 3: how to pay. Only methods the server supports can be chosen. */
export function PaymentSection({ supported, selected, onSelect, disabled }: PaymentSectionProps) {
  return (
    <section aria-labelledby="payment-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div>
        <h2 id="payment-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F3860] text-[11px] text-white">3</span>
          Phương thức thanh toán
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {supported.includes("BANK_TRANSFER") ? "Chọn thanh toán khi nhận hàng hoặc chuyển khoản bằng mã QR." : "Hiện tại hệ thống hỗ trợ thanh toán khi nhận hàng."}
        </p>
      </div>

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="sr-only">Chọn phương thức thanh toán</legend>
        {OPTIONS.map(({ method, title, description, badge, icon: Icon }) => {
          const available = supported.includes(method);
          return (
            <label
              key={method}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                !available
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : selected === method
                    ? "cursor-pointer border-[#0F3860] bg-sky-50/50 ring-1 ring-[#0F3860]/20"
                    : "cursor-pointer border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={method}
                checked={selected === method}
                disabled={!available}
                onChange={() => onSelect(method)}
                className="mt-1 accent-[#0F3860]"
              />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0F3860]" aria-hidden />
              <span className="min-w-0 flex-1 text-xs">
                <span className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                  {title}
                  {available && badge && <span className="rounded bg-[#E63946] px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span>}
                  {!available && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Sắp có</span>}
                </span>
                <span className="mt-0.5 block text-slate-500">{description}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
