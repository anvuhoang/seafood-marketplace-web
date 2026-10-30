import { VendorStorefront, VendorSummary } from "../types/vendor.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch approved vendors for public discovery.
 */
export async function getActiveVendors(): Promise<VendorSummary[]> {
  const res = await fetch(`${API_BASE_URL}/vendors`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Vendor list request failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a public vendor storefront from the backend.
 * Returns null when the vendor slug does not exist.
 */
export async function getVendorStorefront(
  slug: string,
  categorySlug?: string,
): Promise<VendorStorefront | null> {
  const query = categorySlug
    ? `?category=${encodeURIComponent(categorySlug)}`
    : "";

  const res = await fetch(
    `${API_BASE_URL}/vendors/${encodeURIComponent(slug)}${query}`,
    { cache: "no-store" },
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Vendor storefront request failed with status ${res.status}`);
  }

  return res.json();
}
