import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Vietnamese mobile or landline: 0xxxxxxxxx or +84xxxxxxxxx (9-10 digits after the prefix). */
export const VIETNAM_PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;
const PHONE_MESSAGE = 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';

export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const ADDRESS_LABELS = ['HOME', 'OFFICE', 'FAMILY', 'OTHER'] as const;
export const MAX_INTERESTS = 10;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự.' })
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: '0912345678', nullable: true })
  @IsOptional()
  @Transform(trim)
  @Matches(VIETNAM_PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({ enum: GENDERS, nullable: true })
  @IsOptional()
  @IsIn([...GENDERS, null])
  gender?: (typeof GENDERS)[number] | null;

  @ApiPropertyOptional({ example: '1990-08-15', nullable: true, description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'Ngày sinh không hợp lệ.' })
  birthDate?: string | null;

  @ApiPropertyOptional({ example: ['tom-song', 'cua-ghe'], description: 'Category slugs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INTERESTS)
  @IsString({ each: true })
  interests?: string[];
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại.' })
  currentPassword: string;

  @ApiProperty({ minLength: 6, maxLength: 72 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' })
  // bcrypt only uses the first 72 bytes.
  @MaxLength(72, { message: 'Mật khẩu mới tối đa 72 ký tự.' })
  newPassword: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Tên người nhận phải có tối thiểu 2 ký tự.' })
  @MaxLength(150)
  recipientName: string;

  @ApiProperty({ example: '0912345678' })
  @Transform(trim)
  @Matches(VIETNAM_PHONE_PATTERN, { message: PHONE_MESSAGE })
  recipientPhone: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Vui lòng nhập tỉnh/thành phố.' })
  @MaxLength(100)
  province: string;

  @ApiProperty({ example: 'Quận 1' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Vui lòng nhập quận/huyện.' })
  @MaxLength(100)
  district: string;

  @ApiPropertyOptional({ example: 'Phường Bến Thành' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  ward?: string;

  @ApiProperty({ example: 'Số 42 Đường Nguyễn Trãi' })
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Vui lòng nhập số nhà, tên đường.' })
  @MaxLength(255)
  streetAddress: string;

  @ApiPropertyOptional({ enum: ADDRESS_LABELS, default: 'HOME' })
  @IsOptional()
  @IsIn(ADDRESS_LABELS)
  label?: (typeof ADDRESS_LABELS)[number];

  @ApiPropertyOptional({ example: 'Gọi trước 15 phút khi giao.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}

export class ProfileDto {
  id: string;
  /** Short public id derived from the account id, e.g. "HSX-F9B610". */
  customerCode: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  @ApiProperty({ enum: GENDERS, nullable: true })
  gender: (typeof GENDERS)[number] | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  interests: string[];
  passwordChangedAt: string | null;
  createdAt: string;
}

export class PasswordChangedDto {
  /** When the password was changed (ISO 8601). */
  changedAt: string;
}

export class DeletedAddressDto {
  id: string;
}

export class AddressDto {
  id: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  @ApiProperty({ enum: ADDRESS_LABELS })
  label: (typeof ADDRESS_LABELS)[number];
  note: string | null;
  isDefault: boolean;
  createdAt: string;
}
