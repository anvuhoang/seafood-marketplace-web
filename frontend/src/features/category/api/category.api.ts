import { CategorySummary } from "../types/category.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch active seafood categories with their product counts.
 */
export async function getCategories(): Promise<CategorySummary[]> {
  const res = await fetch(`${API_BASE_URL}/categories`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Category list request failed with status ${res.status}`);
  }

  return res.json();
}
