import type { VendorApplication, VendorRegistrationInput } from "../types/vendor-registration.types";

/** Same limits as the API (RegisterVendorDto). */
export const REGISTRATION_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  streetAddressMax: 255,
  descriptionMax: 1000,
} as const;

export interface RegistrationForm {
  name: string;
  contactPhone: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  streetAddress: string;
  description: string;
}

export type RegistrationField = keyof RegistrationForm;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const EMPTY_FORM: RegistrationForm = {
  name: "",
  contactPhone: "",
  provinceCode: "",
  districtCode: "",
  wardCode: "",
  streetAddress: "",
  description: "",
};

/** Pre-fill from a submitted application (used when resubmitting after a rejection). */
export function formFromApplication(application: VendorApplication | null): RegistrationForm {
  if (!application) return EMPTY_FORM;
  return {
    name: application.name,
    contactPhone: application.contactPhone ?? "",
    provinceCode: application.provinceCode ?? "",
    districtCode: application.districtCode ?? "",
    wardCode: application.wardCode ?? "",
    streetAddress: application.streetAddress,
    description: application.description ?? "",
  };
}

/** "+84 912.345.678" → "0912345678", as the API stores it. */
export function normalizePhone(value: string): string {
  const compact = value.replace(/[\s.\-()]/g, "");
  return compact.startsWith("+84") ? `0${compact.slice(3)}` : compact;
}

const PHONE_PATTERN = /^0[1-9]\d{8,9}$/;

export function validateRegistration(form: RegistrationForm): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const name = form.name.trim();
  if (name.length < REGISTRATION_LIMITS.nameMin || name.length > REGISTRATION_LIMITS.nameMax) {
    errors.name = `Tên gian hàng phải từ ${REGISTRATION_LIMITS.nameMin} đến ${REGISTRATION_LIMITS.nameMax} ký tự.`;
  }
  if (!PHONE_PATTERN.test(normalizePhone(form.contactPhone))) {
    errors.contactPhone = "Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678).";
  }
  if (!form.provinceCode) errors.provinceCode = "Vui lòng chọn tỉnh/thành phố.";
  if (!form.districtCode) errors.districtCode = "Vui lòng chọn quận/huyện.";
  const street = form.streetAddress.trim();
  if (!street) errors.streetAddress = "Vui lòng nhập số nhà, tên đường.";
  else if (street.length > REGISTRATION_LIMITS.streetAddressMax) {
    errors.streetAddress = `Địa chỉ tối đa ${REGISTRATION_LIMITS.streetAddressMax} ký tự.`;
  }
  if (form.description.trim().length > REGISTRATION_LIMITS.descriptionMax) {
    errors.description = `Mô tả tối đa ${REGISTRATION_LIMITS.descriptionMax} ký tự.`;
  }
  return errors;
}

export function toInput(form: RegistrationForm): VendorRegistrationInput {
  return {
    name: form.name.trim(),
    contactPhone: normalizePhone(form.contactPhone),
    provinceCode: form.provinceCode,
    districtCode: form.districtCode,
    wardCode: form.wardCode || null,
    streetAddress: form.streetAddress.trim(),
    description: form.description.trim() || null,
  };
}

/** Lowercase without Vietnamese diacritics, so "ca mau" finds "Cà Mau". */
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export const formatDateTime = (iso: string) => dateFormat.format(new Date(iso));
