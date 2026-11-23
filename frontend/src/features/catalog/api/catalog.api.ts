import { ProductListing, RegionSummary } from "../types/catalog.types";
import { CatalogQuery, toApiSearchParams } from "../utils/catalog-query";

import { API_BASE_URL } from "@/lib/api-base";

export const CATALOG_PAGE_SIZE = 12;

/**
 * Fetch products for sale with filters, facet counts and pagination.
 */
export async function getProductListing(query: CatalogQuery): Promise<ProductListing> {
  const params = toApiSearchParams(query, CATALOG_PAGE_SIZE);
  // Public lists: shown from Next's own cache for a few seconds, so a crowd of visitors does not render the page and call the API each time.
  const res = await fetch(`${API_BASE_URL}/products?${params}`, { next: { revalidate: 10 } });

  if (!res.ok) {
    throw new Error(`Product listing request failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch fishing regions where vendors currently sell products.
 */
export async function getRegions(): Promise<RegionSummary[]> {
  const res = await fetch(`${API_BASE_URL}/regions`, { next: { revalidate: 10 } });

  if (!res.ok) {
    throw new Error(`Region list request failed with status ${res.status}`);
  }

  return res.json();
}
