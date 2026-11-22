import { Check } from "lucide-react";

const STEPS = ["Giỏ hàng", "Thông tin & Thanh toán", "Hoàn tất"];

/** The three steps of buying; `current` is 0-based. Earlier steps show a tick. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Các bước đặt hàng" className="flex items-center gap-2 text-xs">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                done ? "bg-emerald-600 text-white" : active ? "bg-[#E63946] text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={`hidden sm:inline ${active ? "font-bold text-slate-900" : "text-slate-500"}`}>{label}</span>
            {index < STEPS.length - 1 && <span className="h-px w-4 bg-slate-300 sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
