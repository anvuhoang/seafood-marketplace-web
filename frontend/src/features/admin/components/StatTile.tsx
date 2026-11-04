import { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string;
  /** One line of context under the value, e.g. a split or a period. */
  meta?: ReactNode;
  icon: ReactNode;
}

export function StatTile({ label, value, meta, icon }: StatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-600">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[28px] leading-none font-bold tracking-tight text-slate-900">{value}</p>
      {meta && <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta}</p>}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-7 w-32 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
