const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** 13130000 -> "13.130.000 ₫" */
export function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} ₫`;
}

/** Short money for axes: 2500000 -> "2,5 tr", 1200000000 -> "1,2 tỷ", 0 -> "0". */
export function formatCompactVnd(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1_000_000_000) return `${number.format(value / 1_000_000_000)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${number.format(value / 1_000_000)} tr`;
  return `${number.format(value / 1_000)}k`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/** "2026-11" -> { short: "T11", long: "Tháng 11/2026" } */
export function describeMonth(month: string): { short: string; long: string } {
  const [year, number] = month.split("-");
  return { short: `T${Number(number)}`, long: `Tháng ${Number(number)}/${year}` };
}

const MAX_INTERVALS = 5;

/**
 * Axis ticks from 0 up to the first round step that covers `value`, with at
 * most five intervals: 4.08 tr gives 0, 1, 2, 3, 4, 5 tr rather than a 8 tr
 * axis that leaves the columns squashed at the bottom.
 */
export function niceAxisTicks(value: number): number[] {
  if (value <= 0) return [0, 250_000, 500_000, 750_000, 1_000_000];
  const exponent = 10 ** Math.floor(Math.log10(value / MAX_INTERVALS));
  const step = [1, 2, 2.5, 5, 10].map((base) => base * exponent).find((candidate) => value / candidate <= MAX_INTERVALS) ?? 10 * exponent;
  const intervals = Math.ceil(value / step);
  return Array.from({ length: intervals + 1 }, (_, index) => index * step);
}
