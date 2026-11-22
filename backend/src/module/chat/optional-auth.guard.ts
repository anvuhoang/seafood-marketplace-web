import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../common/guards/jwt-auth.guard.js';

/**
 * The chat is open to guests, so its routes are @Public(), but a customer who is signed in should be
 * recognised. This guard fills `request.user` when a valid token is sent and otherwise lets the visitor
 * through as a guest. A broken or expired token is treated as no token, never as an error.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type === 'Bearer' && token) {
      try {
        request.user = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      } catch {
        request.user = undefined;
      }
    }
    return true;
  }
}
