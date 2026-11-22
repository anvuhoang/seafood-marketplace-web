import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  OFFER_STATUSES,
  PRODUCT_STATUSES,
  VendorCategoryRefDto,
} from './vendor-offer.dto.js';
import type {
  VendorOfferStatus,
  VendorProductStatus,
} from './vendor-offer.dto.js';
import { IsOfferPrice, IsOfferStock } from '../../shared/offer-amount.validator.js';

/** Same lengths as the catalog columns. */
export const VENDOR_PRODUCT_LIMITS = {
  nameMin: 2,
  nameMax: 220,
  descriptionMax: 5000,
  categoriesMax: 5,
  imagesMax: 5,
  imageUrlMax: 1000,
  altTextMax: 255,
  variantsMax: 20,
  variantNameMax: 180,
  unitMax: 30,
  sizeLabelMax: 100,
} as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
/** Validate only when the field was sent, so null is refused for required columns. */
const sent = (_: object, value: unknown) => value !== undefined;

/** With at least one image, exactly one of them must be the primary one. */
function HasOnePrimaryImage(): PropertyDecorator {
  return ValidateBy(
    {
      name: 'hasOnePrimaryImage',
      validator: {
        validate: (value: unknown) =>
          !Array.isArray(value) ||
          value.length === 0 ||
          value.filter(
            (image) => (image as { isPrimary?: unknown })?.isPrimary === true,
          ).length === 1,
      },
    },
    { message: 'Vui lòng chọn đúng 1 ảnh đại diện.' },
  );
}

export class VendorProductOfferInputDto {
  @IsOfferPrice()
  price: number;

  @IsOfferStock()
  stock: number;
}

