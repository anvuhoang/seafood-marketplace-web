import { ApiError, authenticatedRequest } from "@/features/auth/api/auth.api";
import type {
  AdministrativeUnit,
  VendorRegistrationInput,
  VendorRegistrationState,
} from "../types/vendor-registration.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** The signed-in account's store application (status NONE when nothing was sent). */
export function getMyRegistration(token: string): Promise<VendorRegistrationState> {
  return authenticatedRequest<VendorRegistrationState>(`${API_BASE_URL}/vendors/registration/me`, token, {
    cache: "no-store",
  });
}

/** Submit a new application, or resubmit a rejected one. */
export function submitRegistration(
  token: string,
  data: VendorRegistrationInput,
): Promise<VendorRegistrationState> {
  return authenticatedRequest<VendorRegistrationState>(`${API_BASE_URL}/vendors/registration`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function getUnits(path: string): Promise<AdministrativeUnit[]> {
  // Reference data: it only changes when the bundled catalogue is updated.
  const res = await fetch(`${API_BASE_URL}/administrative-units/${path}`, { cache: "force-cache" });
  if (!res.ok) throw new ApiError("Không tải được danh sách địa giới hành chính.", res.status);
  return res.json() as Promise<AdministrativeUnit[]>;
}

export const getProvinces = () => getUnits("provinces");
export const getDistricts = (provinceCode: string) =>
  getUnits(`provinces/${encodeURIComponent(provinceCode)}/districts`);
export const getWards = (districtCode: string) =>
  getUnits(`districts/${encodeURIComponent(districtCode)}/wards`);
