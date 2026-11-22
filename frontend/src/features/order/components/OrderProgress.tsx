import { Check, ClipboardCheck, Package, PackageCheck, Store, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStep } from "../utils/order-progress";
import { formatDateTime } from "../utils/order-format";

const ICONS: LucideIcon[] = [ClipboardCheck, Store, Package, Truck, PackageCheck];

const CAPTION = { done: "Hoàn tất", current: "Đang diễn ra", upcoming: "Chưa đến" } as const;

/** The steps of an order as a row of circles joined by a line: done in navy, the current one in red. */
export function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Tiến độ đơn hàng">
      {steps.map((step, index) => {
        const Icon = ICONS[index] ?? Package;
        const last = index === steps.length - 1;
        return (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className="relative flex min-w-0 flex-col items-center px-1 text-center">
            {!last && (
              <span
                aria-hidden="true"
                className={cn("absolute top-6 left-1/2 h-0.5 w-full", step.state === "done" ? "bg-[#0F3860]" : "bg-sky-100")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14",
                step.state === "done" && "bg-[#0F3860] text-white",
                step.state === "current" && "bg-[#E63946] text-white shadow-lg shadow-red-200",
                step.state === "upcoming" && "bg-sky-100 text-slate-400",
              )}
            >
              {step.state === "done" ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
            </span>
            <span
              className={cn(
                "mt-2 text-[11px] leading-tight font-bold break-words sm:text-xs",
                step.state === "current" ? "text-[#E63946]" : step.state === "done" ? "text-slate-900" : "text-slate-400",
              )}
            >
              {step.label}
            </span>
            <span className={cn("mt-0.5 text-[10px] leading-tight sm:text-[11px]", step.state === "current" ? "text-[#E63946]" : "text-slate-500")}>
              {step.time ? formatDateTime(step.time) : CAPTION[step.state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
