import type {
  VendorStore,
  VendorStoreEditableField,
  VendorStoreUpdate,
} from "../types/vendor-store.types";

/** Form values: every editable field as a string, "" meaning empty. */
export type VendorStoreFormValues = Record<VendorStoreEditableField, string>;
export type VendorStoreFormErrors = Partial<Record<VendorStoreEditableField, string>>;

/** Same limits as UpdateVendorStoreDto in the API. */
export const STORE_LIMITS = {
  nameMin: 2,
  nameMax: 180,
  descriptionMax: 2000,
  emailMax: 255,
  regionMax: 100,
  streetAddressMax: 255,
} as const;

const EDITABLE_FIELDS: VendorStoreEditableField[] = [
  "name",
  "description",
  "logoUrl",
  "coverUrl",
  "phone",
  "email",
  "province",
  "district",
  "ward",
  "streetAddress",
];

/** Required columns: they are never sent as null. */
const REQUIRED_FIELDS = new Set<VendorStoreEditableField>(["name", "province", "district", "streetAddress"]);

const VIETNAM_PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toFormValues(store: VendorStore): VendorStoreFormValues {
  return Object.fromEntries(
    EDITABLE_FIELDS.map((field) => [field, store[field] ?? ""]),
  ) as VendorStoreFormValues;
}

/** Only the fields that changed; cleared optional fields become null. */
export function buildStoreUpdate(
  initial: VendorStoreFormValues,
  values: VendorStoreFormValues,
): VendorStoreUpdate {
  const update: VendorStoreUpdate = {};
  for (const field of EDITABLE_FIELDS) {
    const next = values[field].trim();
    if (next === initial[field].trim()) continue;
    update[field] = next === "" && !REQUIRED_FIELDS.has(field) ? null : next;
  }
  return update;
}

export function validateStoreForm(values: VendorStoreFormValues): VendorStoreFormErrors {
  const errors: VendorStoreFormErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();

  if (!name) errors.name = "Vui lòng nhập tên gian hàng.";
  else if (name.length < STORE_LIMITS.nameMin) errors.name = "Tên gian hàng phải có tối thiểu 2 ký tự.";
  else if (name.length > STORE_LIMITS.nameMax) errors.name = "Tên gian hàng tối đa 180 ký tự.";

  if (values.description.trim().length > STORE_LIMITS.descriptionMax) {
    errors.description = "Mô tả tối đa 2000 ký tự.";
  }

  if (phone && !VIETNAM_PHONE_PATTERN.test(phone)) {
    errors.phone = "Số điện thoại không hợp lệ (ví dụ: 0912345678).";
  }

  if (email && !EMAIL_PATTERN.test(email)) errors.email = "Email không hợp lệ.";
  else if (email.length > STORE_LIMITS.emailMax) errors.email = "Email tối đa 255 ký tự.";

  const required: Array<[VendorStoreEditableField, string, number]> = [
    ["province", "tỉnh/thành phố", STORE_LIMITS.regionMax],
    ["district", "quận/huyện", STORE_LIMITS.regionMax],
    ["streetAddress", "địa chỉ", STORE_LIMITS.streetAddressMax],
  ];
  for (const [field, label, max] of required) {
    const value = values[field].trim();
    if (!value) errors[field] = `Vui lòng nhập ${label}.`;
    else if (value.length > max) errors[field] = `${label[0]!.toUpperCase()}${label.slice(1)} tối đa ${max} ký tự.`;
  }

  if (values.ward.trim().length > STORE_LIMITS.regionMax) errors.ward = "Phường/xã tối đa 100 ký tự.";

  return errors;
}

/** Which field each API validation message belongs to (the API words them per field). */
const MESSAGE_FIELDS: Array<[RegExp, VendorStoreEditableField]> = [
  [/tên gian hàng/i, "name"],
  [/mô tả/i, "description"],
  [/số điện thoại/i, "phone"],
  [/email/i, "email"],
  [/tỉnh\/thành/i, "province"],
  [/quận\/huyện/i, "district"],
  [/phường\/xã/i, "ward"],
  [/địa chỉ/i, "streetAddress"],
];

/**
 * Splits API messages into per-field errors and the rest (shown above the form).
 * Image errors are not tied to a field, since the API does not say which image.
 */
export function mapApiMessages(messages: string[]): { fields: VendorStoreFormErrors; other: string[] } {
  const fields: VendorStoreFormErrors = {};
  const other: string[] = [];
  for (const message of messages) {
    const match = MESSAGE_FIELDS.find(([pattern]) => pattern.test(message));
    if (match && !fields[match[1]]) fields[match[1]] = message;
    else if (!match) other.push(message);
  }
  return { fields, other };
}
