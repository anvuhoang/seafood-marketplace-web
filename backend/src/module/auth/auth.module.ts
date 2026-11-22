import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { InfraModule } from '../../infra/infra.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRecoveryController } from './auth-recovery.controller.js';
import { PasswordResetService } from './password-reset.service.js';
import { GoogleAuthController } from './google/google-auth.controller.js';
import { GoogleLoginService } from './google/google-login.service.js';
import { GOOGLE_VERIFIER, GoogleIdTokenVerifier } from './google/google-verifier.js';
import { SessionRevocationService } from '../../common/guards/session-revocation.service.js';
import { LoginAttemptLimiter } from './security/login-attempt.limiter.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
  imports: [
    PrismaModule,
    // The sign-in limit keeps its counters in the shared store.
    InfraModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('jwtSecret');
        const expiresIn = configService.get<string>(
          'jwtExpiresIn',
          '7d',
        ) as StringValue;

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AuthRecoveryController, GoogleAuthController],
  providers: [
    AuthService,
    LoginAttemptLimiter,
    PasswordResetService,
    GoogleLoginService,
    { provide: GOOGLE_VERIFIER, useClass: GoogleIdTokenVerifier },
    SessionRevocationService,
    JwtAuthGuard,
    RolesGuard,
    // Every route requires a valid JWT unless it is marked with @Public().
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, SessionRevocationService],
})
export class AuthModule { }
