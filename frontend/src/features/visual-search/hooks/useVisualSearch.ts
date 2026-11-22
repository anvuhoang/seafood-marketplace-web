"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  VISUAL_SEARCH_ACCEPTED_TYPES,
  VISUAL_SEARCH_MAX_BYTES,
  getVisualSearchEnabled,
  searchByImage,
} from "../api/visual-search.api";
import type { VisualSearchResult } from "../types/visual-search.types";
import { prepareImage } from "../utils/prepare-image";

export interface SelectedImage {
  file: File;
  /** Object URL for the preview. */
  url: string;
}

export type VisualSearchStatus =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; result: VisualSearchResult }
  /** `statusCode` is the HTTP status, or 0 when the server could not be reached. */
  | { kind: "error"; message: string; statusCode: number | null };

/**
 * The last finished search, kept in memory only (never stored) so "Xem chi tiết"
 * on the home page can open /visual-search without uploading the photo again.
 */
let lastSearch: { image: SelectedImage; result: VisualSearchResult } | null = null;

function rememberSearch(image: SelectedImage, result: VisualSearchResult) {
  if (lastSearch && lastSearch.image.url !== image.url) URL.revokeObjectURL(lastSearch.image.url);
  lastSearch = { image, result };
}

/**
 * Shared state for the home page block and the /visual-search page: the chosen
 * photo, its checks, the request (cancelled when the photo changes) and the result.
 */
export function useVisualSearch({ resume = false }: { resume?: boolean } = {}) {
  const { accessToken } = useAuth();
  const [image, setImage] = useState<SelectedImage | null>(() => (resume ? (lastSearch?.image ?? null) : null));
  const [status, setStatus] = useState<VisualSearchStatus>(() =>
    resume && lastSearch ? { kind: "done", result: lastSearch.result } : { kind: "idle" },
  );
  const [inputError, setInputError] = useState<string | null>(null);
  /** null while unknown; the search is still offered then and the server decides. */
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getVisualSearchEnabled(controller.signal)
      .then(setEnabled)
      .catch(() => {
        // Unknown: let the search itself report the problem.
      });
    return () => controller.abort();
  }, []);

  // Release the preview URL when the photo changes, unless it is the remembered search.
  useEffect(() => {
    return () => {
      if (image && image.url !== lastSearch?.image.url) URL.revokeObjectURL(image.url);
    };
  }, [image]);

  // Cancel a pending search when the component goes away.
  useEffect(() => () => requestRef.current?.abort(), []);

  const cancelPending = () => {
    requestRef.current?.abort();
    requestRef.current = null;
  };

  const selectFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!VISUAL_SEARCH_ACCEPTED_TYPES.includes(file.type)) {
      setInputError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > VISUAL_SEARCH_MAX_BYTES) {
      setInputError("Ảnh tối đa 10MB.");
      return;
    }
    cancelPending();
    setInputError(null);
    setStatus({ kind: "idle" });
    setImage({ file, url: URL.createObjectURL(file) });
  }, []);

  const clearImage = useCallback(() => {
    cancelPending();
    setImage(null);
    setInputError(null);
    setStatus({ kind: "idle" });
  }, []);

  const search = useCallback(async () => {
    if (!image) return;
    cancelPending();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus({ kind: "searching" });

    try {
      const prepared = await prepareImage(image.file);
      const result = await searchByImage(prepared, { token: accessToken, signal: controller.signal });
      if (controller.signal.aborted) return;
      rememberSearch(image, result);
      setStatus({ kind: "done", result });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus({
        kind: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Không nhận diện được ảnh. Vui lòng thử ảnh khác hoặc tìm bằng từ khóa.",
        statusCode: error instanceof ApiError ? error.statusCode : null,
      });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, [image, accessToken]);

  return { image, status, inputError, enabled, selectFile, clearImage, search };
}
