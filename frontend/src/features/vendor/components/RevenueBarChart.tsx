"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { VendorStatsDay } from "../types/vendor-stats.types";
import { describeDay, formatCompactMoney, labelStep, niceAxisTicks } from "../utils/vendor-stats";

/** Above this many days the bars are too thin to tab through; the table view lists every day instead. */
const FOCUSABLE_BAR_LIMIT = 31;

/**
 * Revenue per day as columns, drawn with plain divs (no chart library).
 * Hover or focus a column for the day, revenue and completed orders; the
 * table view shows the same figures for screen readers and anyone who
 * prefers numbers. `compact` is the small version on the dashboard.
 */
export function RevenueBarChart({
  days,
  label,
  compact = false,
}: {
  days: VendorStatsDay[];
  /** What the chart shows, for screen readers, e.g. "Doanh thu theo ngày từ 21/10 đến 19/11". */
  label: string;
  compact?: boolean;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);

  const values = days.map((day) => Number(day.revenue));
  const ticks = niceAxisTicks(Math.max(0, ...values));
  const axisMax = ticks[ticks.length - 1]!;
  const hasRevenue = values.some((value) => value > 0);
  const peak = Math.max(0, ...values);
  const plotHeight = compact ? 120 : 240;
  // Fewer day labels on phones, where every label needs about 40px.
  const step = labelStep(days.length, compact ? 7 : 10);
  const phoneStep = labelStep(days.length, 6);
  const focusable = days.length <= FOCUSABLE_BAR_LIMIT;
  const lastIndex = days.length - 1;

  return (
    // overflow-x-clip: the end labels may stick out a little; clip them without adding a scrollbar.
    <div className="min-w-0 overflow-x-clip">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          {view === "chart" ? <Table2 className="h-3.5 w-3.5" aria-hidden /> : <BarChart3 className="h-3.5 w-3.5" aria-hidden />}
          {view === "chart" ? "Xem dạng bảng" : "Xem biểu đồ"}
        </button>
      </div>

      {view === "table" ? (
        <div className="mt-2 max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{label}</caption>
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th scope="col" className="py-2 pr-4 font-semibold">Ngày</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Đơn hoàn tất</th>
                <th scope="col" className="py-2 text-right font-semibold">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {days.map((day) => (
                <tr key={day.date} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-slate-700">{describeDay(day.date).long}</th>
                  <td className="py-2 pr-4 text-right text-slate-700">{day.completedOrders}</td>
                  <td className="py-2 text-right font-semibold text-slate-900">{formatPrice(Number(day.revenue))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !hasRevenue ? (
        <p
          className="mt-2 flex items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500"
          style={{ height: plotHeight }}
        >
          Chưa có doanh thu trong kỳ này.
        </p>
      ) : (
        <div className="mt-2 flex" role="group" aria-label={label}>
          {!compact && (
            <div className="relative w-12 shrink-0 text-right text-[11px] text-slate-500 tabular-nums" style={{ height: plotHeight }} aria-hidden>
              {ticks.map((tick) => (
                <span key={tick} className="absolute right-2 -translate-y-1/2" style={{ bottom: `${(tick / axisMax) * 100}%` }}>
                  {formatCompactMoney(tick)}
                </span>
              ))}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: plotHeight }} onMouseLeave={() => setActive(null)}>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-slate-300" : "border-slate-100")}
                  style={{ bottom: `${(tick / axisMax) * 100}%` }}
                  aria-hidden
                />
              ))}

              <div className="absolute inset-0 flex">
                {days.map((day, index) => {
                  const value = values[index]!;
                  const height = (value / axisMax) * plotHeight;
                  const isActive = active === index;
                  const name = describeDay(day.date);
                  const barProps = {
                    onMouseEnter: () => setActive(index),
                    // Long periods leave a pixel or two per day, so the gap between bars goes.
                    className: cn(
                      "group absolute inset-y-0 flex items-end justify-center outline-none transition-colors hover:bg-slate-50/80",
                      focusable ? "inset-x-px" : "inset-x-0",
                    ),
                  };
                  const bar = (
                    <span
                      className={cn(
                        "grow-y block w-full rounded-t-[3px] transition-colors duration-200",
                        isActive || index === lastIndex || (value > 0 && value === peak) ? "bg-brand" : "bg-brand-soft",
                        "group-focus-visible:ring-2 group-focus-visible:ring-brand/40 group-focus-visible:ring-offset-1",
                      )}
                      style={{
                        height: Math.max(height, value > 0 ? 2 : 0),
                        maxWidth: compact ? 18 : 28,
                        animationDelay: `${Math.min(index, 30) * 20}ms`,
                      }}
                    />
                  );
                  return (
                    <div key={day.date} className="relative flex min-w-0 flex-1 items-end justify-center">
                      {focusable ? (
                        <button
                          type="button"
                          {...barProps}
                          aria-label={`${name.weekday} ${name.long}: doanh thu ${formatPrice(value)}, ${day.completedOrders} đơn hoàn tất`}
                          onFocus={() => setActive(index)}
                          onBlur={() => setActive(null)}
                        >
                          {bar}
                        </button>
                      ) : (
                        <span {...barProps} aria-hidden>
                          {bar}
                        </span>
                      )}

                      {isActive && (
                        <div
                          role="status"
                          className={cn(
                            "animate-fade-in pointer-events-none absolute z-10 w-48 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md",
                            index < days.length / 3 ? "left-0" : index > (days.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                          )}
                          style={{ bottom: Math.min(height, plotHeight - 80) + 8 }}
                        >
                          <p className="font-semibold text-slate-900 first-letter:uppercase">
                            {name.weekday}, {name.long}
                          </p>
                          <p className="mt-1.5 font-bold text-slate-900 tabular-nums">{formatPrice(value)}</p>
                          <p className="mt-0.5 text-slate-500">{day.completedOrders} đơn hoàn tất</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 flex text-[11px] text-slate-500 tabular-nums" aria-hidden>
              {days.map((day, index) => {
                const fromEnd = days.length - 1 - index;
                return (
                  <span
                    key={day.date}
                    // Flex alignment lets the end labels overflow inwards instead of being clipped.
                    className={cn(
                      "flex min-w-0 flex-1 overflow-visible whitespace-nowrap",
                      index === 0 ? "justify-start" : index === lastIndex ? "justify-end" : "justify-center",
                      fromEnd % phoneStep !== 0 && "max-sm:invisible",
                      fromEnd % step !== 0 && "sm:invisible",
                    )}
                  >
                    {fromEnd % step === 0 || fromEnd % phoneStep === 0 ? describeDay(day.date).short : ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