export class VendorProductImageInputDto {
  /** Cloudinary URL from POST /vendors/me/products/upload-signature. */
  @ApiProperty({ maxLength: VENDOR_PRODUCT_LIMITS.imageUrlMax })
  @Transform(trim)
  @IsString({ message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  @IsNotEmpty({ message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.imageUrlMax, {
    message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.',
  })
  imageUrl: string;

  /** @example "Tôm hùm bông nguyên con" */
  @ApiPropertyOptional({
    nullable: true,
    maxLength: VENDOR_PRODUCT_LIMITS.altTextMax,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Mô tả ảnh phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.altTextMax, {
    message: 'Mô tả ảnh tối đa 255 ký tự.',
  })
  altText?: string | null;

  /** @example true */
  @IsBoolean({ message: 'Ảnh đại diện không hợp lệ.' })
  isPrimary: boolean;
}

export class VendorProductVariantInputDto {
  /** @example "Loại 1" */
  @ApiProperty({
    minLength: 1,
    maxLength: VENDOR_PRODUCT_LIMITS.variantNameMax,
  })
  @Transform(trim)
  @IsString({ message: 'Tên biến thể phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên biến thể.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.variantNameMax, {
    message: 'Tên biến thể tối đa 180 ký tự.',
  })
  name: string;

  /** @example "kg" */
  @ApiProperty({ minLength: 1, maxLength: VENDOR_PRODUCT_LIMITS.unitMax })
  @Transform(trim)
  @IsString({ message: 'Đơn vị tính phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập đơn vị tính.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.unitMax, {
    message: 'Đơn vị tính tối đa 30 ký tự.',
  })
  unit: string;

  /** @example "1 - 1.2 kg/con" */
  @ApiPropertyOptional({
    nullable: true,
    maxLength: VENDOR_PRODUCT_LIMITS.sizeLabelMax,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Kích cỡ phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.sizeLabelMax, {
    message: 'Kích cỡ tối đa 100 ký tự.',
  })
  sizeLabel?: string | null;

  /** The vendor's own price and stock for this variant; omit to add the offer later. */
  @ApiPropertyOptional({ type: VendorProductOfferInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VendorProductOfferInputDto)
  offer?: VendorProductOfferInputDto;
}

/** A variant in an edit: with `id` it changes that variant, without it adds a new one. */
export class VendorProductVariantUpsertDto extends VendorProductVariantInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Biến thể không hợp lệ.' })
  id?: string;
}

/** Add a new product. It is published as soon as it is saved. */
export class CreateVendorProductDto {
  /** @example "Tôm hùm bông Nha Trang" */
  @ApiProperty({
    minLength: VENDOR_PRODUCT_LIMITS.nameMin,
    maxLength: VENDOR_PRODUCT_LIMITS.nameMax,
  })
  @Transform(trim)
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên sản phẩm.' })
  @MinLength(VENDOR_PRODUCT_LIMITS.nameMin, {
    message: 'Tên sản phẩm phải có tối thiểu 2 ký tự.',
  })
  @MaxLength(VENDOR_PRODUCT_LIMITS.nameMax, {
    message: 'Tên sản phẩm tối đa 220 ký tự.',
  })
  name: string;

  /** @example "Tôm hùm bông đánh bắt tại vịnh Nha Trang, giao sống." */
  @ApiPropertyOptional({
    nullable: true,
    maxLength: VENDOR_PRODUCT_LIMITS.descriptionMax,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Mô tả sản phẩm phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.descriptionMax, {
    message: 'Mô tả sản phẩm tối đa 5000 ký tự.',
  })
  description?: string | null;

  /** Active categories, at least one. */
  @ApiProperty({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: VENDOR_PRODUCT_LIMITS.categoriesMax,
  })
  @IsArray({ message: 'Vui lòng chọn ít nhất 1 danh mục.' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 danh mục.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.categoriesMax, {
    message: 'Chỉ chọn tối đa 5 danh mục.',
  })
  @ArrayUnique({ message: 'Danh mục bị chọn trùng.' })
  @IsUUID('all', { each: true, message: 'Danh mục không hợp lệ.' })
  categoryIds: string[];

  /** Up to 5 images; when there is any, exactly one is the primary one. */
  @ApiProperty({
    type: [VendorProductImageInputDto],
    maxItems: VENDOR_PRODUCT_LIMITS.imagesMax,
  })
  @IsArray({ message: 'Danh sách ảnh không hợp lệ.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.imagesMax, {
    message: 'Tối đa 5 ảnh sản phẩm.',
  })
  @HasOnePrimaryImage()
  @ValidateNested({ each: true })
  @Type(() => VendorProductImageInputDto)
  images: VendorProductImageInputDto[];

  @ApiProperty({
    type: [VendorProductVariantInputDto],
    minItems: 1,
    maxItems: VENDOR_PRODUCT_LIMITS.variantsMax,
  })
  @IsArray({ message: 'Vui lòng thêm ít nhất 1 biến thể.' })
  @ArrayMinSize(1, { message: 'Vui lòng thêm ít nhất 1 biến thể.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.variantsMax, {
    message: 'Tối đa 20 biến thể.',
  })
  @ValidateNested({ each: true })
  @Type(() => VendorProductVariantInputDto)
  variants: VendorProductVariantInputDto[];
}

/**
 * Edit a product this vendor created. Omitted fields are kept. `categoryIds`, `images` and `variants`
 * replace the whole list when sent; a variant left out of `variants` is removed.
 */
export class UpdateVendorProductDto {
  @ApiPropertyOptional({
    minLength: VENDOR_PRODUCT_LIMITS.nameMin,
    maxLength: VENDOR_PRODUCT_LIMITS.nameMax,
  })
  @ValidateIf(sent)
  @Transform(trim)
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên sản phẩm.' })
  @MinLength(VENDOR_PRODUCT_LIMITS.nameMin, {
    message: 'Tên sản phẩm phải có tối thiểu 2 ký tự.',
  })
  @MaxLength(VENDOR_PRODUCT_LIMITS.nameMax, {
    message: 'Tên sản phẩm tối đa 220 ký tự.',
  })
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: VENDOR_PRODUCT_LIMITS.descriptionMax,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Mô tả sản phẩm phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_PRODUCT_LIMITS.descriptionMax, {
    message: 'Mô tả sản phẩm tối đa 5000 ký tự.',
  })
  description?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: VENDOR_PRODUCT_LIMITS.categoriesMax,
  })
  @ValidateIf(sent)
  @IsArray({ message: 'Vui lòng chọn ít nhất 1 danh mục.' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 danh mục.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.categoriesMax, {
    message: 'Chỉ chọn tối đa 5 danh mục.',
  })
  @ArrayUnique({ message: 'Danh mục bị chọn trùng.' })
  @IsUUID('all', { each: true, message: 'Danh mục không hợp lệ.' })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [VendorProductImageInputDto],
    maxItems: VENDOR_PRODUCT_LIMITS.imagesMax,
  })
  @ValidateIf(sent)
  @IsArray({ message: 'Danh sách ảnh không hợp lệ.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.imagesMax, {
    message: 'Tối đa 5 ảnh sản phẩm.',
  })
  @HasOnePrimaryImage()
  @ValidateNested({ each: true })
  @Type(() => VendorProductImageInputDto)
  images?: VendorProductImageInputDto[];

  /** `offer` is only accepted on new variants; existing offers are edited from the offer list. */
  @ApiPropertyOptional({
    type: [VendorProductVariantUpsertDto],
    minItems: 1,
    maxItems: VENDOR_PRODUCT_LIMITS.variantsMax,
  })
  @ValidateIf(sent)
  @IsArray({ message: 'Vui lòng thêm ít nhất 1 biến thể.' })
  @ArrayMinSize(1, { message: 'Vui lòng thêm ít nhất 1 biến thể.' })
  @ArrayMaxSize(VENDOR_PRODUCT_LIMITS.variantsMax, {
    message: 'Tối đa 20 biến thể.',
  })
  @ValidateNested({ each: true })
  @Type(() => VendorProductVariantUpsertDto)
  variants?: VendorProductVariantUpsertDto[];
}

export class VendorProductImageDto {
  /** @example "4e5f6071-8293-4dae-9f10-3b4c5d6e7f80" */
  id: string;
  /** @example "https://res.cloudinary.com/demo/image/upload/v1/haisan-express/vendor-products/2f9c1b7a/tom.jpg" */
  imageUrl: string;
  /** @example "Tôm hùm bông nguyên con" */
  altText: string | null;
  /** @example true */
  isPrimary: boolean;
  /** @example 0 */
  sortOrder: number;
}

export class VendorProductVariantOfferDto {
  /** @example "3d4e5f60-7182-4c9d-8e0f-2a3b4c5d6e7f" */
  id: string;
  /** @example "1450000.00" */
  price: string;
  /** @example "12.5" */
  stock: string;
  @ApiProperty({ enum: OFFER_STATUSES, example: 'ACTIVE' })
  status: VendorOfferStatus;
}

export class VendorProductVariantDto {
  /** @example "2c3d4e5f-6071-4b8c-9d0e-1f2a3b4c5d6e" */
  id: string;
  /** @example "Loại 1" */
  name: string;
  /** @example "kg" */
  unit: string;
  /** @example "1 - 1.2 kg/con" */
  sizeLabel: string | null;
  /** The signed-in vendor's offer on this variant, if any. */
  offer: VendorProductVariantOfferDto | null;
  /** False once the variant is in a cart or an order; it can then no longer be removed. @example true */
  removable: boolean;
}

/** A product the signed-in vendor created. */
export class VendorProductDto {
  /** @example "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d" */
  id: string;
  /** @example "Tôm hùm bông Nha Trang" */
  name: string;
  /** @example "tom-hum-bong-nha-trang" */
  slug: string;
  /** @example "Tôm hùm bông đánh bắt tại vịnh Nha Trang." */
  description: string | null;
  @ApiProperty({ enum: PRODUCT_STATUSES, example: 'ACTIVE' })
  status: VendorProductStatus;
  categories: VendorCategoryRefDto[];
  images: VendorProductImageDto[];
  /** Active variants. */
  variants: VendorProductVariantDto[];
  /** ISO 8601. @example "2026-11-18T08:30:00.000Z" */
  createdAt: string;
  /** ISO 8601. @example "2026-11-18T08:30:00.000Z" */
  updatedAt: string;
  /** False when the vendor's store is suspended or rejected (read-only). @example true */
  editable: boolean;
  /** False until Cloudinary is configured; the UI then hides the upload buttons. @example true */
  imageUploadEnabled: boolean;
}
