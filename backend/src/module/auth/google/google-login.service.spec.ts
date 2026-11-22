import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionRevocationService } from '../../../common/guards/session-revocation.service.js';
import { MemoryKeyValueStore } from '../../../infra/kv-store.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { MailService } from '../../mail/mail.service.js';
import { AuthService } from '../auth.service.js';
import { GOOGLE_EMAIL_UNVERIFIED, GOOGLE_REJECTED, GoogleLoginService } from './google-login.service.js';
import type { GoogleProfile, GoogleVerifier } from './google-verifier.js';

type UserRow = Record<string, unknown> & { id: string; email: string; role: string; status: string; googleId: string | null; emailVerifiedAt: Date | null };

const base = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'u1',
  email: 'lan@example.com',
  fullName: 'Lan',
  phone: null,
  avatarUrl: null,
  passwordHash: 'hash',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  googleId: null,
  emailVerifiedAt: null,
  passwordChangedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const profile: GoogleProfile = { sub: 'g-1', email: 'Lan@Example.com', emailVerified: true, name: 'Lan Nguyen', picture: 'https://pic/1' };

function setup(existing: UserRow | null, verify: GoogleVerifier['verify'] = async () => profile, clientId = 'client-id') {
  const created: UserRow[] = [];
  const updated: Array<{ where: unknown; data: Record<string, unknown> }> = [];
  const prisma = {
    user: {
      findFirst: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = base({ id: 'new', ...data } as Partial<UserRow>);
        created.push(row);
        return row;
      }),
      update: vi.fn(async (args: { where: unknown; data: Record<string, unknown> }) => {
        updated.push(args);
        return { ...existing, ...args.data };
      }),
    },
  } as unknown as PrismaService;
  const store = new MemoryKeyValueStore();
  const revocation = new SessionRevocationService(store);
  const send = vi.fn().mockResolvedValue(true);
  const mail = { send, appUrl: 'https://shop.test' } as unknown as MailService;
  const config = new ConfigService({ google: { clientId }, jwtSecret: 'x'.repeat(40) });
  const jwt = new JwtService({ secret: 'x'.repeat(40) });
  const auth = new AuthService(prisma, jwt, config, {} as never);
  const service = new GoogleLoginService(prisma, config, auth, revocation, { verify }, mail);
  return { service, created, updated, send, revocation, jwt };
}

describe('GoogleLoginService', () => {
  it('shows the Google button only when a client ID is set', () => {
    expect(setup(null).service.providers()).toEqual({ google: { enabled: true, clientId: 'client-id' } });
    expect(setup(null, undefined, '').service.providers()).toEqual({ google: { enabled: false, clientId: null } });
  });

  it('is unavailable when no client ID is set', async () => {
    await expect(setup(null, undefined, '').service.login('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('refuses a token Google does not accept, and one whose email is not verified', async () => {
    await expect(setup(null, async () => { throw new Error('bad signature'); }).service.login('x')).rejects.toThrow(GOOGLE_REJECTED);
    await expect(setup(null, async () => ({ ...profile, emailVerified: false })).service.login('x')).rejects.toThrow(GOOGLE_EMAIL_UNVERIFIED);
  });

  it('checks the token against this site\'s client ID', async () => {
    const verify = vi.fn(async () => profile);
    await setup(null, verify).service.login('the-token');
    expect(verify).toHaveBeenCalledWith('the-token', 'client-id');
  });

  it('creates a verified customer account for a new person and signs them in', async () => {
    const { service, created, jwt } = setup(null);
    const result = await service.login('t');
    expect(created[0]).toMatchObject({ email: 'lan@example.com', googleId: 'g-1', role: 'CUSTOMER', fullName: 'Lan Nguyen' });
    expect(created[0].emailVerifiedAt).toBeInstanceOf(Date);
    expect(result.user.email).toBe('lan@example.com');
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|googleId|emailVerifiedAt/);
    expect(jwt.verify(result.accessToken)).toMatchObject({ sub: 'new', role: 'CUSTOMER' });
  });

  it('signs in an account already linked to this Google account, changing nothing', async () => {
    const { service, updated } = setup(base({ googleId: 'g-1', emailVerifiedAt: new Date() }));
    await service.login('t');
    expect(updated).toHaveLength(0);
  });

  it('links a verified account without touching its password', async () => {
    const { service, updated, send } = setup(base({ emailVerifiedAt: new Date() }));
    await service.login('t');
    expect(updated[0].data).toMatchObject({ googleId: 'g-1' });
    expect(updated[0].data).not.toHaveProperty('passwordHash');
    expect(send).not.toHaveBeenCalled();
  });

  it('takes the password away from an account whose mailbox was never proved, signs it out and tells the owner', async () => {
    const { service, updated, send, revocation } = setup(base({ emailVerifiedAt: null }));
    await service.login('t');
    expect(updated[0].data.passwordHash).not.toBe('hash');
    expect(updated[0].data.passwordChangedAt).toBeInstanceOf(Date);
    expect(await revocation.isRevoked('u1', Math.floor(Date.now() / 1000) - 60)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('lan@example.com');
  });

  it('never signs in an admin, a suspended account, or an address linked to a different Google account', async () => {
    await expect(setup(base({ role: 'ADMIN' })).service.login('t')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup(base({ status: 'SUSPENDED' })).service.login('t')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(setup(base({ googleId: 'someone-else' })).service.login('t')).rejects.toBeInstanceOf(ConflictException);
  });
});
