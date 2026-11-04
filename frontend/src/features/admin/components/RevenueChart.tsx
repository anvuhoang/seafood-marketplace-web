"use client";

import { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { MonthlyRevenue } from "../types/admin-stats.types";
import { describeMonth, formatCompactVnd, formatVnd, niceAxisTicks } from "../utils/format";

const PLOT_HEIGHT = 220;
const BAR_MAX_WIDTH = 24;

/**
 * Net revenue per month as columns. The latest month is the accent and earlier
 * months sit back in a lighter tint, so the eye lands on "this month". The
 * tooltip breaks a month into paid, refunded and net; a table view shows the
 * same figures for anyone who prefers numbers.
 */
export function RevenueChart({ months }: { months: MonthlyRevenue[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  const ticks = niceAxisTicks(Math.max(...months.map((month) => month.net), 0));
  const axisMax = ticks[ticks.length - 1]!;
  const lastIndex = months.length - 1;
  const hasRevenue = months.some((month) => month.net > 0);

  return (
    <div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {view === "chart" ? <Table2 className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
          {view === "chart" ? "Xem dạng bảng" : "Xem biểu đồ"}
        </button>
      </div>

      {view === "table" ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Doanh thu theo tháng</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th scope="col" className="py-2 pr-4 font-medium">Tháng</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Đã thu</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Hoàn tiền</th>
                <th scope="col" className="py-2 text-right font-medium">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {months.map((month) => (
                <tr key={month.month} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-slate-700">{describeMonth(month.month).long}</th>
                  <td className="py-2.5 pr-4 text-right text-slate-700">{formatVnd(month.paid)}</td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">{formatVnd(month.refunded)}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">{formatVnd(month.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-2 flex" role="group" aria-label="Biểu đồ doanh thu 6 tháng gần nhất">
          {/* Y axis */}
          <div className="relative w-12 shrink-0 text-right text-[11px] text-slate-500 tabular-nums" style={{ height: PLOT_HEIGHT }} aria-hidden>
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-2 -translate-y-1/2"
                style={{ bottom: `${(tick / axisMax) * 100}%` }}
              >
                {formatCompactVnd(tick)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: PLOT_HEIGHT }}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className={`absolute inset-x-0 border-t ${tick === 0 ? "border-slate-300" : "border-slate-100"}`}
                  style={{ bottom: `${(tick / axisMax) * 100}%` }}
                  aria-hidden
                />
              ))}

              <div className="absolute inset-0 flex">
                {months.map((month, index) => {
                  const height = (month.net / axisMax) * PLOT_HEIGHT;
                  const isLast = index === lastIndex;
                  const isActive = active === index;
                  const label = describeMonth(month.month);
                  return (
                    <div key={month.month} className="relative flex flex-1 items-end justify-center">
                      <button
                        type="button"
                        aria-label={`${label.long}: doanh thu ${formatVnd(month.net)}, đã thu ${formatVnd(month.paid)}, hoàn tiền ${formatVnd(month.refunded)}`}
                        onMouseEnter={() => setActive(index)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(index)}
                        onBlur={() => setActive(null)}
                        className="group absolute inset-y-0 inset-x-1 flex items-end justify-center outline-none transition-colors hover:bg-slate-50/80"
                      >
                        <span
                          className={`grow-y block w-full rounded-t-[4px] transition-colors duration-200 ${
                            isLast || isActive
                              ? "bg-brand"
                              : "bg-brand-soft"
                          } group-focus-visible:ring-2 group-focus-visible:ring-brand-ink/40 group-focus-visible:ring-offset-2`}
                          style={{
                            height: Math.max(height, month.net > 0 ? 2 : 0),
                            maxWidth: BAR_MAX_WIDTH,
                            animationDelay: `${index * 80}ms`,
                          }}
                        />
                      </button>

                      {isLast && month.net > 0 && !isActive && (
                        <span
                          className="animate-fade-in pointer-events-none absolute text-[11px] font-semibold text-slate-900 tabular-nums"
                          style={{ bottom: height + 6 }}
                        >
                          {formatCompactVnd(month.net)}
                        </span>
                      )}

                      {isActive && (
                        <div
                          role="status"
                          className={`animate-fade-in pointer-events-none absolute z-10 w-52 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md ${
                            index === 0 ? "left-0" : index === lastIndex ? "right-0" : "left-1/2 -translate-x-1/2"
                          }`}
                          style={{ bottom: Math.min(height, PLOT_HEIGHT - 96) + 10 }}
                        >
                          <p className="font-semibold text-slate-900">{label.long}</p>
                          <dl className="mt-2 space-y-1 tabular-nums">
                            <Row term="Đã thu" value={formatVnd(month.paid)} />
                            <Row term="Hoàn tiền" value={`− ${formatVnd(month.refunded)}`} />
                            <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                              <Row term="Doanh thu" value={formatVnd(month.net)} strong />
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex text-xs text-slate-500" aria-hidden>
              {months.map((month) => (
                <span key={month.month} className="flex-1 text-center">
                  {describeMonth(month.month).short}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "chart" && !hasRevenue && (
        <p className="mt-3 text-center text-sm text-slate-500">Chưa có thanh toán nào trong 6 tháng qua.</p>
      )}
    </div>
  );
}

function Row({ term, value, strong }: { term: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{term}</dt>
      <dd className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</dd>
    </div>
  );
}
