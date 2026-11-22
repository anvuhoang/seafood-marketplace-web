import { CanActivate, ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionRevocationService } from '../../common/guards/session-revocation.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../common/guards/jwt-auth.guard.js';

/**
 * The chat is open to guests, so its routes are @Public(), but a customer who is signed in should be
 * recognised. This guard fills `request.user` when a valid token is sent and otherwise lets the visitor
 * through as a guest. A broken or expired token is treated as no token, never as an error.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Optional() private readonly revocation?: SessionRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type === 'Bearer' && token) {
      try {
        const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
        const revoked = payload.iat !== undefined && (await this.revocation?.isRevoked(payload.sub, payload.iat));
        request.user = revoked ? undefined : payload;
      } catch {
        request.user = undefined;
      }
    }
    return true;
  }
}
