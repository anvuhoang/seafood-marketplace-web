import { authenticatedRequest } from "@/features/auth/api/auth.api";
import { Address, AddressInput, Profile, ProfileUpdate } from "../types/account.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export function getProfile(token: string): Promise<Profile> {
  return authenticatedRequest<Profile>(`${API_BASE_URL}/account/profile`, token);
}

export function updateProfile(token: string, data: ProfileUpdate): Promise<Profile> {
  return authenticatedRequest<Profile>(`${API_BASE_URL}/account/profile`, token, json("PATCH", data));
}

export function changePassword(
  token: string,
  data: { currentPassword: string; newPassword: string },
): Promise<{ changedAt: string }> {
  return authenticatedRequest(`${API_BASE_URL}/account/password`, token, json("POST", data));
}

export function listAddresses(token: string): Promise<Address[]> {
  return authenticatedRequest<Address[]>(`${API_BASE_URL}/account/addresses`, token);
}

export function createAddress(token: string, data: AddressInput): Promise<Address> {
  return authenticatedRequest<Address>(`${API_BASE_URL}/account/addresses`, token, json("POST", data));
}

export function updateAddress(token: string, id: string, data: AddressInput): Promise<Address> {
  return authenticatedRequest<Address>(`${API_BASE_URL}/account/addresses/${id}`, token, json("PUT", data));
}

export function setDefaultAddress(token: string, id: string): Promise<Address> {
  return authenticatedRequest<Address>(`${API_BASE_URL}/account/addresses/${id}/default`, token, json("POST"));
}

export function deleteAddress(token: string, id: string): Promise<{ id: string }> {
  return authenticatedRequest(`${API_BASE_URL}/account/addresses/${id}`, token, json("DELETE"));
}
