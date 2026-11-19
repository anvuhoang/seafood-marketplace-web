import { cn } from "@/lib/utils";
import type { StatusStyle } from "../constants/order-status";

/** A small pill for an order, vendor order or payment status from the shared label tables. */
export function StatusBadge({ style, className }: { style: StatusStyle; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
