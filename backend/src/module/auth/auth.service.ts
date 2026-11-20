import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginAttemptLimiter } from './security/login-attempt.limiter.js';
import type { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';

export type SafeUser = AuthUserDto;
export type AuthResult = AuthResponseDto;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly loginLimiter: LoginAttemptLimiter,
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
    const user = await this.verifyCredentials(dto);

    // Admins sign in on the admin site only. This is reached after the password
    // was right, so the hint does not help anyone guessing.
    if (user.role === 'ADMIN') {
      throw new ForbiddenException(
        'Tài khoản quản trị không đăng nhập tại đây. Vui lòng dùng cổng quản trị.',
      );
    }

    // Generate JWT access token
    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  /**
   * Sign-in for the admin site. Only ADMIN accounts get a token, every failure
   * looks the same (so the page does not reveal which accounts exist or what
   * role they have), repeated failures are locked out, and the token is short-lived.
   *
   * @param clientKey the caller, usually the IP address, so a lockout targets the guesser.
   */
  async adminLogin(dto: LoginDto, clientKey: string): Promise<AuthResult> {
    const limiterKey = `${clientKey}|${dto.emailOrPhone.trim().toLowerCase()}`;
    this.loginLimiter.assertAllowed(limiterKey);

    const failure = new UnauthorizedException(
      'Email/Số điện thoại hoặc mật khẩu không chính xác.',
    );

    let user;
    try {
      user = await this.verifyCredentials(dto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.loginLimiter.recordFailure(limiterKey);
        throw failure;
      }
      throw error;
    }

    if (user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      this.loginLimiter.recordFailure(limiterKey);
      throw failure;
    }

    this.loginLimiter.reset(limiterKey);
    const accessToken = await this.generateToken(
      user.id,
      user.email,
      user.role,
      this.config.get<string>('adminJwtExpiresIn', '2h') as StringValue,
    );

    return { user: this.sanitizeUser(user), accessToken };
  }

  /** Finds the account and checks the password; throws 401 when either is wrong. */
  private async verifyCredentials(dto: LoginDto) {
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

    return user;
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
    expiresIn?: StringValue,
  ): Promise<string> {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, expiresIn ? { expiresIn } : undefined);
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
