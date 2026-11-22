import { ApiProperty } from '@nestjs/swagger';

export class ProductSpeciesDto {
  id: string;
  commonName: string;
  scientificName: string | null;
  slug: string;
  description: string | null;
}

export class ProductCategoryDto {
  id: string;
  name: string;
  slug: string;
}

export class ProductImageDto {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export class ProductVendorDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  /** Street, district and province in one line. */
  address: string;
  province: string;
  district: string;
  ratingAverage: number;
  ratingCount: number;
  verified: boolean;
}

/** Only facts stored in the database; other spec fields are not modelled yet. */
export class ProductSpecificationsDto {
  commonName: string | null;
  scientificName: string | null;
  origin: string | null;
}

export class ProductReviewDto {
  id: string;
  /** Masked (e.g. "n***n") when the review is anonymous. */
  authorName: string;
  rating: number;
  content: string | null;
  imageUrls: string[];
  createdAt: string;
}

export class ReviewsSummaryDto {
  ratingAverage: number;
  reviewCount: number;
  /** Review count per star, keyed 1-5. */
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' }, example: { 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 } })
  ratingBreakdown: Record<number, number>;
  reviews: ProductReviewDto[];
}

export class PreparationOptionDto {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export class ProductDetailDto {
  /** @example "0b6f6d3e-6a3f-4d6e-9b1a-2f7c9d1e4a55" */
  id: string;
  /** @example "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)" */
  name: string;
  /** @example "tom-su-bien-tuoi-song-loai-1" */
  slug: string;
  description: string | null;
  /**
   * ACTIVE, or INACTIVE for a discontinued product.
   * @example "ACTIVE"
   */
  status: string;
  isFeatured: boolean;
  /** @example "SBD-TZ04-QSC" */
  sku: string | null;
  /** @example "kg" */
  unit: string;
  /**
   * Size of the displayed variant.
   * @example "15 - 20 con/kg"
   */
  sizeLabel: string | null;
  /**
   * Price in VND per unit, from the chosen offer of an ACTIVE vendor.
   * null when no ACTIVE vendor offers the product (offers of pending, rejected
   * or suspended vendors are never exposed), so 0 never stands for "no price".
   * @example 420000
   */
  price: number | null;
  /** Not stored yet; null until vendors can set a list price. */
  originalPrice: number | null;
  discountPercent: number | null;
  stock: number;
  inStock: boolean;
  isDiscontinued: boolean;
  /** Offer the price and stock come from; null when nothing is for sale. */
  offerId: string | null;
  species: ProductSpeciesDto | null;
  categories: ProductCategoryDto[];
  images: ProductImageDto[];
  /** The seller of the displayed offer; null when no approved vendor sells it. */
  vendor: ProductVendorDto | null;
  specifications: ProductSpecificationsDto;
  reviewsSummary: ReviewsSummaryDto;
  preparationOptions: PreparationOptionDto[];
}
