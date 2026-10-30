import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PRODUCT_SORT_KEYS = ['featured', 'newest', 'price-asc', 'price-desc'] as const;
export type ProductSortKey = (typeof PRODUCT_SORT_KEYS)[number];

export const PRODUCT_LISTING_MAX_LIMIT = 48;

/**
 * Query for GET /products. Multi-value filters are comma-separated slugs,
 * e.g. `category=tom-song,cua-ghe`.
 */
export class ProductListingQueryDto {
  @ApiPropertyOptional({ example: 'tom-song,cua-ghe' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'phu-quoc', description: 'Vendor district slug' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'vua-thuy-san-phu-quoc-xanh' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: 'true' | 'false';

  @ApiPropertyOptional({ enum: PRODUCT_SORT_KEYS, default: 'featured' })
  @IsOptional()
  @IsIn(PRODUCT_SORT_KEYS)
  sort?: ProductSortKey;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRODUCT_LISTING_MAX_LIMIT)
  limit?: number;
}

export interface ProductListingItemDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  speciesName: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  inStock: boolean;
  /** Stock of the displayed offer. */
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

export interface RegionSummaryDto {
  /** Same key as the `region` listing filter, e.g. "phu-quoc". */
  key: string;
  district: string;
  province: string;
  productCount: number;
  vendorCount: number;
  /** Most common category names among the region's products. */
  topCategories: string[];
}

export interface FacetOptionDto {
  value: string;
  label: string;
  count: number;
}

export interface ProductListingDto {
  items: ProductListingItemDto[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  /** Sellable products across the whole marketplace, before filters. */
  totalProducts: number;
  /** Option counts for each filter, applying every other active filter. */
  facets: {
    categories: FacetOptionDto[];
    regions: FacetOptionDto[];
    vendors: FacetOptionDto[];
  };
}
