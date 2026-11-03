export type Gender = "MALE" | "FEMALE" | "OTHER";
export type AddressLabel = "HOME" | "OFFICE" | "FAMILY" | "OTHER";

export interface Profile {
  id: string;
  customerCode: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  gender: Gender | null;
  birthDate: string | null;
  interests: string[];
  passwordChangedAt: string | null;
  createdAt: string;
}

export interface ProfileUpdate {
  fullName: string;
  phone?: string;
  gender: Gender | null;
  birthDate: string | null;
  interests: string[];
}

export interface Address {
  id: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  label: AddressLabel;
  note: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressInput {
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward?: string;
  streetAddress: string;
  label: AddressLabel;
  note?: string;
  isDefault?: boolean;
}

export const ADDRESS_LABEL_TEXT: Record<AddressLabel, string> = {
  HOME: "Nhà riêng",
  OFFICE: "Văn phòng",
  FAMILY: "Nhà người thân",
  OTHER: "Khác",
};

/** Same rule as the backend: 0xxxxxxxxx or +84xxxxxxxxx. */
export const VIETNAM_PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;
