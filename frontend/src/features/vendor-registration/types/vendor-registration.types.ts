export type VendorRegistrationStatus = "NONE" | "PENDING" | "REJECTED" | "ACTIVE" | "SUSPENDED";
export type AccountRole = "CUSTOMER" | "VENDOR" | "ADMIN";

/** A province, district or ward from the GSO catalogue served by the API. */
export interface AdministrativeUnit {
  code: string;
  name: string;
}

export interface VendorApplication {
  name: string;
  slug: string;
  contactPhone: string | null;
  province: string;
  district: string;
  ward: string | null;
  provinceCode: string | null;
  districtCode: string | null;
  wardCode: string | null;
  streetAddress: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRegistrationState {
  status: VendorRegistrationStatus;
  accountRole: AccountRole;
  application: VendorApplication | null;
  rejectionReason: string | null;
}

/** Body of POST /vendors/registration. */
export interface VendorRegistrationInput {
  name: string;
  contactPhone: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string | null;
  streetAddress: string;
  description: string | null;
}
