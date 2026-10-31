export const PRICE_PRESETS = [
  { label: "< 200.000đ", min: undefined, max: 200_000 },
  { label: "200k - 500k", min: 200_000, max: 500_000 },
  { label: "500k - 1.000k", min: 500_000, max: 1_000_000 },
  { label: "> 1.000.000đ", min: 1_000_000, max: undefined },
] as const;

export const SORT_OPTIONS = [
  { key: "featured", label: "Nổi bật nhất" },
  { key: "newest", label: "Mới nhất" },
  { key: "price-asc", label: "Giá thấp đến cao" },
  { key: "price-desc", label: "Giá cao đến thấp" },
] as const;

/** Same limit as the backend, which rejects longer queries. */
export const SEARCH_MAX_LENGTH = 100;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];
export type ViewMode = "grid" | "list";

export interface CatalogQuery {
  /** Search keywords; empty string when not searching. */
  q: string;
  categories: string[];
  regions: string[];
  vendors: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: SortKey;
  page: number;
  view: ViewMode;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function list(value: string | string[] | undefined): string[] {
  const raw = first(value);
  return raw ? [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))] : [];
}

function nonNegativeInt(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Parse listing search params, dropping invalid values instead of failing.
 * `fixedCategory` comes from a /categories/[slug] path.
 */
export function parseCatalogQuery(params: RawSearchParams, fixedCategory?: string): CatalogQuery {
  const sort = first(params.sort);
  const page = nonNegativeInt(params.page);
  let minPrice = nonNegativeInt(params.minPrice);
  let maxPrice = nonNegativeInt(params.maxPrice);

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const categories = list(params.category);
  if (fixedCategory && !categories.includes(fixedCategory)) {
    categories.unshift(fixedCategory);
  }

  return {
    q: (first(params.q) ?? "").trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH),
    categories,
    regions: list(params.region),
    vendors: list(params.vendor),
    minPrice,
    maxPrice,
    inStock: first(params.inStock) === "true",
    sort: SORT_OPTIONS.some((o) => o.key === sort) ? (sort as SortKey) : "featured",
    page: page && page > 0 ? page : 1,
    view: first(params.view) === "list" ? "list" : "grid",
  };
}

/**
 * Canonical listing URL for a query: a single category uses
 * /categories/[slug], anything else uses /products. Changing any filter or
 * the sort order returns to the first page.
 */
export function buildCatalogHref(query: CatalogQuery, overrides: Partial<CatalogQuery> = {}): string {
  const next = { ...query, ...overrides };
  if (!("page" in overrides)) next.page = 1;

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  const singleCategory = next.categories.length === 1 ? next.categories[0] : undefined;

  if (!singleCategory && next.categories.length > 0) params.set("category", next.categories.join(","));
  if (next.regions.length > 0) params.set("region", next.regions.join(","));
  if (next.vendors.length > 0) params.set("vendor", next.vendors.join(","));
  if (next.minPrice !== undefined) params.set("minPrice", String(next.minPrice));
  if (next.maxPrice !== undefined) params.set("maxPrice", String(next.maxPrice));
  if (next.inStock) params.set("inStock", "true");
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.view !== "grid") params.set("view", next.view);
  if (next.page > 1) params.set("page", String(next.page));

  const path = singleCategory ? `/categories/${singleCategory}` : "/products";
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Add the value to the list, or remove it if already present. */
export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** Query string for the backend GET /products endpoint. */
export function toApiSearchParams(query: CatalogQuery, limit: number): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.categories.length > 0) params.set("category", query.categories.join(","));
  if (query.regions.length > 0) params.set("region", query.regions.join(","));
  if (query.vendors.length > 0) params.set("vendor", query.vendors.join(","));
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.inStock) params.set("inStock", "true");
  params.set("sort", query.sort);
  params.set("page", String(query.page));
  params.set("limit", String(limit));
  return params;
}
