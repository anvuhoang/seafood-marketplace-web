import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export const ADMIN_USER_ROLES = ['CUSTOMER', 'VENDOR', 'ADMIN'] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export const ADMIN_USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

/** Query for GET /admin/users. */
export class AdminUserListQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_USER_ROLES, description: 'Omit to list every role' })
  @IsOptional()
  @IsIn(ADMIN_USER_ROLES)
  role?: AdminUserRole;

  @ApiPropertyOptional({ enum: ADMIN_USER_STATUSES, description: 'Omit to list every status' })
  @IsOptional()
  @IsIn(ADMIN_USER_STATUSES)
  status?: AdminUserStatus;

  @ApiPropertyOptional({ example: 'nguyễn', description: 'Matches full name, email or phone' })
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

export class AdminUserVendorDto {
  name: string;
  slug: string;
  status: string;
}

export class AdminUserListItemDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: Date;
  /** Orders this account placed, cancelled ones included. */
  orderCount: number;
  /** Value of the orders it placed, cancelled ones excluded. */
  orderTotal: number;
  /** The store this account owns, if any. */
  vendor: AdminUserVendorDto | null;
}

/** Figures for the whole system; they ignore the filters. */
export class AdminUserCountsDto {
  total: number;
  byRole: Record<AdminUserRole, number>;
  byStatus: Record<AdminUserStatus, number>;
  activeVendors: number;
  newLast30Days: number;
}

export class AdminUserListDto {
  items: AdminUserListItemDto[];
  pagination: PaginationDto;
  counts: AdminUserCountsDto;
}
