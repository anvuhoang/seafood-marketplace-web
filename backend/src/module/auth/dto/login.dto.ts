import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email address or phone number',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập email hoặc số điện thoại.' })
  @IsString({ message: 'Tài khoản đăng nhập không hợp lệ.' })
  emailOrPhone: string;

  @ApiProperty({
    example: 'MatKhau123',
    description: 'Password',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự.' })
  password: string;
}
