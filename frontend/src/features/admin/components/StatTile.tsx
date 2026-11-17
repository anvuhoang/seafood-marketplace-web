import { ReactNode } from "react";
import { AnimatedNumber } from "./AnimatedNumber";

interface StatTileProps {
  label: string;
  value: number;
  format: (value: number) => string;
  /** One line of context under the value, e.g. a split or a period. */
  meta?: ReactNode;
  icon: ReactNode;
}

/** One figure in the KPI strip. The strip supplies the border and the dividers. */
export function StatTile({ label, value, format, meta, icon }: StatTileProps) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-slate-500">
        <span aria-hidden className="text-slate-400">{icon}</span>
        <p className="text-[13px] font-medium">{label}</p>
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight text-slate-900">
        <AnimatedNumber value={value} format={format} />
      </p>
      {meta && <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{meta}</p>}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="p-5 sm:p-6" aria-hidden>
      <div className="shimmer h-4 w-24 rounded" />
      <div className="shimmer mt-4 h-7 w-32 rounded" />
      <div className="shimmer mt-3 h-3 w-40 rounded" />
    </div>
  );
}
