import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedRequest } from './jwt-auth.guard.js';

/**
* Guard that checks the role of an authenticated user.
* Used in conjunction with the @Roles() decorator.
* Must be placed AFTER JwtAuthGuard so that request.user is already populated.
*
* The role is read from the database, not from the token. A token keeps the
* role it was issued with for days, so an owner whose store was just suspended
* (or approved) would otherwise keep the old access until they signed in again.
*/
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If @Roles() is not present, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không có thông tin người dùng.');
    }

    const current = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, status: true },
    });

    if (!current || current.status !== 'ACTIVE' || !requiredRoles.includes(current.role)) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này.',
      );
    }

    // Keep the rest of the request consistent with what the database says now.
    request.user = { ...user, role: current.role };
    return true;
  }
}
