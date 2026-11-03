import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export const PRODUCT_SORT_KEYS = ['featured', 'newest', 'price-asc', 'price-desc'] as const;
export type ProductSortKey = (typeof PRODUCT_SORT_KEYS)[number];

export const PRODUCT_LISTING_MAX_LIMIT = 48;
export const PRODUCT_SEARCH_MAX_LENGTH = 100;

/**
 * Query for GET /products. Multi-value filters are comma-separated slugs,
 * e.g. `category=tom-song,cua-ghe`.
 */
export class ProductListingQueryDto {
  @ApiPropertyOptional({
    example: 'ghe xanh',
    description: 'Keywords matched against name, species, category, vendor and region (accents optional)',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(PRODUCT_SEARCH_MAX_LENGTH)
  q?: string;

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

export class ListingVendorDto {
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  /** @example "vua-thuy-san-phu-quoc-xanh" */
  slug: string;
  /** @example "Phú Quốc" */
  district: string;
  /** @example "Kiên Giang" */
  province: string;
}

export class CategoryRefDto {
  /** @example "Tôm Sống & Tự Nhiên" */
  name: string;
  /** @example "tom-song" */
  slug: string;
}

export class ProductListingItemDto {
  /** @example "0b6f6d3e-6a3f-4d6e-9b1a-2f7c9d1e4a55" */
  id: string;
  /** @example "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)" */
  name: string;
  /** @example "tom-su-bien-tuoi-song-loai-1" */
  slug: string;
  description: string | null;
  /** @example "Tôm Sú Biển Tự Nhiên" */
  speciesName: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  inStock: boolean;
  /**
   * Stock of the displayed offer.
   * @example 14
   */
  stock: number;
  /**
   * Price in VND per unit.
   * @example 420000
   */
  price: number;
  /** @example "kg" */
  unit: string;
  vendor: ListingVendorDto;
  categories: CategoryRefDto[];
}

export class RegionSummaryDto {
  /** Same key as the `region` listing filter, e.g. "phu-quoc". */
  key: string;
  district: string;
  province: string;
  productCount: number;
  vendorCount: number;
  /** Most common category names among the region's products. */
  topCategories: string[];
}

export class FacetOptionDto {
  value: string;
  label: string;
  count: number;
}

export class ListingFacetsDto {
  categories: FacetOptionDto[];
  regions: FacetOptionDto[];
  vendors: FacetOptionDto[];
}

export class ProductListingDto {
  items: ProductListingItemDto[];
  pagination: PaginationDto;
  /** Sellable products across the whole marketplace, before filters. */
  totalProducts: number;
  /** Option counts for each filter, applying every other active filter. */
  facets: ListingFacetsDto;
}
