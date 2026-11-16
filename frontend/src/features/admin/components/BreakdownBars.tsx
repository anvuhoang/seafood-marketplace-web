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
      {rows.map((row, index) => {
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
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="grow-x h-full rounded-full bg-brand"
                style={{ width: `${share}%`, animationDelay: `${index * 60}ms` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
