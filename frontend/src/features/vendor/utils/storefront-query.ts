import { VendorStorefrontProduct } from "../types/vendor.types";

export const STOREFRONT_PAGE_SIZE = 8;

export const PRICE_RANGES = [
  { key: "under-200k", label: "Dưới 200.000đ", min: 0, max: 200_000 },
  { key: "200k-500k", label: "200.000đ - 500.000đ", min: 200_000, max: 500_000 },
  { key: "500k-1m", label: "500.000đ - 1.000.000đ", min: 500_000, max: 1_000_000 },
  { key: "over-1m", label: "Trên 1.000.000đ", min: 1_000_000, max: Infinity },
] as const;

export const SORT_OPTIONS = [
  { key: "featured", label: "Nổi bật" },
  { key: "price-asc", label: "Giá thấp đến cao" },
  { key: "price-desc", label: "Giá cao đến thấp" },
  { key: "name", label: "Tên A - Z" },
] as const;

export type StorefrontTab = "products" | "info";
export type PriceRangeKey = (typeof PRICE_RANGES)[number]["key"];
export type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export interface StorefrontQuery {
  category?: string;
  price?: PriceRangeKey;
  sort: SortKey;
  page: number;
  tab: StorefrontTab;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse storefront search params, dropping unknown values instead of failing.
 */
export function parseStorefrontQuery(params: RawSearchParams): StorefrontQuery {
  const price = firstValue(params.price);
  const sort = firstValue(params.sort);
  const page = Number.parseInt(firstValue(params.page) ?? "1", 10);

  return {
    category: firstValue(params.category) || undefined,
    price: PRICE_RANGES.some((range) => range.key === price)
      ? (price as PriceRangeKey)
      : undefined,
    sort: SORT_OPTIONS.some((option) => option.key === sort)
      ? (sort as SortKey)
      : "featured",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    tab: firstValue(params.tab) === "info" ? "info" : "products",
  };
}

/**
 * Build a storefront URL from the current query plus overrides.
 * Changing a filter or the sort order resets pagination to the first page.
 */
export function buildStorefrontHref(
  slug: string,
  query: StorefrontQuery,
  overrides: Partial<StorefrontQuery>,
): string {
  const next = { ...query, ...overrides };

  if (!("page" in overrides)) {
    next.page = 1;
  }

  const params = new URLSearchParams();
  if (next.tab !== "products") params.set("tab", next.tab);
  if (next.category) params.set("category", next.category);
  if (next.price) params.set("price", next.price);
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const search = params.toString();
  return `/vendor/${slug}${search ? `?${search}` : ""}`;
}

/**
 * Apply the price filter, sort order and pagination to the vendor's products.
 * Category filtering already happens on the backend.
 */
export function applyStorefrontQuery(
  products: VendorStorefrontProduct[],
  query: StorefrontQuery,
) {
  const range = PRICE_RANGES.find((r) => r.key === query.price);
  const filtered = range
    ? products.filter((p) => p.price >= range.min && p.price < range.max)
    : products;

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name, "vi");
      default:
        // Featured first, then in-stock, keeping backend order otherwise.
        return Number(b.isFeatured) - Number(a.isFeatured) || Number(b.inStock) - Number(a.inStock);
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / STOREFRONT_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * STOREFRONT_PAGE_SIZE;

  return {
    items: sorted.slice(start, start + STOREFRONT_PAGE_SIZE),
    totalItems: sorted.length,
    page,
    totalPages,
  };
}
