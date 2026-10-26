import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function createMockExecutionContext(userRole: string | null): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { sub: 'user-1', email: 'test@test.com', role: userRole } : null,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no @Roles() is set', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockExecutionContext('CUSTOMER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow ADMIN to access ADMIN-only route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = createMockExecutionContext('ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should block CUSTOMER from ADMIN-only route (403)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = createMockExecutionContext('CUSTOMER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should block VENDOR from ADMIN-only route (403)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = createMockExecutionContext('VENDOR');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow VENDOR to access VENDOR route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR']);
    const ctx = createMockExecutionContext('VENDOR');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow VENDOR or ADMIN to access multi-role route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR', 'ADMIN']);

    const vendorCtx = createMockExecutionContext('VENDOR');
    expect(guard.canActivate(vendorCtx)).toBe(true);

    const adminCtx = createMockExecutionContext('ADMIN');
    expect(guard.canActivate(adminCtx)).toBe(true);
  });

  it('should block CUSTOMER from VENDOR+ADMIN route', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['VENDOR', 'ADMIN']);
    const ctx = createMockExecutionContext('CUSTOMER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is null', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = createMockExecutionContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
