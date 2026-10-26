import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
  };

  const mockResponse = {
    user: {
      id: 'uuid-123',
      email: 'user@example.com',
      fullName: 'User Name',
      phone: null,
      avatarUrl: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    accessToken: 'mock-jwt-token',
  };

  beforeEach(async () => {
    authService = {
      register: vi.fn(),
      login: vi.fn(),
      getProfile: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: JwtService, useValue: { verifyAsync: vi.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      authService.register.mockResolvedValue(mockResponse);

      const dto = {
        email: 'user@example.com',
        password: 'password123',
        fullName: 'User Name',
      };

      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login and return result', async () => {
      authService.login.mockResolvedValue(mockResponse);

      const dto = {
        emailOrPhone: 'user@example.com',
        password: 'password123',
      };

      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMe', () => {
    it('should call authService.getProfile and return user profile', async () => {
      authService.getProfile.mockResolvedValue(mockResponse.user);

      const result = await controller.getMe('uuid-123');
      expect(authService.getProfile).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(mockResponse.user);
    });
  });
});
