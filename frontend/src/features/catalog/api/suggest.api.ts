import { API_BASE_URL } from "@/lib/api-base";

export interface ProductSuggestion {
  name: string;
  slug: string;
}

/** Product names that begin like what was typed. A failure is just "no suggestions": the search itself still works. */
export async function fetchSuggestions(query: string, signal: AbortSignal): Promise<ProductSuggestion[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/search/suggest?q=${encodeURIComponent(query)}`, { signal, cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: ProductSuggestion[] };
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch {
    return [];
  }
}
