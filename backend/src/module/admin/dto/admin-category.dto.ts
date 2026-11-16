import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const CATEGORY_NAME_MIN_LENGTH = 2;
export const CATEGORY_NAME_MAX_LENGTH = 120;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 1000;
export const CATEGORY_IMAGE_URL_MAX_LENGTH = 1000;

export const CATEGORY_STATUS_FILTERS = ['ACTIVE', 'INACTIVE'] as const;
export type CategoryStatusFilter = (typeof CATEGORY_STATUS_FILTERS)[number];

/** Trim strings and turn an empty one into null, so "clear this field" and "leave it empty" mean the same. */
const blankToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Query for GET /admin/categories. */
export class AdminCategoryListQueryDto {
  @ApiPropertyOptional({ enum: CATEGORY_STATUS_FILTERS, description: 'Omit to list active and inactive categories' })
  @IsOptional()
  @IsIn(CATEGORY_STATUS_FILTERS)
  status?: CategoryStatusFilter;

  @ApiPropertyOptional({ example: 'tôm', description: 'Matches the category name, ignoring accents' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}

/** Fields shared by create and update. `null` is allowed (IsOptional lets it through) and clears the field. */
class CategoryFieldsDto {
  @ApiPropertyOptional({ example: 'Hải sản đông lạnh', nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(CATEGORY_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/tom.jpg', nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(CATEGORY_IMAGE_URL_MAX_LENGTH)
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Parent category id; null makes it a top-level category', nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 10, description: 'Lower numbers come first', minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class CreateCategoryDto extends CategoryFieldsDto {
  @ApiProperty({ example: 'Tôm sống', minLength: CATEGORY_NAME_MIN_LENGTH, maxLength: CATEGORY_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(CATEGORY_NAME_MIN_LENGTH)
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  name: string;
}

/** Every field is optional; only the ones sent change. The slug stays put when the name changes. */
export class UpdateCategoryDto extends CategoryFieldsDto {
  @ApiPropertyOptional({ example: 'Tôm sống', minLength: CATEGORY_NAME_MIN_LENGTH, maxLength: CATEGORY_NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(CATEGORY_NAME_MIN_LENGTH)
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  name?: string;
}

export class AdminCategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Products tagged with this category directly. */
  productCount: number;
  /** Subcategories directly below this one. */
  childCount: number;
  /** True when the parent is inactive, so customers cannot see this category even though it is active. */
  hiddenByParent: boolean;
}

export class AdminCategoryCountsDto {
  total: number;
  active: number;
  inactive: number;
}

export class AdminCategoryListDto {
  items: AdminCategoryDto[];
  counts: AdminCategoryCountsDto;
}
