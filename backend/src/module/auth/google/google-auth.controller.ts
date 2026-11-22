import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RateLimit } from '../../../infra/rate-limit.guard.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { GoogleLoginService } from './google-login.service.js';

export class GoogleLoginDto {
  @ApiProperty({ description: 'The ID token (credential) Google gave the browser' })
  @IsString({ message: 'Mã xác thực Google không hợp lệ.' })
  @IsNotEmpty({ message: 'Mã xác thực Google không hợp lệ.' })
  @MaxLength(4096, { message: 'Mã xác thực Google không hợp lệ.' })
  credential: string;
}

@ApiTags('Auth')
@Public()
@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly google: GoogleLoginService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Which sign-in methods are on', description: 'The page shows the Google button only when it is enabled. The client ID is public.' })
  providers(): { google: { enabled: boolean; clientId: string | null } } {
    return this.google.providers();
  }

  @RateLimit(10, 60)
  @Post('google')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sign in (or sign up) with a Google ID token',
    description: 'Customers and vendors only. An account made with a password that was never confirmed by email loses that password when Google links to it.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'The Google token is not valid, or the account is suspended' })
  @ApiResponse({ status: 503, description: 'Google sign-in is not configured' })
  login(@Body() dto: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.google.login(dto.credential);
  }
}
