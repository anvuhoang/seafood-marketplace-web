import type { ShippingInput } from "../types/checkout.types";

/** The same rules the server applies; checking here only saves a round trip, the server decides. */
export const PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;
export const NOTE_MAX = 500;

export interface ShippingFormValues {
  recipientName: string;
  recipientPhone: string;
  provinceCode: string;
  province: string;
  districtCode: string;
  district: string;
  wardCode: string;
  ward: string;
  streetAddress: string;
}

export type ShippingErrors = Partial<Record<keyof ShippingFormValues | "customerNote", string>>;

export const emptyShippingForm = (recipientName = "", recipientPhone = ""): ShippingFormValues => ({
  recipientName,
  recipientPhone,
  provinceCode: "",
  province: "",
  districtCode: "",
  district: "",
  wardCode: "",
  ward: "",
  streetAddress: "",
});

/** The note is the only thing to check when a saved address is used. */
export function validateNote(customerNote: string): ShippingErrors {
  return customerNote.length > NOTE_MAX ? { customerNote: `Ghi chú tối đa ${NOTE_MAX} ký tự.` } : {};
}

export function validateShipping(values: ShippingFormValues, customerNote: string): ShippingErrors {
  const errors: ShippingErrors = {};
  const name = values.recipientName.trim();
  if (name.length < 2) errors.recipientName = name ? "Tên người nhận phải có tối thiểu 2 ký tự." : "Vui lòng nhập tên người nhận.";
  if (name.length > 150) errors.recipientName = "Tên người nhận tối đa 150 ký tự.";
  if (!PHONE_PATTERN.test(values.recipientPhone.trim())) errors.recipientPhone = "Số điện thoại không hợp lệ (ví dụ: 0912345678).";
  if (!values.province) errors.province = "Vui lòng chọn tỉnh/thành phố.";
  if (!values.district) errors.district = "Vui lòng chọn quận/huyện.";
  const street = values.streetAddress.trim();
  if (street.length < 3) errors.streetAddress = "Vui lòng nhập số nhà, tên đường.";
  if (street.length > 255) errors.streetAddress = "Địa chỉ tối đa 255 ký tự.";
  return { ...errors, ...validateNote(customerNote) };
}

export function toShippingInput(values: ShippingFormValues): ShippingInput {
  return {
    recipientName: values.recipientName.trim(),
    recipientPhone: values.recipientPhone.trim(),
    province: values.province,
    district: values.district,
    ...(values.ward && { ward: values.ward }),
    streetAddress: values.streetAddress.trim(),
  };
}

export const hasErrors = (errors: ShippingErrors) => Object.keys(errors).length > 0;
