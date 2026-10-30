export interface CategorySummaryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  /** A few species names for sale in the category (list endpoint only). */
  examples: string[];
}

export interface CategoryProductDto {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price: number;
  inStock: boolean;
  isFeatured: boolean;
  speciesName: string | null;
  imageUrl: string | null;
  vendor: {
    name: string;
    slug: string;
  };
}

export interface CategoryListingDto {
  category: CategorySummaryDto;
  products: CategoryProductDto[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
