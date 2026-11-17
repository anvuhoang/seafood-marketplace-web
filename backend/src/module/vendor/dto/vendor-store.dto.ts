import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { VIETNAM_PHONE_PATTERN } from '../../account/dto/account.dto.js';
import { VENDOR_STOREFRONT_STATUSES } from './vendor-storefront.dto.js';
import type { VendorStorefrontStatus } from './vendor-storefront.dto.js';

export const VENDOR_STORE_LIMITS = {
  nameMin: 2,
  nameMax: 180,
  descriptionMax: 2000,
  emailMax: 255,
  regionMax: 100,
  streetAddressMax: 255,
  imageUrlMax: 1000,
} as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Trims and turns an empty string into null, so clearing a field removes it. */
const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
/** Validate only when the field was sent; null is rejected for required columns. */
const sent = (_: object, value: unknown) => value !== undefined;

/** The signed-in vendor's own store, as shown on the store settings page. */
export class VendorStoreDto {
  /** @example "2f9c1b7a-4e0d-4c55-9b8e-61a3d0f7c2b4" */
  id: string;
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  /** Fixed at registration; not editable. @example "vua-thuy-san-phu-quoc-xanh" */
  slug: string;
  /** @example "Hải sản tươi sống đánh bắt mỗi ngày tại Phú Quốc." */
  description: string | null;
  /** @example "https://res.cloudinary.com/demo/image/upload/v1/haisan-express/vendors/2f9c1b7a/logo.png" */
  logoUrl: string | null;
  /** @example "https://res.cloudinary.com/demo/image/upload/v1/haisan-express/vendors/2f9c1b7a/cover.jpg" */
  coverUrl: string | null;
  /** @example "0908123456" */
  phone: string | null;
  /** @example "vua@phuquocxanh.vn" */
  email: string | null;
  /** @example "Kiên Giang" */
  province: string;
  /** @example "Phú Quốc" */
  district: string;
  /** @example "Dương Đông" */
  ward: string | null;
  /** @example "12 Bến Cảng An Thới" */
  streetAddress: string;
  /** Set by admins; not editable here. */
  @ApiProperty({ enum: VENDOR_STOREFRONT_STATUSES, example: 'ACTIVE' })
  status: VendorStorefrontStatus;
  /** ISO 8601. @example "2026-11-17T08:30:00.000Z" */
  updatedAt: string;
  /** False until Cloudinary is configured; the UI then hides the upload buttons. @example true */
  imageUploadEnabled: boolean;
}

/**
 * Partial update of the signed-in vendor's store. Omitted fields are left as
 * they are; `null` clears an optional field. Slug and status are not accepted.
 */
export class UpdateVendorStoreDto {
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  @ApiPropertyOptional({ minLength: VENDOR_STORE_LIMITS.nameMin, maxLength: VENDOR_STORE_LIMITS.nameMax })
  @ValidateIf(sent)
  @Transform(trim)
  @IsString({ message: 'Tên gian hàng phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên gian hàng.' })
  @MinLength(VENDOR_STORE_LIMITS.nameMin, { message: 'Tên gian hàng phải có tối thiểu 2 ký tự.' })
  @MaxLength(VENDOR_STORE_LIMITS.nameMax, { message: 'Tên gian hàng tối đa 180 ký tự.' })
  name?: string;

  /** @example "Hải sản tươi sống đánh bắt mỗi ngày tại Phú Quốc." */
  @ApiPropertyOptional({ nullable: true, maxLength: VENDOR_STORE_LIMITS.descriptionMax })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_STORE_LIMITS.descriptionMax, { message: 'Mô tả tối đa 2000 ký tự.' })
  description?: string | null;

  /** Cloudinary URL from a signed store upload; null removes the logo. */
  @ApiPropertyOptional({ nullable: true, maxLength: VENDOR_STORE_LIMITS.imageUrlMax })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  @MaxLength(VENDOR_STORE_LIMITS.imageUrlMax, { message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  logoUrl?: string | null;

  /** Cloudinary URL from a signed store upload; null removes the cover. */
  @ApiPropertyOptional({ nullable: true, maxLength: VENDOR_STORE_LIMITS.imageUrlMax })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  @MaxLength(VENDOR_STORE_LIMITS.imageUrlMax, { message: 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.' })
  coverUrl?: string | null;

  /** Vietnamese phone number; null removes it. @example "0908123456" */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @Matches(VIETNAM_PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).' })
  phone?: string | null;

  /** @example "vua@phuquocxanh.vn" */
  @ApiPropertyOptional({ nullable: true, maxLength: VENDOR_STORE_LIMITS.emailMax })
  @IsOptional()
  @Transform(trimToNull)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(VENDOR_STORE_LIMITS.emailMax, { message: 'Email tối đa 255 ký tự.' })
  email?: string | null;

  /** @example "Kiên Giang" */
  @ApiPropertyOptional({ minLength: 1, maxLength: VENDOR_STORE_LIMITS.regionMax })
  @ValidateIf(sent)
  @Transform(trim)
  @IsString({ message: 'Tỉnh/thành phố phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tỉnh/thành phố.' })
  @MaxLength(VENDOR_STORE_LIMITS.regionMax, { message: 'Tỉnh/thành phố tối đa 100 ký tự.' })
  province?: string;

  /** @example "Phú Quốc" */
  @ApiPropertyOptional({ minLength: 1, maxLength: VENDOR_STORE_LIMITS.regionMax })
  @ValidateIf(sent)
  @Transform(trim)
  @IsString({ message: 'Quận/huyện phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập quận/huyện.' })
  @MaxLength(VENDOR_STORE_LIMITS.regionMax, { message: 'Quận/huyện tối đa 100 ký tự.' })
  district?: string;

  /** @example "Dương Đông" */
  @ApiPropertyOptional({ nullable: true, maxLength: VENDOR_STORE_LIMITS.regionMax })
  @IsOptional()
  @Transform(trimToNull)
  @IsString({ message: 'Phường/xã phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_STORE_LIMITS.regionMax, { message: 'Phường/xã tối đa 100 ký tự.' })
  ward?: string | null;

  /** @example "12 Bến Cảng An Thới" */
  @ApiPropertyOptional({ minLength: 1, maxLength: VENDOR_STORE_LIMITS.streetAddressMax })
  @ValidateIf(sent)
  @Transform(trim)
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập địa chỉ.' })
  @MaxLength(VENDOR_STORE_LIMITS.streetAddressMax, { message: 'Địa chỉ tối đa 255 ký tự.' })
  streetAddress?: string;
}

/** Fields for one signed direct upload to Cloudinary (multipart POST to uploadUrl). */
export class VendorStoreUploadSignatureDto {
  /** @example "https://api.cloudinary.com/v1_1/demo/image/upload" */
  uploadUrl: string;
  /** @example "123456789012345" */
  apiKey: string;
  /** Unix seconds. @example 1763368200 */
  timestamp: number;
  /** @example "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3" */
  signature: string;
  /** @example "haisan-express/vendors/2f9c1b7a-4e0d-4c55-9b8e-61a3d0f7c2b4" */
  folder: string;
  /** @example "jpg,jpeg,png,webp" */
  allowedFormats: string;
  /** @example 5242880 */
  maxFileSizeBytes: number;
}
