import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer account and sign in' })
  @ApiResponse({ status: 201, description: 'Account created; returns the user and an access token', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email or phone number already registered' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email or phone number',
    description: 'For customers and vendors. Admin accounts are refused with 403 and must use POST /auth/admin/login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in; returns the user and an access token',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 401,
    description: 'Wrong credentials or the account is locked',
  })
  @ApiResponse({ status: 403, description: 'The account is an admin; use the admin sign-in' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in to the admin site',
    description:
      'Only ADMIN accounts are accepted; any other account gets the same 401 as a wrong password. ' +
      '5 wrong attempts in 15 minutes lock the caller out for 15 minutes. The token expires sooner than a customer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in as an admin; returns the user and a short-lived access token',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Wrong credentials, or the account is not an admin' })
  @ApiResponse({ status: 429, description: 'Too many failed attempts' })
  async adminLogin(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.adminLogin(dto, req.ip ?? 'unknown');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiResponse({
    status: 200,
    description: 'The signed-in user',
    type: AuthUserDto,
  })
  @ApiResponse({ status: 401, description: 'Missing, invalid or expired token' })
  async getMe(@CurrentUser('sub') userId: string): Promise<AuthUserDto> {
    return this.authService.getProfile(userId);
  }
}
