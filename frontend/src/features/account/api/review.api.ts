import { authenticatedRequest } from "@/features/auth/api/auth.api";
import {
  ReviewCenter,
  ReviewInput,
  ReviewUploadSignature,
  SubmittedReview,
} from "../types/review.types";

import { API_BASE_URL } from "@/lib/api-base";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function getReviewCenter(token: string): Promise<ReviewCenter> {
  return authenticatedRequest<ReviewCenter>(`${API_BASE_URL}/account/reviews`, token);
}

export function createReview(token: string, data: ReviewInput): Promise<SubmittedReview> {
  return authenticatedRequest<SubmittedReview>(`${API_BASE_URL}/account/reviews`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Upload one photo straight to Cloudinary with a short-lived signature from
 * the API, and return its URL. The API secret never reaches the browser.
 */
export async function uploadReviewImage(token: string, file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
  }

  const signature = await authenticatedRequest<ReviewUploadSignature>(
    `${API_BASE_URL}/account/reviews/upload-signature`,
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
