export interface ProductListingItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  speciesName: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  /** The offer behind the price, stock and vendor shown; this is what the cart adds. */
  offerId: string;
  inStock: boolean;
  stock: number;
  price: number;
  unit: string;
  vendor: {
    name: string;
    slug: string;
    district: string;
    province: string;
  };
  categories: Array<{ name: string; slug: string }>;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface ProductListing {
  items: ProductListingItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  totalProducts: number;
  facets: {
    categories: FacetOption[];
    regions: FacetOption[];
    vendors: FacetOption[];
  };
}

export interface RegionSummary {
  key: string;
  district: string;
  province: string;
  productCount: number;
  vendorCount: number;
  topCategories: string[];
}
