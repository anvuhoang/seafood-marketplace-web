import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';

export type SafeUser = AuthUserDto;
export type AuthResult = AuthResponseDto;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;
    const fullName = dto.fullName.trim();

    // 1. Check for duplicate email address
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new ConflictException('Email này đã được sử dụng.');
    }

    // 2. Check for duplicate phone number if provided
    if (phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingUserByPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng.');
      }
    }

    // 3. Hash passwords using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 4. Create user in database
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    // 5. Generate JWT access token
    const accessToken = await this.generateToken(user.id, user.email, user.role);

    // 6. Return response (NEVER return password or passwordHash)
    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const identifier = dto.emailOrPhone.trim();
    const isEmail = identifier.includes('@');

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : {
            OR: [
              { phone: identifier },
              { email: identifier.toLowerCase() },
            ],
          },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Email/Số điện thoại hoặc mật khẩu không chính xác.',
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị tạm khóa.');
    }

    // Compare passwords using bcrypt
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Email/Số điện thoại hoặc mật khẩu không chính xác.',
      );
    }

    // Generate JWT access token
    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    return this.sanitizeUser(user);
  }

  private async generateToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<string> {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload);
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    // Exclude passwordHash from user object
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
