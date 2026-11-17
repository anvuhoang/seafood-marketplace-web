import type { VendorStorefrontStatus } from "./vendor.types";

/** The signed-in vendor's own store (GET/PATCH /vendors/me/store). */
export interface VendorStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  status: VendorStorefrontStatus;
  updatedAt: string;
  imageUploadEnabled: boolean;
}

/** Fields the vendor can edit. Slug and status are set elsewhere. */
export type VendorStoreEditableField =
  | "name"
  | "description"
  | "logoUrl"
  | "coverUrl"
  | "phone"
  | "email"
  | "province"
  | "district"
  | "ward"
  | "streetAddress";

/** Partial update: omitted fields are kept, null clears an optional field. */
export type VendorStoreUpdate = Partial<Record<VendorStoreEditableField, string | null>>;

export interface VendorStoreUploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSizeBytes: number;
}
