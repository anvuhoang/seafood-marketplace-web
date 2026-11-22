import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

function createMockExecutionContext(tokenRole: string | null): ExecutionContext {
  const request = {
    user: tokenRole ? { sub: 'user-1', email: 'test@test.com', role: tokenRole } : null,
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let findUnique: ReturnType<typeof vi.fn>;

  /** What the database currently says about user-1. */
  const dbUser = (role: string, status = 'ACTIVE') => findUnique.mockResolvedValue({ role, status });

  beforeEach(() => {
    reflector = new Reflector();
    findUnique = vi.fn();
    guard = new RolesGuard(reflector, { user: { findUnique } } as unknown as PrismaService);
  });

  it('should allow access when no @Roles() is set, without touching the database', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(createMockExecutionContext('CUSTOMER'))).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('should allow ADMIN to access ADMIN-only route', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    dbUser('ADMIN');
    await expect(guard.canActivate(createMockExecutionContext('ADMIN'))).resolves.toBe(true);
  });

  it('should block CUSTOMER from ADMIN-only route (403)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    dbUser('CUSTOMER');
    await expect(guard.canActivate(createMockExecutionContext('CUSTOMER'))).rejects.toThrow(ForbiddenException);
  });

  it('should block VENDOR from ADMIN-only route (403)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    dbUser('VENDOR');
    await expect(guard.canActivate(createMockExecutionContext('VENDOR'))).rejects.toThrow(ForbiddenException);
  });

  it('should allow VENDOR or ADMIN to access multi-role route', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR', 'ADMIN']);

    dbUser('VENDOR');
    await expect(guard.canActivate(createMockExecutionContext('VENDOR'))).resolves.toBe(true);

    dbUser('ADMIN');
    await expect(guard.canActivate(createMockExecutionContext('ADMIN'))).resolves.toBe(true);
  });

  it('should block CUSTOMER from VENDOR+ADMIN route', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR', 'ADMIN']);
    dbUser('CUSTOMER');
    await expect(guard.canActivate(createMockExecutionContext('CUSTOMER'))).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is null', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    await expect(guard.canActivate(createMockExecutionContext(null))).rejects.toThrow(ForbiddenException);
  });

  it('should revoke vendor access once the owner was returned to CUSTOMER, even with an old VENDOR token', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR']);
    dbUser('CUSTOMER');
    await expect(guard.canActivate(createMockExecutionContext('VENDOR'))).rejects.toThrow(ForbiddenException);
  });

  it('should grant vendor access right after approval, even with an old CUSTOMER token', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR']);
    dbUser('VENDOR');
    await expect(guard.canActivate(createMockExecutionContext('CUSTOMER'))).resolves.toBe(true);
  });

  it('should block a deleted or non-active account', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(createMockExecutionContext('ADMIN'))).rejects.toThrow(ForbiddenException);

    dbUser('ADMIN', 'SUSPENDED');
    await expect(guard.canActivate(createMockExecutionContext('ADMIN'))).rejects.toThrow(ForbiddenException);
  });
});
