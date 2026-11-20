import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export const VENDOR_REGISTRATION_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  streetAddressMax: 255,
  descriptionMax: 1000,
} as const;

/** After normalisation: 0 followed by 9 digits (mobile) or 10 digits (landline). */
export const NORMALIZED_PHONE_PATTERN = /^0[1-9]\d{8,9}$/;

/**
 * "+84 912.345.678" → "0912345678". Spaces, dots, dashes and brackets are dropped
 * and a leading +84 becomes 0, so every stored number has one form.
 */
export function normalizeVietnamPhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const compact = value.replace(/[\s.\-()]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const ADMIN_CODE = /^\d{2,5}$/;

/** Body of POST /vendors/registration. Status and owner are set by the server. */
export class RegisterVendorDto {
  /** @example "Vựa Hải Sản Bến Cảng An Thới" */
  @Transform(trim)
  @IsString({ message: 'Tên gian hàng phải là chuỗi ký tự.' })
  @Length(VENDOR_REGISTRATION_LIMITS.nameMin, VENDOR_REGISTRATION_LIMITS.nameMax, {
    message: `Tên gian hàng phải từ ${VENDOR_REGISTRATION_LIMITS.nameMin} đến ${VENDOR_REGISTRATION_LIMITS.nameMax} ký tự.`,
  })
  name: string;

  /** Accepts 0... or +84...; stored as 0.... @example "0912345678" */
  @Transform(({ value }) => normalizeVietnamPhone(value))
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  @Matches(NORMALIZED_PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ (ví dụ: 0912345678 hoặc +84912345678).' })
  contactPhone: string;

  /** GSO province code from GET /administrative-units/provinces. @example "91" */
  @IsString({ message: 'Vui lòng chọn tỉnh/thành phố.' })
  @IsNotEmpty({ message: 'Vui lòng chọn tỉnh/thành phố.' })
  @Matches(ADMIN_CODE, { message: 'Tỉnh/thành phố không hợp lệ.' })
  provinceCode: string;

  /** GSO district code belonging to the province. @example "911" */
  @IsString({ message: 'Vui lòng chọn quận/huyện.' })
  @IsNotEmpty({ message: 'Vui lòng chọn quận/huyện.' })
  @Matches(ADMIN_CODE, { message: 'Quận/huyện không hợp lệ.' })
  districtCode: string;

  /** Optional GSO ward code belonging to the district. @example "31081" */
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Xã/phường không hợp lệ.' })
  @Matches(ADMIN_CODE, { message: 'Xã/phường không hợp lệ.' })
  wardCode?: string | null;

  /** House number and street, or the pier / warehouse. @example "Khu neo đậu số 4, cầu cảng An Thới" */
  @Transform(trim)
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập số nhà, tên đường.' })
  @MaxLength(VENDOR_REGISTRATION_LIMITS.streetAddressMax, {
    message: `Địa chỉ tối đa ${VENDOR_REGISTRATION_LIMITS.streetAddressMax} ký tự.`,
  })
  streetAddress: string;

  /** @example "Chuyên tôm hùm, ghẹ và mực câu đánh bắt trong ngày." */
  @Transform(trimToNull)
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự.' })
  @MaxLength(VENDOR_REGISTRATION_LIMITS.descriptionMax, {
    message: `Mô tả tối đa ${VENDOR_REGISTRATION_LIMITS.descriptionMax} ký tự.`,
  })
  description?: string | null;
}

export const VENDOR_REGISTRATION_STATUSES = ['NONE', 'PENDING', 'REJECTED', 'ACTIVE', 'SUSPENDED'] as const;
export type VendorRegistrationStatus = (typeof VENDOR_REGISTRATION_STATUSES)[number];

export const ACCOUNT_ROLES = ['CUSTOMER', 'VENDOR', 'ADMIN'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** What the owner submitted, as stored. */
export class VendorApplicationDto {
  /** @example "Vựa Hải Sản Bến Cảng An Thới" */
  name: string;
  /** Assigned at first submission and kept on resubmission. @example "vua-hai-san-ben-cang-an-thoi" */
  slug: string;
  /** @example "0912345678" */
  contactPhone: string | null;
  /** @example "Kiên Giang" */
  province: string;
  /** @example "Phú Quốc" */
  district: string;
  /** @example "An Thới" */
  ward: string | null;
  /** Catalogue codes for pre-filling the form; null when the stored name is not in the catalogue. @example "91" */
  provinceCode: string | null;
  /** @example "911" */
  districtCode: string | null;
  /** @example "31081" */
  wardCode: string | null;
  /** @example "Khu neo đậu số 4, cầu cảng An Thới" */
  streetAddress: string;
  /** @example "Chuyên tôm hùm, ghẹ và mực câu đánh bắt trong ngày." */
  description: string | null;
  /** First submission. */
  createdAt: Date;
  /** Last change to the store record (latest submission while the application is pending). */
  updatedAt: Date;
}

/** Registration state of the signed-in account. */
export class VendorRegistrationStatusDto {
  /** NONE when the account has never submitted an application. @example "PENDING" */
  @ApiProperty({ enum: VENDOR_REGISTRATION_STATUSES })
  status: VendorRegistrationStatus;

  /** The account's role in the database right now (may differ from the role in an older token). @example "CUSTOMER" */
  @ApiProperty({ enum: ACCOUNT_ROLES })
  accountRole: AccountRole;

  /** Null when status is NONE. */
  application: VendorApplicationDto | null;

  /** Reason given by the admin in the latest rejection; only set while status is REJECTED. @example "Địa chỉ kho chưa rõ ràng." */
  rejectionReason: string | null;
}
