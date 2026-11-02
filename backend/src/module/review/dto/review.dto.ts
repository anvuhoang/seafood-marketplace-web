import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Quick-pick highlights; the frontend owns the Vietnamese labels. */
export const REVIEW_HIGHLIGHTS = [
  'fresh-lively',
  'oxygen-packing',
  'on-time',
  'accurate-weight',
  'firm-sweet',
  'helpful-advice',
] as const;
export type ReviewHighlight = (typeof REVIEW_HIGHLIGHTS)[number];

export const REVIEW_CONTENT_MIN_LENGTH = 10;
export const REVIEW_CONTENT_MAX_LENGTH = 500;
export const REVIEW_MAX_IMAGES = 5;

export class CreateReviewDto {
  @ApiProperty({ description: 'Order item being reviewed' })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ minLength: REVIEW_CONTENT_MIN_LENGTH, maxLength: REVIEW_CONTENT_MAX_LENGTH })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(REVIEW_CONTENT_MIN_LENGTH, {
    message: `Nội dung đánh giá cần ít nhất ${REVIEW_CONTENT_MIN_LENGTH} ký tự.`,
  })
  @MaxLength(REVIEW_CONTENT_MAX_LENGTH)
  content!: string;

  @ApiPropertyOptional({ enum: REVIEW_HIGHLIGHTS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(REVIEW_HIGHLIGHTS, { each: true })
  highlights?: ReviewHighlight[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: `Up to ${REVIEW_MAX_IMAGES} Cloudinary URLs from a signed upload`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(REVIEW_MAX_IMAGES)
  @ArrayUnique()
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  imageUrls?: string[];
}

export interface ReviewUploadSignatureDto {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSizeBytes: number;
}

export interface ReviewProductDto {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface PendingReviewItemDto {
  orderItemId: string;
  orderNumber: string;
  vendorName: string;
  deliveredAt: string;
  product: ReviewProductDto;
  variantName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface SubmittedReviewDto {
  id: string;
  rating: number;
  content: string | null;
  highlights: string[];
  isAnonymous: boolean;
  isHidden: boolean;
  imageUrls: string[];
  createdAt: string;
  orderNumber: string | null;
  vendorName: string | null;
  product: ReviewProductDto;
}

export interface ReviewCenterDto {
  stats: {
    pendingCount: number;
    submittedCount: number;
    /** Average of the ratings this customer has given; 0 when none. */
    averageRating: number;
  };
  /** Display name used when posting anonymously, e.g. "n***n". */
  anonymousName: string;
  imageUploadEnabled: boolean;
  pending: PendingReviewItemDto[];
  submitted: SubmittedReviewDto[];
}
