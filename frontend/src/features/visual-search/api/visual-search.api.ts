import { ApiError } from "@/features/auth/api/auth.api";
import type { VisualSearchResult } from "../types/visual-search.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const BASE = `${API_BASE_URL}/visual-search`;

export const VISUAL_SEARCH_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Limit for the original photo; it is shrunk before upload to stay under the server's 4MB. */
export const VISUAL_SEARCH_MAX_BYTES = 10 * 1024 * 1024;

/** `statusCode` of the ApiError thrown when the server cannot be reached at all. */
export const NETWORK_ERROR_STATUS = 0;

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const raw = data?.message;
    const message =
      (Array.isArray(raw) ? raw.join(", ") : raw) ||
      `Yêu cầu thất bại với mã lỗi ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return data as T;
}

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    // A cancelled request is not an error to show; let the caller ignore it.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
      NETWORK_ERROR_STATUS,
    );
  }
}

/** Whether the server has the recognition service set up. The AI key never reaches the browser. */
export async function getVisualSearchEnabled(signal?: AbortSignal): Promise<boolean> {
  const response = await send(`${BASE}/status`, { cache: "no-store", signal });
  return (await readResponse<{ enabled: boolean }>(response)).enabled;
}

/**
 * Identify the seafood in a photo and list matching products. Works for guests;
 * with a token the server counts the limit per user instead of per IP.
 */
export async function searchByImage(
  image: Blob,
  { token, signal }: { token?: string | null; signal?: AbortSignal } = {},
): Promise<VisualSearchResult> {
  const form = new FormData();
  form.append("image", image, "photo.jpg");
  // No Content-Type here: the browser adds the multipart boundary itself.
  const response = await send(BASE, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  return readResponse<VisualSearchResult>(response);
}
