import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AdminVendorCountsDto,
  AdminVendorDetailDto,
  AdminVendorListDto,
  AdminVendorListItemDto,
  AdminVendorListQueryDto,
  AdminVendorStatus,
  VendorDecisionActionValue,
  VendorDecisionDto,
} from './dto/admin-vendor.dto.js';

/** Which status each decision may start from, where it ends, and the owner's resulting role. */
const TRANSITIONS: Record<
  VendorDecisionActionValue,
  { from: AdminVendorStatus; to: AdminVendorStatus; ownerRole: 'VENDOR' | 'CUSTOMER' | null }
> = {
  APPROVE: { from: 'PENDING', to: 'ACTIVE', ownerRole: 'VENDOR' },
  REJECT: { from: 'PENDING', to: 'REJECTED', ownerRole: null },
  SUSPEND: { from: 'ACTIVE', to: 'SUSPENDED', ownerRole: 'CUSTOMER' },
  REACTIVATE: { from: 'SUSPENDED', to: 'ACTIVE', ownerRole: 'VENDOR' },
};

const DEFAULT_LIMIT = 20;

const personSelect = { id: true, fullName: true, email: true } as const;

const decisionInclude = {
  admin: { select: personSelect },
} satisfies Prisma.VendorDecisionInclude;

type DecisionRow = Prisma.VendorDecisionGetPayload<{ include: typeof decisionInclude }>;

function toDecisionDto(row: DecisionRow): VendorDecisionDto {
  return {
    id: row.id,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    admin: row.admin,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class AdminVendorService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminVendorListQueryDto): Promise<AdminVendorListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const search: Prisma.VendorWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { owner: { fullName: { contains: query.q, mode: 'insensitive' } } },
            { owner: { email: { contains: query.q, mode: 'insensitive' } } },
          ],
        }
      : {};
    const where: Prisma.VendorWhereInput = { ...search, ...(query.status ? { status: query.status } : {}) };

    const [rows, totalItems, grouped] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: personSelect },
          decisions: { orderBy: { createdAt: 'desc' }, take: 1, include: decisionInclude },
        },
      }),
      this.prisma.vendor.count({ where }),
      // Tab counts follow the search but not the status filter.
      this.prisma.vendor.groupBy({ by: ['status'], where: search, _count: { _all: true } }),
    ]);

    const counts: AdminVendorCountsDto = { PENDING: 0, ACTIVE: 0, REJECTED: 0, SUSPENDED: 0, total: 0 };
    for (const group of grouped) {
      counts[group.status] = group._count._all;
      counts.total += group._count._all;
    }

    const items: AdminVendorListItemDto[] = rows.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status,
      location: `${vendor.district}, ${vendor.province}`,
      owner: vendor.owner,
      createdAt: vendor.createdAt,
      lastDecision: vendor.decisions[0] ? toDecisionDto(vendor.decisions[0]) : null,
    }));

    return {
      items,
      pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) },
      counts,
    };
  }

  async getDetail(vendorId: string): Promise<AdminVendorDetailDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        owner: { select: { ...personSelect, phone: true, role: true } },
        decisions: { orderBy: { createdAt: 'desc' }, include: decisionInclude },
        _count: { select: { offers: { where: { status: 'ACTIVE' } }, orders: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Không tìm thấy vựa.');

    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      logoUrl: vendor.logoUrl,
      coverUrl: vendor.coverUrl,
      phone: vendor.phone,
      email: vendor.email,
      province: vendor.province,
      district: vendor.district,
      ward: vendor.ward,
      streetAddress: vendor.streetAddress,
      status: vendor.status,
      createdAt: vendor.createdAt,
      owner: vendor.owner,
      offerCount: vendor._count.offers,
      orderCount: vendor._count.orders,
      decisions: vendor.decisions.map(toDecisionDto),
    };
  }

  approve(vendorId: string, adminId: string) {
    return this.decide(vendorId, adminId, 'APPROVE');
  }

  reject(vendorId: string, adminId: string, reason: string) {
    return this.decide(vendorId, adminId, 'REJECT', reason);
  }

  suspend(vendorId: string, adminId: string, reason: string) {
    return this.decide(vendorId, adminId, 'SUSPEND', reason);
  }

  reactivate(vendorId: string, adminId: string) {
    return this.decide(vendorId, adminId, 'REACTIVATE');
  }

  /**
   * Applies one decision. The store status, the owner's role and the audit row
   * are written in a single transaction, so they succeed or fail together.
   */
  private async decide(
    vendorId: string,
    adminId: string,
    action: VendorDecisionActionValue,
    reason?: string,
  ): Promise<AdminVendorDetailDto> {
    const rule = TRANSITIONS[action];

    await this.prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: { id: vendorId },
        select: { id: true, status: true, ownerId: true, owner: { select: { role: true } } },
      });
      if (!vendor) throw new NotFoundException('Không tìm thấy vựa.');

      // The status condition makes a concurrent decision on the same store fail instead of overwriting.
      const moved = await tx.vendor.updateMany({
        where: { id: vendorId, status: rule.from },
        data: { status: rule.to },
      });
      if (moved.count === 0) {
        throw new ConflictException(
          `Không thể thực hiện: vựa đang ở trạng thái ${vendor.status}, chỉ áp dụng khi vựa ở trạng thái ${rule.from}.`,
        );
      }

      // An admin who happens to own a store keeps the ADMIN role.
      if (rule.ownerRole && vendor.owner.role !== 'ADMIN') {
        await tx.user.update({ where: { id: vendor.ownerId }, data: { role: rule.ownerRole } });
      }

      await tx.vendorDecision.create({
        data: {
          vendorId,
          adminId,
          action,
          fromStatus: rule.from,
          toStatus: rule.to,
          reason: reason ?? null,
        },
      });
    });

    return this.getDetail(vendorId);
  }
}
