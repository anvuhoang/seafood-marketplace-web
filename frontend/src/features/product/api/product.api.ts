import { ProductDetail } from "../types/product.types";

import { API_BASE_URL } from "@/lib/api-base";

/**
 * Fetch seafood product details by identifier (slug or UUID).
 * Returns null when the product does not exist; throws on other failures so
 * the page can show an error instead of made-up data.
 */
export async function getProductDetail(
  identifier: string
): Promise<ProductDetail | null> {
  const res = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(identifier)}`,
    { cache: "no-store" },
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Product detail request failed with status ${res.status}`);
  }

  return res.json();
}
