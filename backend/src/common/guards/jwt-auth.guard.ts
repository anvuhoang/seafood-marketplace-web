import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SessionRevocationService } from './session-revocation.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  /** When the token was issued (seconds). */
  iat?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @Optional() private readonly revocation?: SessionRevocationService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check @Public() decorator → skip authentication
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Yêu cầu token xác thực.');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token xác thực không hợp lệ.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      if (payload.iat !== undefined && (await this.revocation?.isRevoked(payload.sub, payload.iat))) {
        throw new Error('revoked');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }
  }
}
