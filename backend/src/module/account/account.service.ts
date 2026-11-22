import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AddressDto,
  ChangePasswordDto,
  CreateAddressDto,
  ProfileDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './dto/account.dto.js';

export const MAX_ADDRESSES = 10;
const BCRYPT_ROUNDS = 10;

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  gender: ProfileDto['gender'];
  birthDate: Date | null;
  interests: string[];
  passwordChangedAt: Date | null;
  createdAt: Date;
};

type AddressRow = {
  id: string;
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  label: AddressDto['label'];
  note: string | null;
  isDefault: boolean;
  createdAt: Date;
};

/** Short, human-friendly id derived from the account UUID. */
export function customerCodeOf(userId: string): string {
  return `HSX-${userId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    return this.toProfile(await this.findUser(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileDto> {
    await this.findUser(userId);

    if (dto.phone) {
      const owner = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (owner && owner.id !== userId) {
        throw new ConflictException('Số điện thoại này đã được sử dụng.');
      }
    }

    let birthDate: Date | null | undefined;
    if (dto.birthDate === null) {
      birthDate = null;
    } else if (dto.birthDate) {
      birthDate = new Date(`${dto.birthDate.slice(0, 10)}T00:00:00.000Z`);
      if (birthDate.getTime() > Date.now()) {
        throw new BadRequestException('Ngày sinh không được ở tương lai.');
      }
    }

    let interests: string[] | undefined;
    if (dto.interests) {
      // Keep only real, active categories so the list stays meaningful.
      const slugs = [...new Set(dto.interests)];
      const active = await this.prisma.category.findMany({
        where: { slug: { in: slugs }, isActive: true },
        select: { slug: true },
      });
      const valid = new Set(active.map((c) => c.slug));
      interests = slugs.filter((slug) => valid.has(slug));
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        birthDate,
        interests,
      },
    });
    return this.toProfile(user as UserRow);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ changedAt: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const changedAt = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
        passwordChangedAt: changedAt,
      },
    });
    return { changedAt: changedAt.toISOString() };
  }

  async listAddresses(userId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => this.toAddress(row as AddressRow));
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<AddressDto> {
    const count = await this.prisma.userAddress.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(`Sổ địa chỉ tối đa ${MAX_ADDRESSES} địa chỉ.`);
    }

    // The first address is always the default.
    const isDefault = count === 0 || dto.isDefault === true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.userAddress.create({
        data: { ...this.addressData(dto), userId, isDefault },
      });
    });
    return this.toAddress(created as AddressRow);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<AddressDto> {
    const existing = await this.findAddress(userId, addressId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault && !existing.isDefault) {
        await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.userAddress.update({
        where: { id: addressId },
        // The default can only move to another address, never be switched off here.
        data: { ...this.addressData(dto), isDefault: existing.isDefault || dto.isDefault === true },
      });
    });
    return this.toAddress(updated as AddressRow);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<AddressDto> {
    await this.findAddress(userId, addressId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.userAddress.update({ where: { id: addressId }, data: { isDefault: true } });
    });
    return this.toAddress(updated as AddressRow);
  }

  async deleteAddress(userId: string, addressId: string): Promise<{ id: string }> {
    const existing = await this.findAddress(userId, addressId);

    await this.prisma.$transaction(async (tx) => {
      // Past orders keep their own copy of the shipping address.
      await tx.userAddress.delete({ where: { id: addressId } });

      if (existing.isDefault) {
        const next = await tx.userAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });
    return { id: addressId };
  }

  private async findUser(userId: string): Promise<UserRow> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }
    return user as UserRow;
  }

  /** Addresses are only ever looked up together with their owner. */
  private async findAddress(userId: string, addressId: string): Promise<AddressRow> {
    const address = await this.prisma.userAddress.findFirst({ where: { id: addressId, userId } });
    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ.');
    }
    return address as AddressRow;
  }

  private addressData(dto: CreateAddressDto) {
    return {
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      province: dto.province,
      district: dto.district,
      ward: dto.ward || null,
      streetAddress: dto.streetAddress,
      label: dto.label ?? 'HOME',
      note: dto.note || null,
    };
  }

  private toProfile(user: UserRow): ProfileDto {
    return {
      id: user.id,
      customerCode: customerCodeOf(user.id),
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      gender: user.gender,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      interests: user.interests,
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private toAddress(row: AddressRow): AddressDto {
    return {
      id: row.id,
      recipientName: row.recipientName,
      recipientPhone: row.recipientPhone,
      province: row.province,
      district: row.district,
      ward: row.ward,
      streetAddress: row.streetAddress,
      label: row.label,
      note: row.note,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
