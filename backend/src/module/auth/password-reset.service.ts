import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { SessionRevocationService } from '../../common/guards/session-revocation.service.js';
import { RateLimiterService } from '../../infra/rate-limiter.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { passwordChangedMail, passwordResetMail } from '../mail/mail.templates.js';
import { MailService } from '../mail/mail.service.js';

export const RESET_LINK_INVALID = 'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một đường dẫn mới.';
/** What the visitor is told whether or not the address has an account, so the form cannot be used to find out who has one. */
export const RESET_REQUESTED = 'Nếu email này có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả mục thư rác).';
export const PASSWORD_RESET_DONE = 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.';

/** One address may ask for this many mails per hour, whoever asks: a stranger cannot fill someone's inbox. */
const REQUESTS_PER_EMAIL = 3;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * "I forgot my password": a link by email, with a token that works once and only for a short time.
 *
 * - Only the SHA-256 of the token is stored, so a copy of the database cannot be used to reset a password.
 * - Asking always gets the same answer, so the form does not reveal which addresses have an account.
 * - A new request cancels the earlier links. Finishing a reset cancels all the others, signs the account out
 *   everywhere (tokens issued before are refused) and tells the owner by mail.
 * - Admin accounts are left out: they are not reset by a mail.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly limiter: RateLimiterService,
    private readonly revocation: SessionRevocationService,
    @Optional() private readonly mail?: MailService,
  ) {}

  private get ttlMinutes(): number {
    return this.config.get<number>('passwordResetTtlMinutes') ?? 30;
  }

  /** Sends the link if the address has an account that may be reset. Never says whether it did. */
  async requestReset(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE' || user.role === 'ADMIN') return;

    const allowed = await this.limiter.hit(`pwreset:${sha256(email)}`, REQUESTS_PER_EMAIL, REQUEST_WINDOW_MS);
    if (!allowed.allowed) return;

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt } }),
    ]);

    if (this.mail) {
      const url = `${this.mail.appUrl}/customer/reset-password?token=${token}`;
      void this.mail.send(passwordResetMail({ to: user.email, name: user.fullName, url, minutes: this.ttlMinutes }));
    }
  }

  /** Is this link still good? So the page can say so before the customer types a new password. */
  async isValid(token: string): Promise<boolean> {
    const found = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      select: { usedAt: true, expiresAt: true, user: { select: { status: true, role: true } } },
    });
    return Boolean(found && !found.usedAt && found.expiresAt > new Date() && found.user.status === 'ACTIVE' && found.user.role !== 'ADMIN');
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const found = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { id: true, email: true, fullName: true, status: true, role: true, emailVerifiedAt: true } } },
    });
    const now = new Date();
    if (!found || found.usedAt || found.expiresAt <= now || found.user.status !== 'ACTIVE' || found.user.role === 'ADMIN') {
      throw new BadRequestException(RESET_LINK_INVALID);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const outcome = await this.prisma.$transaction(async (tx) => {
      // The link is used up first and only once: two requests with the same link cannot both win.
      const used = await tx.passwordResetToken.updateMany({ where: { id: found.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (used.count !== 1) return false;
      await tx.user.update({
        where: { id: found.user.id },
        // Reaching the mailbox proves the address is theirs.
        data: { passwordHash, passwordChangedAt: now, emailVerifiedAt: found.user.emailVerifiedAt ?? now },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: found.user.id, id: { not: found.id } } });
      return true;
    });
    if (!outcome) throw new BadRequestException(RESET_LINK_INVALID);

    await this.revocation.revokeAll(found.user.id, now.getTime());
    if (this.mail) {
      void this.mail.send(passwordChangedMail({ to: found.user.email, name: found.user.fullName, appUrl: this.mail.appUrl, at: now }));
    }
  }
}
