const VND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const QUANTITY = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const DATE = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** Amounts come from the API as decimal strings. */
export const formatVnd = (value: string | number) => `${VND.format(Number(value))} đ`;
export const formatQuantity = (value: string | number) => QUANTITY.format(Number(value));
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));
export const formatDate = (iso: string) => DATE.format(new Date(iso));

/** "42 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. HCM" without repeating parts already in the street line. */
export function fullAddress(recipient: { address: string; ward: string | null; district: string; province: string }): string {
  const parts = [recipient.address];
  for (const part of [recipient.ward, recipient.district, recipient.province]) {
    if (part && !recipient.address.includes(part)) parts.push(part);
  }
  return parts.join(", ");
}

/** The message of a failed request, or a fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
