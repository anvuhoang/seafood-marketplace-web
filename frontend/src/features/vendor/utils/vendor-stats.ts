import { STATS_RANGES } from "../types/vendor-stats.types";
import type { StatsRange, VendorStatsQuery } from "../types/vendor-stats.types";

export const RANGE_LABELS: Record<StatsRange, string> = {
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  custom: "Tùy chọn",
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The period on the URL (?range=...&from=...&to=...), falling back to the last 30 days. */
export function readStatsQuery(params: { get(name: string): string | null }): VendorStatsQuery {
  const range = params.get("range");
  if (!range || !(STATS_RANGES as readonly string[]).includes(range)) return { range: "30d" };
  if (range !== "custom") return { range: range as StatsRange };
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  return { range: "custom", from: DAY_PATTERN.test(from) ? from : undefined, to: DAY_PATTERN.test(to) ? to : undefined };
}

/** Today in Vietnam time, for the date inputs' max. */
export function vietnamToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Short money for axes and bar labels: 2500000 -> "2,5 tr", 1200000000 -> "1,2 tỷ", 0 -> "0". */
export function formatCompactMoney(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1_000_000_000) return `${number.format(value / 1_000_000_000)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${number.format(value / 1_000_000)} tr`;
  return `${number.format(value / 1_000)}k`;
}

/** "1.5" -> "1,5"; quantities keep up to three decimals. */
export function formatAmount(value: string | number): string {
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

/** "2026-11-19" -> "19/11" (short) or "19/11/2026" (long), and the weekday. */
export function describeDay(day: string): { short: string; long: string; weekday: string } {
  const [year, month, date] = day.split("-");
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  return { short: `${date}/${month}`, long: `${date}/${month}/${year}`, weekday };
}

const MAX_INTERVALS = 4;

/** Axis ticks from 0 up to the first round step that covers `value`, at most four intervals. */
export function niceAxisTicks(value: number): number[] {
  if (value <= 0) return [0, 250_000, 500_000, 750_000, 1_000_000];
  const exponent = 10 ** Math.floor(Math.log10(value / MAX_INTERVALS));
  const step =
    [1, 2, 2.5, 5, 10].map((base) => base * exponent).find((candidate) => value / candidate <= MAX_INTERVALS) ?? 10 * exponent;
  return Array.from({ length: Math.ceil(value / step) + 1 }, (_, index) => index * step);
}

/** Show every n-th axis label so long periods stay readable (at most about `max` labels). */
export function labelStep(count: number, max: number): number {
  return Math.max(1, Math.ceil(count / max));
}
