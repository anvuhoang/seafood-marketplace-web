import { CategorySummary } from "../types/category.types";

import { API_BASE_URL } from "@/lib/api-base";

/**
 * Fetch active seafood categories with their product counts.
 */
export async function getCategories(): Promise<CategorySummary[]> {
  const res = await fetch(`${API_BASE_URL}/categories`, { next: { revalidate: 10 } });

  if (!res.ok) {
    throw new Error(`Category list request failed with status ${res.status}`);
  }

  return res.json();
}
