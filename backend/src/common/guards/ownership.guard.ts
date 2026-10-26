import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard.js';

export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipConfig {
  /** Name of the parameter in the URL containing the resource ID, e.g., 'id', 'orderId' */
  paramKey: string;
  /** Callback that returns the userId owning the resource from resourceId */
  resolveOwner: (resourceId: string, prisma: any) => Promise<string | null>;
}

/**
 * Guard checks resource ownership.
 * ADMIN is always allowed to access.
 * Other roles must be the owner of the resource.
 *
 * Use in combination with @CheckOwnership() decorator.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<OwnershipConfig>(
      OWNERSHIP_KEY,
      context.getHandler(),
    );

    // No config → allow access (do not check ownership)
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không có thông tin người dùng.');
    }

    // ADMIN always allowed
    if (user.role === 'ADMIN') {
      return true;
    }

    const rawParam = request.params[config.paramKey];
    const resourceId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!resourceId) {
      throw new ForbiddenException('Missing resource ID.');
    }

    // Get prisma from request (injected via middleware) or null
    const prisma = (request as any)._prisma;
    const ownerId = await config.resolveOwner(resourceId, prisma);

    if (!ownerId || ownerId !== user.sub) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này.',
      );
    }

    return true;
  }
}
