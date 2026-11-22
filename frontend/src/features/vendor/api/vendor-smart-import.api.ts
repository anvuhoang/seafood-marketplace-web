import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { SmartImportDraft } from "../types/vendor-smart-import.types";

import { API_BASE_URL } from "@/lib/api-base";
const BASE = `${API_BASE_URL}/vendors/me/smart-import`;

/** Longest description the API accepts. */
export const SMART_IMPORT_TEXT_MAX = 2000;

/** Whether the server has an AI service set up. The key itself never reaches the browser. */
export async function getSmartImportEnabled(token: string): Promise<boolean> {
  const status = await authenticatedRequest<{ enabled: boolean }>(`${BASE}/status`, token, { cache: "no-store" });
  return status.enabled;
}

/** Turns a short recording into text the vendor can correct. The recording is not stored. */
export async function transcribeRecording(token: string, recording: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", recording, "recording");
  // No Content-Type here: the browser adds the multipart boundary itself.
  const result = await authenticatedRequest<{ text: string }>(`${BASE}/transcribe`, token, {
    method: "POST",
    body: form,
  });
  return result.text;
}

/** Builds an editable draft from a description. Nothing is saved by this call. */
export function createSmartDraft(token: string, text: string): Promise<SmartImportDraft> {
  return authenticatedRequest<SmartImportDraft>(`${BASE}/draft`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
