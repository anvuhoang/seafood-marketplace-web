import { ApiProperty } from '@nestjs/swagger';
import { ProductListingItemDto } from '../../product/dto/product-listing.dto.js';
import { IMAGE_QUALITIES, type ConfidenceLevel, type ImageQuality } from '../normalize-prediction.js';

export const VISUAL_SEARCH_OUTCOMES = ['matched', 'no_products', 'uncertain', 'not_seafood'] as const;
export type VisualSearchOutcome = (typeof VISUAL_SEARCH_OUTCOMES)[number];

export const VISUAL_SEARCH_MATCHED_BY = ['species', 'category', 'keyword'] as const;
export type VisualSearchMatchedBy = (typeof VISUAL_SEARCH_MATCHED_BY)[number];

export class VisualSearchStatusDto {
  /** False until the AI service is configured; the page then offers keyword search instead. @example true */
  enabled: boolean;
}

export class VisualSearchPredictionDto {
  /** The species' name from the catalogue when known, otherwise the model's short label. @example "Tôm sú" */
  label: string | null;
  /** @example "Penaeus monodon" */
  scientificName: string | null;
  /** A species from the catalogue, or null. @example "tom-su-bien" */
  speciesSlug: string | null;
  /** An active category, or null. @example "tom-song" */
  categorySlug: string | null;
  /**
   * How sure the model says it is, from 0 to 1. Judged by the model itself,
   * not a calibrated probability.
   * @example 0.82
   */
  confidence: number;
  /** high ≥ 0.75, medium ≥ 0.5, low below. */
  @ApiProperty({ enum: ['high', 'medium', 'low'] })
  confidenceLevel: ConfidenceLevel;
  /** Up to 3 things visible in the photo, in Vietnamese. @example ["Vỏ có vằn đen ngang thân"] */
  features: string[];
}

export class VisualSearchAlternativeDto {
  /** @example "Tôm thẻ chân trắng" */
  label: string;
  /** @example "tom-the-chan-trang" */
  speciesSlug: string;
  /** @example 0.12 */
  confidence: number;
}

export class VisualSearchResultDto {
  /**
   * matched: products found. no_products: recognised, but nothing of it is for
   * sale. uncertain: low confidence or nothing in the catalogue fits.
   * not_seafood: the photo does not show seafood.
   */
  @ApiProperty({ enum: VISUAL_SEARCH_OUTCOMES })
  outcome: VisualSearchOutcome;
  /** Null when the photo is not seafood. */
  @ApiProperty({ type: VisualSearchPredictionDto, nullable: true })
  prediction: VisualSearchPredictionDto | null;
  alternatives: VisualSearchAlternativeDto[];
  @ApiProperty({ enum: IMAGE_QUALITIES })
  imageQuality: ImageQuality;
  /** How the products were found; null when there are none. */
  @ApiProperty({ enum: VISUAL_SEARCH_MATCHED_BY, nullable: true })
  matchedBy: VisualSearchMatchedBy | null;
  /** Up to 8 products for sale, the same shape as GET /products items. */
  products: ProductListingItemDto[];
  /** Every product that matched, of which `products` is the first page. @example 3 */
  totalProducts: number;
  /** Keywords for /products?q=… to see more or search by hand. @example "Tôm sú" */
  searchQuery: string | null;
  /** @example "Kết quả nhận diện do AI gợi ý từ hình ảnh và có thể chưa chính xác. Vui lòng xem kỹ thông tin sản phẩm trước khi đặt mua." */
  disclaimer: string;
}
