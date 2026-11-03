import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email address, used to sign in',
  })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  email: string;

  @ApiProperty({
    example: 'MatKhau123',
    minLength: 6,
    description: 'Password, at least 6 characters',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự.' })
  password: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    minLength: 2,
    description: 'Full name',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @MinLength(2, { message: 'Họ và tên phải có tối thiểu 2 ký tự.' })
  fullName: string;

  @ApiPropertyOptional({
    example: '0912345678',
    description: 'Vietnamese phone number; can also be used to sign in',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  phone?: string;
}
