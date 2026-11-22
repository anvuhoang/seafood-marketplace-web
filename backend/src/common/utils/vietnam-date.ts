/**
 * Calendar days in Vietnam time. Shops and customers are all in Vietnam, so a
 * "day" starts at midnight there, not at midnight UTC.
 *
 * Vietnam is UTC+7 all year (no daylight saving), so a fixed offset is exact.
 * Days are passed around as "YYYY-MM-DD" keys.
 */
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-19" for the Vietnam calendar day that `date` falls on. */
export function vietnamDayKey(date: Date): string {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of a Vietnam calendar day, or null for a malformed or impossible date like 2026-02-31. */
export function vietnamDayStart(day: string): Date | null {
  if (!DAY_KEY_PATTERN.test(day)) return null;
  const date = new Date(`${day}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return vietnamDayKey(date) === day ? date : null;
}

/** The day `days` after `day` (negative goes back). `day` must be a valid key. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** Number of days from `from` to `to`, both included. */
export function daysInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS) + 1;
}

/** Every day from `from` to `to`, both included, oldest first. */
export function eachDay(from: string, to: string): string[] {
  return Array.from({ length: Math.max(0, daysInclusive(from, to)) }, (_, index) => addDays(from, index));
}

/** First day of the month that `day` is in. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}
