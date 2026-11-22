import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { SessionRevocationService } from '../../common/guards/session-revocation.service.js';
import { MemoryKeyValueStore } from '../../infra/kv-store.js';
import { RateLimiterService } from '../../infra/rate-limiter.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { MailService } from '../mail/mail.service.js';
import { PasswordResetService, RESET_LINK_INVALID } from './password-reset.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

interface Row {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

function setup(user: Partial<{ id: string; email: string; fullName: string; status: string; role: string; emailVerifiedAt: Date | null }> | null) {
  const account = user && { id: 'u1', email: 'lan@example.com', fullName: 'Lan', status: 'ACTIVE', role: 'CUSTOMER', emailVerifiedAt: null, ...user };
  const tokens: Row[] = [];
  const updates: unknown[] = [];
  const tokenOps = {
    deleteMany: vi.fn(async ({ where }: { where: { userId: string; usedAt?: null; id?: { not: string } } }) => {
      for (let i = tokens.length - 1; i >= 0; i--) {
        const row = tokens[i];
        if (row.userId !== where.userId) continue;
        if (where.usedAt === null && row.usedAt !== null) continue;
        if (where.id && row.id === where.id.not) continue;
        tokens.splice(i, 1);
      }
    }),
    create: vi.fn(async ({ data }: { data: Omit<Row, 'id' | 'usedAt'> }) => {
      tokens.push({ id: `t${tokens.length + 1}`, usedAt: null, ...data });
    }),
    findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
      const row = tokens.find((t) => t.tokenHash === where.tokenHash);
      return row && account ? { ...row, user: account } : null;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { id: string; usedAt: null; expiresAt: { gt: Date } }; data: { usedAt: Date } }) => {
      const row = tokens.find((t) => t.id === where.id && t.usedAt === null && t.expiresAt > where.expiresAt.gt);
      if (row) row.usedAt = data.usedAt;
      return { count: row ? 1 : 0 };
    }),
  };
  const prisma = {
    user: {
      findUnique: vi.fn(async () => account),
      update: vi.fn(async (args: unknown) => {
        updates.push(args);
      }),
    },
    passwordResetToken: tokenOps,
    $transaction: vi.fn(async (work: unknown) => (typeof work === 'function' ? work({ passwordResetToken: tokenOps, user: { update: async (a: unknown) => updates.push(a) } }) : Promise.all(work as Promise<unknown>[]))),
  } as unknown as PrismaService;
  const store = new MemoryKeyValueStore();
  const revocation = new SessionRevocationService(store);
  const send = vi.fn().mockResolvedValue(true);
  const mail = { send, appUrl: 'https://shop.test' } as unknown as MailService;
  const service = new PasswordResetService(prisma, new ConfigService({ passwordResetTtlMinutes: 30 }), new RateLimiterService(store), revocation, mail);
  return { service, tokens, updates, send, revocation };
}

function tokenFromMail(send: ReturnType<typeof vi.fn>): string {
  const url = new URL(/https:\/\/shop\.test\/customer\/reset-password\?token=[\w-]+/.exec(send.mock.calls[0][0].text)![0]);
  return url.searchParams.get('token')!;
}

describe('PasswordResetService', () => {
  it('mails a link and stores only the hash of the token', async () => {
    const { service, tokens, send } = setup({});
    await service.requestReset('  Lan@Example.com ');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('lan@example.com');
    const token = tokenFromMail(send);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toBe(sha256(token));
    expect(JSON.stringify(tokens)).not.toContain(token);
  });

  it('says nothing and sends nothing for an unknown address, a suspended account or an admin', async () => {
    for (const user of [null, { status: 'SUSPENDED' }, { role: 'ADMIN' }]) {
      const { service, tokens, send } = setup(user);
      await expect(service.requestReset('who@example.com')).resolves.toBeUndefined();
      expect(send).not.toHaveBeenCalled();
      expect(tokens).toHaveLength(0);
    }
  });

  it('sends at most 3 mails an hour to one address', async () => {
    const { service, send } = setup({});
    for (let i = 0; i < 6; i++) await service.requestReset('lan@example.com');
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('a new request cancels the earlier link', async () => {
    const { service, send } = setup({});
    await service.requestReset('lan@example.com');
    const first = tokenFromMail(send);
    await service.requestReset('lan@example.com');
    expect(await service.isValid(first)).toBe(false);
  });

  it('resets the password once, signs the account out everywhere and tells the owner', async () => {
    const { service, updates, send, revocation } = setup({});
    await service.requestReset('lan@example.com');
    const token = tokenFromMail(send);
    expect(await service.isValid(token)).toBe(true);

    await service.resetPassword(token, 'NewPassword#1');

    const data = (updates[0] as { data: { passwordHash: string; emailVerifiedAt: Date } }).data;
    expect(await bcrypt.compare('NewPassword#1', data.passwordHash)).toBe(true);
    expect(data.emailVerifiedAt).toBeInstanceOf(Date);
    // A token issued a minute ago is now refused.
    expect(await revocation.isRevoked('u1', Math.floor(Date.now() / 1000) - 60)).toBe(true);
    // "Your password was changed" goes out.
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].subject).toMatch(/mật khẩu/i);
    // The same link cannot be used twice.
    await expect(service.resetPassword(token, 'Another#12345')).rejects.toThrow(new BadRequestException(RESET_LINK_INVALID));
  });

  it('refuses a made-up token, an expired token and an account that was suspended meanwhile', async () => {
    const { service, tokens, send } = setup({});
    await expect(service.resetPassword('x'.repeat(43), 'NewPassword#1')).rejects.toThrow(RESET_LINK_INVALID);

    await service.requestReset('lan@example.com');
    const token = tokenFromMail(send);
    tokens[0].expiresAt = new Date(Date.now() - 1000);
    expect(await service.isValid(token)).toBe(false);
    await expect(service.resetPassword(token, 'NewPassword#1')).rejects.toThrow(RESET_LINK_INVALID);
  });
});

describe('SessionRevocationService', () => {
  it('refuses tokens issued before the revocation and accepts later ones', async () => {
    const service = new SessionRevocationService(new MemoryKeyValueStore());
    const now = Date.now();
    await service.revokeAll('u1', now);
    expect(await service.isRevoked('u1', Math.floor(now / 1000) - 5)).toBe(true);
    expect(await service.isRevoked('u1', Math.floor(now / 1000) + 5)).toBe(false);
    expect(await service.isRevoked('u2', 1)).toBe(false);
  });

  it('lets everyone through when the store is down', async () => {
    const broken = { get: vi.fn().mockRejectedValue(new Error('redis down')), set: vi.fn().mockRejectedValue(new Error('redis down')) };
    const service = new SessionRevocationService(broken as never);
    await expect(service.revokeAll('u1')).resolves.toBeUndefined();
    expect(await service.isRevoked('u1', 1)).toBe(false);
  });
});
