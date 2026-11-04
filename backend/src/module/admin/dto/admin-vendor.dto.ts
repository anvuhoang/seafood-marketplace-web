import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export const ADMIN_VENDOR_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;
export type AdminVendorStatus = (typeof ADMIN_VENDOR_STATUSES)[number];

export const VENDOR_DECISION_ACTIONS = ['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE'] as const;
export type VendorDecisionActionValue = (typeof VENDOR_DECISION_ACTIONS)[number];

export const DECISION_REASON_MIN_LENGTH = 5;
export const DECISION_REASON_MAX_LENGTH = 500;

/** Query for GET /admin/vendors. */
export class AdminVendorListQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_VENDOR_STATUSES, description: 'Omit to list every status' })
  @IsOptional()
  @IsIn(ADMIN_VENDOR_STATUSES)
  status?: AdminVendorStatus;

  @ApiPropertyOptional({ example: 'phú quốc', description: 'Matches store name, owner name or owner email' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** Body for reject and suspend, which must always say why. */
export class VendorDecisionReasonDto {
  @ApiProperty({
    example: 'Giấy phép ATTP đã hết hạn, vui lòng bổ sung bản mới.',
    minLength: DECISION_REASON_MIN_LENGTH,
    maxLength: DECISION_REASON_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(DECISION_REASON_MIN_LENGTH)
  @MaxLength(DECISION_REASON_MAX_LENGTH)
  reason: string;
}

/** A person referenced in admin screens. */
export class AdminPersonDto {
  /** @example "2f9c1b7a-4e0d-4c55-9b8e-61a3d0f7c2b4" */
  id: string;
  /** @example "Nguyễn Văn Hải" */
  fullName: string;
  /** @example "hai@example.com" */
  email: string;
}

export class AdminVendorOwnerDto extends AdminPersonDto {
  /** @example "0901000001" */
  phone: string | null;
  /**
   * The owner's current account role. Becomes VENDOR on approval and CUSTOMER on suspension.
   * @example "VENDOR"
   */
  role: string;
}

export class VendorDecisionDto {
  id: string;
  @ApiProperty({ enum: VENDOR_DECISION_ACTIONS })
  action: VendorDecisionActionValue;
  @ApiProperty({ enum: ADMIN_VENDOR_STATUSES })
  fromStatus: AdminVendorStatus;
  @ApiProperty({ enum: ADMIN_VENDOR_STATUSES })
  toStatus: AdminVendorStatus;
  /** Present for rejections and suspensions. */
  reason: string | null;
  /** The admin who made the decision. */
  admin: AdminPersonDto;
  createdAt: Date;
}

export class AdminVendorListItemDto {
  id: string;
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  slug: string;
  @ApiProperty({ enum: ADMIN_VENDOR_STATUSES })
  status: AdminVendorStatus;
  /** @example "Phú Quốc, Kiên Giang" */
  location: string;
  owner: AdminPersonDto;
  createdAt: Date;
  /** The most recent admin decision, if any. */
  lastDecision: VendorDecisionDto | null;
}

/** Number of vendors in each status, for the tabs. */
export class AdminVendorCountsDto {
  PENDING: number;
  ACTIVE: number;
  REJECTED: number;
  SUSPENDED: number;
  total: number;
}

export class AdminVendorListDto {
  items: AdminVendorListItemDto[];
  pagination: PaginationDto;
  counts: AdminVendorCountsDto;
}

export class AdminVendorDetailDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  @ApiProperty({ enum: ADMIN_VENDOR_STATUSES })
  status: AdminVendorStatus;
  createdAt: Date;
  owner: AdminVendorOwnerDto;
  /** Active offers the store has listed. */
  offerCount: number;
  orderCount: number;
  /** Every admin decision about this store, newest first. */
  decisions: VendorDecisionDto[];
}
