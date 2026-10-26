import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: ReturnType<typeof vi.fn> };
  let reflector: Reflector;

  beforeEach(() => {
    jwtService = { verifyAsync: vi.fn() };
    reflector = new Reflector();
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector,
    );
  });

  function createContext(authHeader?: string, isPublic = false): ExecutionContext {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow @Public() routes without token', async () => {
    const ctx = createContext(undefined, true);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should throw 401 when no Authorization header', async () => {
    const ctx = createContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when token format is wrong', async () => {
    const ctx = createContext('InvalidFormat token123');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw 401 when token is expired/invalid', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const ctx = createContext('Bearer expired-token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should pass and attach user when token is valid', async () => {
    const mockPayload = { sub: 'user-1', email: 'a@b.com', role: 'CUSTOMER' };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    const ctx = createContext('Bearer valid-token');

    expect(await guard.canActivate(ctx)).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual(mockPayload);
  });

  it('should use role from JWT payload, NOT from client request body', async () => {
    // Acceptance criteria: do not use roles declared by the client itself
    const mockPayload = { sub: 'user-1', email: 'a@b.com', role: 'CUSTOMER' };
    jwtService.verifyAsync.mockResolvedValue(mockPayload);

    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid-token' },
          body: { role: 'ADMIN' }, // Client tries to inject ADMIN role
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    await guard.canActivate(ctx);
    const req = ctx.switchToHttp().getRequest();

    // Role must come from JWT (CUSTOMER), not from body (ADMIN)
    expect(req.user.role).toBe('CUSTOMER');
    expect(req.user.role).not.toBe('ADMIN');
  });
});
