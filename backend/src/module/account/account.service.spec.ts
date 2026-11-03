import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountService, MAX_ADDRESSES, customerCodeOf } from './account.service.js';
import { CreateAddressDto, UpdateProfileDto } from './dto/account.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const USER_ID = '11111111-2222-3333-4444-555555555555';

const userRow = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: 'an@example.com',
  fullName: 'Nguyễn Văn An',
  phone: '0912345678',
  avatarUrl: null,
  role: 'CUSTOMER',
  gender: null,
  birthDate: null,
  interests: [],
  passwordChangedAt: null,
  passwordHash: 'hash',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const addressRow = (id: string, isDefault: boolean) => ({
  id,
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0912345678',
  province: 'TP. Hồ Chí Minh',
  district: 'Quận 1',
  ward: null,
  streetAddress: 'Số 42 Nguyễn Trãi',
  label: 'HOME',
  note: null,
  isDefault,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

const addressInput: CreateAddressDto = {
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0912345678',
  province: 'TP. Hồ Chí Minh',
  district: 'Quận 1',
  streetAddress: 'Số 42 Nguyễn Trãi',
};

describe('AccountService', () => {
  let service: AccountService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn(), update: vi.fn() },
      category: { findMany: vi.fn() },
      userAddress: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    };
    // Run transaction callbacks against the same mock.
    prisma.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(prisma));
    service = new AccountService(prisma as PrismaService);
  });

  it('derives a short customer code from the account id', () => {
    expect(customerCodeOf(USER_ID)).toBe('HSX-111111');
  });

  describe('profile', () => {
    it('returns the profile without the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow({ birthDate: new Date('1990-08-15T00:00:00Z') }));

      const profile = await service.getProfile(USER_ID);

      expect(profile).toMatchObject({ customerCode: 'HSX-111111', birthDate: '1990-08-15' });
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('rejects a phone number that belongs to someone else', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(userRow())
        .mockResolvedValueOnce(userRow({ id: 'other-user' }));

      await expect(service.updateProfile(USER_ID, { phone: '0987654321' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a birth date in the future', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());

      await expect(service.updateProfile(USER_ID, { birthDate: '2999-01-01' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('keeps only active category slugs as interests', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());
      prisma.category.findMany.mockResolvedValue([{ slug: 'tom-song' }]);
      prisma.user.update.mockImplementation(({ data }: any) => Promise.resolve(userRow(data)));

      const profile = await service.updateProfile(USER_ID, { interests: ['tom-song', 'tom-song', 'khong-ton-tai'] });

      expect(profile.interests).toEqual(['tom-song']);
    });
  });

  describe('password', () => {
    it('rejects a wrong current password', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow({ passwordHash: await bcrypt.hash('dung-roi', 4) }));

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'sai-roi', newPassword: 'moi-123456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow({ passwordHash: await bcrypt.hash('giong-nhau', 4) }));

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'giong-nhau', newPassword: 'giong-nhau' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a new hash and the change time', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow({ passwordHash: await bcrypt.hash('cu-123456', 4) }));
      prisma.user.update.mockResolvedValue(userRow());

      await service.changePassword(USER_ID, { currentPassword: 'cu-123456', newPassword: 'moi-123456' });

      const { data } = prisma.user.update.mock.calls[0][0];
      expect(await bcrypt.compare('moi-123456', data.passwordHash)).toBe(true);
      expect(data.passwordChangedAt).toBeInstanceOf(Date);
    });
  });

  describe('addresses', () => {
    it('makes the first address the default', async () => {
      prisma.userAddress.count.mockResolvedValue(0);
      prisma.userAddress.create.mockImplementation(({ data }: any) => Promise.resolve({ ...addressRow('a1', data.isDefault), ...data }));

      const created = await service.createAddress(USER_ID, addressInput);

      expect(created.isDefault).toBe(true);
      expect(prisma.userAddress.create.mock.calls[0][0].data.userId).toBe(USER_ID);
    });

    it('moves the default when a new default address is added', async () => {
      prisma.userAddress.count.mockResolvedValue(2);
      prisma.userAddress.create.mockImplementation(({ data }: any) => Promise.resolve({ ...addressRow('a3', true), ...data }));

      await service.createAddress(USER_ID, { ...addressInput, isDefault: true });

      expect(prisma.userAddress.updateMany).toHaveBeenCalledWith({ where: { userId: USER_ID }, data: { isDefault: false } });
    });

    it(`limits the address book to ${MAX_ADDRESSES} entries`, async () => {
      prisma.userAddress.count.mockResolvedValue(MAX_ADDRESSES);

      await expect(service.createAddress(USER_ID, addressInput)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userAddress.create).not.toHaveBeenCalled();
    });

    it("cannot touch another user's address", async () => {
      prisma.userAddress.findFirst.mockResolvedValue(null);

      await expect(service.updateAddress(USER_ID, 'a-of-someone-else', addressInput)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.deleteAddress(USER_ID, 'a-of-someone-else')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.setDefaultAddress(USER_ID, 'a-of-someone-else')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.userAddress.findFirst).toHaveBeenCalledWith({ where: { id: 'a-of-someone-else', userId: USER_ID } });
      expect(prisma.userAddress.update).not.toHaveBeenCalled();
      expect(prisma.userAddress.delete).not.toHaveBeenCalled();
    });

    it('promotes the newest remaining address after deleting the default', async () => {
      prisma.userAddress.findFirst
        .mockResolvedValueOnce(addressRow('a1', true))
        .mockResolvedValueOnce(addressRow('a2', false));

      await service.deleteAddress(USER_ID, 'a1');

      expect(prisma.userAddress.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(prisma.userAddress.update).toHaveBeenCalledWith({ where: { id: 'a2' }, data: { isDefault: true } });
    });

    it('does not switch the default off when editing it', async () => {
      prisma.userAddress.findFirst.mockResolvedValue(addressRow('a1', true));
      prisma.userAddress.update.mockImplementation(({ data }: any) => Promise.resolve({ ...addressRow('a1', true), ...data }));

      const updated = await service.updateAddress(USER_ID, 'a1', { ...addressInput, isDefault: false });

      expect(updated.isDefault).toBe(true);
    });
  });

  describe('validation', () => {
    const errorsFor = async (cls: any, body: Record<string, unknown>) =>
      (await validate(plainToInstance(cls, body))).map((e) => e.property).sort();

    it('validates profile updates', async () => {
      expect(await errorsFor(UpdateProfileDto, { fullName: ' Nguyễn Văn An ', phone: '0912345678', gender: 'MALE', birthDate: '1990-08-15' })).toEqual([]);
      expect(await errorsFor(UpdateProfileDto, { fullName: 'A', phone: '12345', gender: 'X', birthDate: '15/08/1990' })).toEqual([
        'birthDate',
        'fullName',
        'gender',
        'phone',
      ]);
    });

    it('validates addresses', async () => {
      expect(await errorsFor(CreateAddressDto, { ...addressInput, label: 'OFFICE', note: 'Gọi trước' })).toEqual([]);
      expect(await errorsFor(CreateAddressDto, { recipientPhone: 'abc', label: 'CASTLE' })).toEqual([
        'district',
        'label',
        'province',
        'recipientName',
        'recipientPhone',
        'streetAddress',
      ]);
    });
  });
});
