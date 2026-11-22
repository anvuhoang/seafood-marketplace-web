import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ForgotPasswordDto {
  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @IsNotEmpty({ message: 'Vui lòng nhập email.' })
  @MaxLength(255)
  email: string;
}

/** The token of the link in the mail. */
export class ResetTokenDto {
  @ApiProperty({ description: 'The token from the link in the mail' })
  @IsString({ message: 'Đường dẫn không hợp lệ.' })
  @MinLength(20, { message: 'Đường dẫn không hợp lệ.' })
  @MaxLength(200, { message: 'Đường dẫn không hợp lệ.' })
  token: string;
}

export class ResetPasswordDto extends ResetTokenDto {
  @ApiProperty({ minLength: 6, maxLength: 72, description: 'The new password (bcrypt reads at most 72 characters)' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự.' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự.' })
  password: string;
}

export class MessageDto {
  message: string;
}

export class TokenCheckDto {
  valid: boolean;
}
