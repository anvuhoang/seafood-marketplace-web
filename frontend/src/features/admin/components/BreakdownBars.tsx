import { formatCount } from "../utils/format";

export interface BreakdownRow {
  label: string;
  value: number;
}

/**
 * One whole split into named parts. Thin bars share a baseline and one hue, so
 * the parts compare exactly; the figure sits at the end of each row.
 */
export function BreakdownBars({ rows, label }: { rows: BreakdownRow[]; label: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <ul className="space-y-3.5" aria-label={label}>
      {rows.map((row) => {
        const share = total > 0 ? (row.value / total) * 100 : 0;
        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-slate-700">{row.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold text-slate-900">{formatCount(row.value)}</span>
                <span className="ml-1.5 text-xs text-slate-500">{Math.round(share)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0F3860] transition-[width] duration-500"
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
