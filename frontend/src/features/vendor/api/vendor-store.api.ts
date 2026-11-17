import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type {
  VendorStore,
  VendorStoreUpdate,
  VendorStoreUploadSignature,
} from "../types/vendor-store.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const STORE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Same limit the API signs uploads with; checked before asking for a signature. */
export const STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** The store owned by the signed-in vendor. 404 when the account has none. */
export function getMyStore(token: string): Promise<VendorStore> {
  return authenticatedRequest<VendorStore>(`${API_BASE_URL}/vendors/me/store`, token, {
    cache: "no-store",
  });
}

export function updateMyStore(token: string, data: VendorStoreUpdate): Promise<VendorStore> {
  return authenticatedRequest<VendorStore>(`${API_BASE_URL}/vendors/me/store`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Upload one logo or cover straight to Cloudinary with a short-lived signature
 * from the API, and return its URL. The file is only used once the form is saved.
 */
export async function uploadStoreImage(token: string, file: File): Promise<string> {
  if (!STORE_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
  }
  if (file.size > STORE_IMAGE_MAX_BYTES) {
    throw new Error("Ảnh tối đa 5MB.");
  }

  const signature = await authenticatedRequest<VendorStoreUploadSignature>(
    `${API_BASE_URL}/vendors/me/store/upload-signature`,
    token,
    { method: "POST" },
  );

  if (file.size > signature.maxFileSizeBytes) {
    throw new Error(`Ảnh tối đa ${Math.round(signature.maxFileSizeBytes / 1024 / 1024)}MB.`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("allowed_formats", signature.allowedFormats);

  const res = await fetch(signature.uploadUrl, { method: "POST", body: form });
  const body = await res.json().catch(() => null);
  if (!res.ok || typeof body?.secure_url !== "string") {
    throw new Error("Tải ảnh lên không thành công. Vui lòng thử lại.");
  }
  return body.secure_url;
}
