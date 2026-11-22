/**
 * The arguments of a tool call are written by the model, so they are checked like any other input:
 * a wrong kind of value is dropped or refused, never trusted.
 */
export class ToolArgError extends Error {}

type Args = Record<string, unknown>;

/** A trimmed string cut to `max` characters, or undefined when missing or empty. */
export function optString(args: Args, key: string, max: number): string | undefined {
  const value = args[key];
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, max);
  return text === '' ? undefined : text;
}

export function reqString(args: Args, key: string, max: number): string {
  const value = optString(args, key, max);
  if (value === undefined) throw new ToolArgError(`Thiếu tham số "${key}".`);
  return value;
}

/** A whole number within [min, max], or undefined. Numbers sent as text ("200000") are accepted. */
export function optInt(args: Args, key: string, min: number, max: number): number | undefined {
  const value = typeof args[key] === 'string' ? Number(args[key]) : args[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.round(value), min), max);
}

/** A number above 0 with at most 3 decimals, as the cart wants quantities. */
export function reqQuantity(args: Args, key: string, max: number): number {
  const value = typeof args[key] === 'string' ? Number(args[key]) : args[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ToolArgError('Số lượng phải là số lớn hơn 0.');
  }
  return Math.min(Math.round(value * 1000) / 1000, max);
}

export function optBool(args: Args, key: string): boolean | undefined {
  return typeof args[key] === 'boolean' ? args[key] : undefined;
}

export function optEnum<T extends string>(args: Args, key: string, allowed: readonly T[]): T | undefined {
  const value = args[key];
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
