import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { IsOfferPrice, IsOfferStock } from './offer-amount.validator.js';

export const OFFER_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'OUT_OF_STOCK',
  'DISCONTINUED',
] as const;
export type VendorOfferStatus = (typeof OFFER_STATUSES)[number];

/** Statuses a vendor may pick. OUT_OF_STOCK is legacy: sold-out is derived from stock = 0. */
export const SETTABLE_OFFER_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'DISCONTINUED',
] as const;
export type SettableOfferStatus = (typeof SETTABLE_OFFER_STATUSES)[number];

/** Statuses a new offer can start in. */
export const NEW_OFFER_STATUSES = ['ACTIVE', 'PAUSED'] as const;

export const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'] as const;
export type VendorProductStatus = (typeof PRODUCT_STATUSES)[number];

export const VENDOR_LIST_DEFAULT_PAGE_SIZE = 10;
export const VENDOR_LIST_MAX_PAGE_SIZE = 50;

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

class PageQueryDto {
  /** @example 1 */
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên.' })
  @Min(1, { message: 'Số trang phải từ 1 trở lên.' })
  page?: number;

  /** @example 10 */
  @ApiPropertyOptional({
    minimum: 1,
    maximum: VENDOR_LIST_MAX_PAGE_SIZE,
    default: VENDOR_LIST_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số dòng mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số dòng mỗi trang phải từ 1 trở lên.' })
  @Max(VENDOR_LIST_MAX_PAGE_SIZE, { message: 'Số dòng mỗi trang tối đa 50.' })
  pageSize?: number;

  /** Accent-insensitive keywords, e.g. "tom hum" finds "Tôm hùm". */
  @ApiPropertyOptional({ maxLength: 100, example: 'tom hum' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString({ message: 'Từ khóa tìm kiếm không hợp lệ.' })
  @MaxLength(100, { message: 'Từ khóa tìm kiếm tối đa 100 ký tự.' })
  search?: string;
}

/** Filters for the vendor's own offer list. */
export class VendorOfferQueryDto extends PageQueryDto {
  /** Without it, discontinued offers are hidden. */
  @ApiPropertyOptional({ enum: OFFER_STATUSES })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsIn(OFFER_STATUSES, { message: 'Trạng thái không hợp lệ.' })
  status?: VendorOfferStatus;

  /** Includes products in the category's direct subcategories. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID('all', { message: 'Danh mục không hợp lệ.' })
  categoryId?: string;
}

/** Search in the shared catalog when adding an offer. */
export class VendorCatalogQueryDto extends PageQueryDto {}

export class VendorCategoryRefDto {
  /** @example "8a3f1d2e-6b7c-4d8e-9f0a-1b2c3d4e5f60" */
  id: string;
  /** @example "Tôm" */
  name: string;
}

export class VendorOfferProductDto {
  /** @example "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d" */
  id: string;
  /** @example "Tôm hùm bông Nha Trang" */
  name: string;
  /** @example "tom-hum-bong-nha-trang" */
  slug: string;
  /** DRAFT means it is waiting for an admin to publish it. */
  @ApiProperty({ enum: PRODUCT_STATUSES, example: 'ACTIVE' })
  status: VendorProductStatus;
  /** True for a draft this vendor proposed; only those can be edited here. @example false */
  isOwnDraft: boolean;
  /** Primary image, or the first one. @example "https://res.cloudinary.com/demo/image/upload/v1/tom-hum.jpg" */
  imageUrl: string | null;
  categories: VendorCategoryRefDto[];
}

export class VendorOfferVariantDto {
  /** @example "2c3d4e5f-6071-4b8c-9d0e-1f2a3b4c5d6e" */
  id: string;
  /** @example "Loại 1" */
  name: string;
  /** @example "kg" */
  unit: string;
  /** @example "1 - 1.2 kg/con" */
  sizeLabel: string | null;
}

/** One of the signed-in vendor's offers. */
export class VendorOfferDto {
  /** @example "3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f" */
  id: string;
  product: VendorOfferProductDto;
  variant: VendorOfferVariantDto;
  /** VND, two decimals. @example "1450000.00" */
  price: string;
  /** In the variant's unit, up to three decimals. @example "12.5" */
  stock: string;
  @ApiProperty({ enum: OFFER_STATUSES, example: 'ACTIVE' })
  status: VendorOfferStatus;
  /** ISO 8601. @example "2026-11-18T08:30:00.000Z" */
  updatedAt: string;
}

/** Counts over every offer of the vendor, whatever the filters. */
export class VendorOfferSummaryDto {
  /** Every offer, discontinued ones included. @example 14 */
  total: number;
  /** Status ACTIVE. @example 10 */
  active: number;
  /** Status PAUSED. @example 2 */
  paused: number;
  /** ACTIVE offers with stock at or below lowStockThreshold (same rule as the dashboard). @example 3 */
  lowStock: number;
  /** @example 1 */
  discontinued: number;
  /** Offers that are not discontinued on products still waiting for admin approval. @example 1 */
  pendingApproval: number;
  /** @example 5 */
  lowStockThreshold: number;
}

export class VendorOfferListDto {
  items: VendorOfferDto[];
  summary: VendorOfferSummaryDto;
  pagination: PaginationDto;
}

export class VendorCatalogVariantDto extends VendorOfferVariantDto {
  /** The vendor already has an offer on this variant (any status, discontinued included). @example false */
  alreadyOffered: boolean;
}

/** A product the vendor can add an offer to: published, or their own draft. */
export class VendorCatalogProductDto {
  /** @example "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d" */
  id: string;
  /** @example "Tôm hùm bông Nha Trang" */
  name: string;
  /** @example "tom-hum-bong-nha-trang" */
  slug: string;
  @ApiProperty({ enum: ['ACTIVE', 'DRAFT'], example: 'ACTIVE' })
  status: VendorProductStatus;
  /** @example false */
  isOwnDraft: boolean;
  /** @example "https://res.cloudinary.com/demo/image/upload/v1/tom-hum.jpg" */
  imageUrl: string | null;
  categories: VendorCategoryRefDto[];
  /** Active variants only. */
  variants: VendorCatalogVariantDto[];
}

export class VendorCatalogListDto {
  items: VendorCatalogProductDto[];
  pagination: PaginationDto;
}

/** Start selling one variant. */
export class CreateVendorOfferDto {
  /** @example "2c3d4e5f-6071-4b8c-9d0e-1f2a3b4c5d6e" */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Vui lòng chọn biến thể sản phẩm.' })
  variantId: string;

  @IsOfferPrice()
  price: number;

  @IsOfferStock()
  stock: number;

  /** Defaults to ACTIVE. */
  @ApiPropertyOptional({ enum: NEW_OFFER_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(NEW_OFFER_STATUSES, {
    message: 'Trạng thái chỉ có thể là đang bán hoặc tạm ngưng.',
  })
  status?: (typeof NEW_OFFER_STATUSES)[number];
}

/** Validate only when the field was sent, so null is refused instead of ignored. */
const sent = (_: object, value: unknown) => value !== undefined;

/** Change price and/or stock. Omitted fields are kept. */
export class UpdateVendorOfferDto {
  @IsOfferPrice({ optional: true })
  @ValidateIf(sent)
  price?: number;

  @IsOfferStock({ optional: true })
  @ValidateIf(sent)
  stock?: number;
}

export class UpdateVendorOfferStatusDto {
  /** DISCONTINUED is final: the offer can never be sold again. */
  @ApiProperty({ enum: SETTABLE_OFFER_STATUSES, example: 'PAUSED' })
  @IsIn(SETTABLE_OFFER_STATUSES, {
    message: 'Trạng thái chỉ có thể là đang bán, tạm ngưng hoặc ngừng bán.',
  })
  status: SettableOfferStatus;
}
