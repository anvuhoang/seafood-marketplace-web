import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AdministrativeUnitService } from '../../administrative-unit/administrative-unit.service.js';
import type {
  AccountRole,
  RegisterVendorDto,
  VendorApplicationDto,
  VendorRegistrationStatusDto,
} from './dto/vendor-registration.dto.js';

/**
 * First path segments under /vendor/ in the frontend (app/vendor/, including the
 * (console) group). A store with one of these slugs would be shadowed by the
 * page, so they are never assigned. vendor-registration.spec.ts reads the real
 * route folders and fails if this list falls out of step.
 */
export const RESERVED_VENDOR_SLUGS: readonly string[] = ['dashboard', 'orders', 'products', 'register', 'settings', 'statistics'];

export const VENDOR_REGISTRATION_MESSAGES = {
  admin: 'Tài khoản quản trị viên không thể đăng ký gian hàng.',
  inactiveAccount: 'Tài khoản của bạn đang bị khoá hoặc ngưng hoạt động nên không thể đăng ký gian hàng.',
  pending: 'Bạn đã gửi hồ sơ đăng ký gian hàng và đang chờ duyệt. Mỗi tài khoản chỉ được đăng ký một gian hàng.',
  active: 'Tài khoản của bạn đã có gian hàng đang hoạt động. Mỗi tài khoản chỉ được đăng ký một gian hàng.',
  suspended: 'Gian hàng của bạn đang bị tạm ngưng nên không thể đăng ký gian hàng mới.',
  changed: 'Trạng thái hồ sơ vừa thay đổi. Vui lòng tải lại trang và thử lại.',
  exists: 'Tài khoản này đã đăng ký gian hàng. Mỗi tài khoản chỉ được đăng ký một gian hàng.',
} as const;

const SLUG_MAX = 180;
const SLUG_ATTEMPTS = 5;

/** "Vựa Hải Sản Đất Mũi!" → "vua-hai-san-dat-mui". */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

const conflictByStatus = {
  PENDING: VENDOR_REGISTRATION_MESSAGES.pending,
  ACTIVE: VENDOR_REGISTRATION_MESSAGES.active,
  SUSPENDED: VENDOR_REGISTRATION_MESSAGES.suspended,
} as const;

const applicationSelect = {
  id: true,
  name: true,
  slug: true,
  phone: true,
  province: true,
  district: true,
  ward: true,
  streetAddress: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendorSelect;

type ApplicationRow = Prisma.VendorGetPayload<{ select: typeof applicationSelect }>;

@Injectable()
export class VendorRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly administrativeUnits: AdministrativeUnitService,
  ) {}

  async getMyRegistration(userId: string): Promise<VendorRegistrationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        vendor: {
          select: {
            ...applicationSelect,
            decisions: {
              where: { action: 'REJECT' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { reason: true },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');

    const vendor = user.vendor;
    if (!vendor) {
      return { status: 'NONE', accountRole: user.role as AccountRole, application: null, rejectionReason: null };
    }

    return {
      status: vendor.status,
      accountRole: user.role as AccountRole,
      application: this.toApplication(vendor),
      rejectionReason: vendor.status === 'REJECTED' ? (vendor.decisions[0]?.reason ?? null) : null,
    };
  }

  /**
   * Creates a PENDING store for the signed-in account, or re-opens a REJECTED one
   * with the new details. Never changes the account's role: that happens when an
   * admin approves the store.
   */
  async register(userId: string, dto: RegisterVendorDto): Promise<VendorRegistrationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại.');
    if (user.role === 'ADMIN') throw new ForbiddenException(VENDOR_REGISTRATION_MESSAGES.admin);
    if (user.status !== 'ACTIVE') throw new ForbiddenException(VENDOR_REGISTRATION_MESSAGES.inactiveAccount);

    const address = this.administrativeUnits.resolveAddress(dto);
    const details = {
      name: dto.name,
      phone: dto.contactPhone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      streetAddress: dto.streetAddress,
      description: dto.description ?? null,
    };

    const existing = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== 'REJECTED') throw new ConflictException(conflictByStatus[existing.status]);

      // Resubmission: same record and slug, back to PENDING. The status condition
      // makes it fail instead of overwriting if an admin acted in the meantime.
      const moved = await this.prisma.vendor.updateMany({
        where: { id: existing.id, status: 'REJECTED' },
        data: { ...details, status: 'PENDING' },
      });
      if (moved.count === 0) throw new ConflictException(VENDOR_REGISTRATION_MESSAGES.changed);
    } else {
      await this.createWithUniqueSlug(userId, details);
    }

    return this.getMyRegistration(userId);
  }

  /**
   * The unique index on owner_id is what really enforces one store per account:
   * two concurrent requests both pass the check above, and the second insert
   * fails with P2002. A P2002 can also come from two stores racing for the same
   * slug, so after one we look again: an existing store means 409, otherwise
   * the slug is retried.
   */
  private async createWithUniqueSlug(
    ownerId: string,
    details: Omit<Prisma.VendorUncheckedCreateInput, 'ownerId' | 'slug' | 'status'>,
  ): Promise<void> {
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
      const slug = await this.nextFreeSlug(details.name);
      try {
        await this.prisma.vendor.create({ data: { ...details, ownerId, slug, status: 'PENDING' } });
        return;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        const raced = await this.prisma.vendor.findUnique({ where: { ownerId }, select: { id: true } });
        if (raced) throw new ConflictException(VENDOR_REGISTRATION_MESSAGES.exists);
      }
    }
    throw new ConflictException(VENDOR_REGISTRATION_MESSAGES.changed);
  }

  /** The name's slug, or the first free "-2", "-3", ... variant. Reserved route names are skipped. */
  private async nextFreeSlug(name: string): Promise<string> {
    const base = slugify(name) || 'vua';
    const taken = new Set(
      (
        await this.prisma.vendor.findMany({
          where: { slug: { startsWith: base } },
          select: { slug: true },
        })
      ).map((row) => row.slug),
    );
    for (const reserved of RESERVED_VENDOR_SLUGS) taken.add(reserved);

    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  private toApplication(vendor: ApplicationRow): VendorApplicationDto {
    const codes = this.administrativeUnits.findCodes(vendor);
    return {
      name: vendor.name,
      slug: vendor.slug,
      contactPhone: vendor.phone,
      province: vendor.province,
      district: vendor.district,
      ward: vendor.ward,
      ...codes,
      streetAddress: vendor.streetAddress,
      description: vendor.description,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
