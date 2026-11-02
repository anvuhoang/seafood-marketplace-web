import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class CategorySummaryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  /** A few species names for sale in the category (list endpoint only). */
  examples: string[];
}

export class VendorRefDto {
  name: string;
  slug: string;
}

export class CategoryProductDto {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price: number;
  inStock: boolean;
  isFeatured: boolean;
  speciesName: string | null;
  imageUrl: string | null;
  vendor: VendorRefDto;
}

export class CategoryListingDto {
  category: CategorySummaryDto;
  products: CategoryProductDto[];
  pagination: PaginationDto;
}
