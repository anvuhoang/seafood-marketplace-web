import { randomBytes } from 'node:crypto';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger, Optional, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { SessionRevocationService } from '../../../common/guards/session-revocation.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import { googleLinkedMail } from '../../mail/mail.templates.js';
import { AuthService, type AuthResult } from '../auth.service.js';
import { GOOGLE_VERIFIER, type GoogleProfile, type GoogleVerifier } from './google-verifier.js';

export const GOOGLE_DISABLED = 'Đăng nhập bằng Google chưa được bật.';
export const GOOGLE_REJECTED = 'Không xác thực được tài khoản Google. Vui lòng thử lại.';
export const GOOGLE_EMAIL_UNVERIFIED = 'Email của tài khoản Google này chưa được xác minh.';

/** A password nobody knows: an account made through Google has none until its owner chooses one ("forgot password"). */
async function unusablePassword(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10);
}

/**
 * "Sign in with Google". The browser gets an ID token from Google; this checks it and finds or makes the account.
 *
 * Linking is where it can go wrong. An account made with an email and a password has never proved it owns that
 * mailbox, so anyone could have registered someone else's address. If that person then signs in with Google
 * (which does prove it), the password that was set earlier must not survive, or the one who registered first
 * would still have a way in. So linking such an account replaces its password with one nobody knows and ends its
 * sessions; the owner chooses a new password with "forgot password" if they want one.
 *
 * Admins never sign in this way, and a suspended account stays suspended.
 */
@Injectable()
export class GoogleLoginService {
  private readonly logger = new Logger(GoogleLoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auth: AuthService,
    private readonly revocation: SessionRevocationService,
    @Inject(GOOGLE_VERIFIER) private readonly verifier: GoogleVerifier,
    @Optional() private readonly mail?: MailService,
  ) {}

  get clientId(): string {
    return this.config.get<{ clientId?: string }>('google')?.clientId ?? '';
  }

  /** What the sign-in page needs to know: whether to show the Google button, and the (public) client ID for it. */
  providers(): { google: { enabled: boolean; clientId: string | null } } {
    const clientId = this.clientId;
    return { google: { enabled: clientId !== '', clientId: clientId || null } };
  }

  async login(credential: string): Promise<AuthResult> {
    const clientId = this.clientId;
    if (!clientId) throw new ServiceUnavailableException(GOOGLE_DISABLED);

    let profile: GoogleProfile;
    try {
      profile = await this.verifier.verify(credential, clientId);
    } catch (error) {
      this.logger.warn(`A Google token was refused: ${String(error)}`);
      throw new UnauthorizedException(GOOGLE_REJECTED);
    }
    if (!profile.emailVerified) throw new UnauthorizedException(GOOGLE_EMAIL_UNVERIFIED);

    const email = profile.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ googleId: profile.sub }, { email }] } });

    const user = existing ? await this.signInExisting(existing, profile) : await this.createAccount(profile, email);
    return this.auth.createSession(user);
  }

  private async signInExisting(user: NonNullable<Awaited<ReturnType<PrismaService['user']['findFirst']>>>, profile: GoogleProfile) {
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Tài khoản quản trị không đăng nhập tại đây. Vui lòng dùng cổng quản trị.');
    }
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Tài khoản của bạn đã bị tạm khóa.');
    // The address belongs to an account that is already linked to another Google account: not this one.
    if (user.googleId && user.googleId !== profile.sub) {
      throw new ConflictException('Email này đã liên kết với một tài khoản Google khác.');
    }
    if (user.googleId === profile.sub) return user;

    const now = new Date();
    const neverProvedTheMailbox = user.emailVerifiedAt === null;
    const linked = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.sub,
        emailVerifiedAt: user.emailVerifiedAt ?? now,
        avatarUrl: user.avatarUrl ?? profile.picture,
        ...(neverProvedTheMailbox && { passwordHash: await unusablePassword(), passwordChangedAt: now }),
      },
    });
    if (neverProvedTheMailbox) {
      await this.revocation.revokeAll(user.id, now.getTime());
      if (this.mail) void this.mail.send(googleLinkedMail({ to: linked.email, name: linked.fullName, appUrl: this.mail.appUrl }));
    }
    return linked;
  }

  private async createAccount(profile: GoogleProfile, email: string) {
    try {
      return await this.prisma.user.create({
        data: {
          email,
          fullName: profile.name.trim() || email.split('@')[0],
          passwordHash: await unusablePassword(),
          googleId: profile.sub,
          emailVerifiedAt: new Date(),
          avatarUrl: profile.picture,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      // Two sign-ins at once for a new person: the second finds the account the first made.
      if ((error as { code?: string }).code === 'P2002') {
        const found = await this.prisma.user.findFirst({ where: { OR: [{ googleId: profile.sub }, { email }] } });
        if (found) return found;
      }
      throw error;
    }
  }
}
