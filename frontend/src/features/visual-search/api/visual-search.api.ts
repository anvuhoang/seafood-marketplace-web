import { VisualSearchResult } from "../types/visual-search.types";

export const VISUAL_SEARCH_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VISUAL_SEARCH_MAX_BYTES = 10 * 1024 * 1024;

/** Thrown while the recognition service is not wired up yet. */
export class VisualSearchUnavailableError extends Error {
  constructor() {
    super("Dịch vụ nhận diện hình ảnh chưa được kết nối. Bạn vẫn có thể tìm bằng từ khóa.");
    this.name = "VisualSearchUnavailableError";
  }
}

/**
 * Identify the seafood in a photo and list matching products.
 * TODO(visual-search): call the recognition API once the backend exposes it.
 */
export async function searchByImage(image: File): Promise<VisualSearchResult> {
  void image;
  throw new VisualSearchUnavailableError();
}
