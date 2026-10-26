import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };

  const mockDate = new Date();
  const mockPasswordHash = '$2a$10$hashedPasswordSample1234567890';

  const mockDbUser = {
    id: 'user-uuid-1',
    email: 'test@haisanexpress.com',
    passwordHash: mockPasswordHash,
    fullName: 'Nguyễn Văn Test',
    phone: '0901234567',
    avatarUrl: null,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt-mock-token-xyz'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully, hash password, and NOT return passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockDbUser);

      const result = await authService.register({
        email: 'test@haisanexpress.com',
        password: 'Password123',
        fullName: 'Nguyễn Văn Test',
        phone: '0901234567',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@haisanexpress.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      
      // Verify password was hashed before creating user
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.email).toBe('test@haisanexpress.com');
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('Password123');

      // Verify returned user does not have password or passwordHash
      expect(result.user).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect((result.user as any).password).toBeUndefined();
      expect(result.user.email).toBe('test@haisanexpress.com');
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
    });

    it('should reject registration if email is duplicate', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockDbUser);

      await expect(
        authService.register({
          email: 'test@haisanexpress.com',
          password: 'Password123',
          fullName: 'Nguyễn Văn Test',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration if phone is duplicate', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // email not duplicate
        .mockResolvedValueOnce(mockDbUser); // phone duplicate

      await expect(
        authService.register({
          email: 'another@haisanexpress.com',
          password: 'Password123',
          fullName: 'Nguyễn Văn Test',
          phone: '0901234567',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid email and password', async () => {
      const realHash = await bcrypt.hash('CorrectPassword123', 10);
      prisma.user.findFirst.mockResolvedValue({
        ...mockDbUser,
        passwordHash: realHash,
      });

      const result = await authService.login({
        emailOrPhone: 'test@haisanexpress.com',
        password: 'CorrectPassword123',
      });

      expect(result.user.email).toBe('test@haisanexpress.com');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
    });

    it('should login successfully with valid phone and password', async () => {
      const realHash = await bcrypt.hash('CorrectPassword123', 10);
      prisma.user.findFirst.mockResolvedValue({
        ...mockDbUser,
        passwordHash: realHash,
      });

      const result = await authService.login({
        emailOrPhone: '0901234567',
        password: 'CorrectPassword123',
      });

      expect(result.user.fullName).toBe('Nguyễn Văn Test');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
    });

    it('should fail login if password is incorrect', async () => {
      const realHash = await bcrypt.hash('CorrectPassword123', 10);
      prisma.user.findFirst.mockResolvedValue({
        ...mockDbUser,
        passwordHash: realHash,
      });

      await expect(
        authService.login({
          emailOrPhone: 'test@haisanexpress.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should fail login if user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          emailOrPhone: 'nonexistent@haisanexpress.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should fail login if user is suspended', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockDbUser,
        status: 'SUSPENDED',
      });

      await expect(
        authService.login({
          emailOrPhone: 'test@haisanexpress.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(mockDbUser);

      const profile = await authService.getProfile('user-uuid-1');

      expect(profile.id).toBe('user-uuid-1');
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
