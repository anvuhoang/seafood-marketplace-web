import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  AdminUserCountsDto,
  AdminUserListDto,
  AdminUserListQueryDto,
} from './dto/admin-user.dto.js';

const DEFAULT_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest accounts first. Fields are picked one by one, so the password hash can never leave here. */
  async list(query: AdminUserListQueryDto): Promise<AdminUserListDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [rows, totalItems, counts] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          vendor: { select: { name: true, slug: true, status: true } },
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
      this.counts(),
    ]);

    const totals = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: rows.map((row) => row.id) }, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
    });
    const totalByUser = new Map(totals.map((row) => [row.userId, Number(row._sum.grandTotal ?? 0)]));

    return {
      items: rows.map(({ _count, ...row }) => ({
        ...row,
        orderCount: _count.orders,
        orderTotal: totalByUser.get(row.id) ?? 0,
      })),
      pagination: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) },
      counts,
    };
  }

  private async counts(): Promise<AdminUserCountsDto> {
    const [grouped, activeVendors, newLast30Days] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role', 'status'], _count: { _all: true } }),
      this.prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * DAY_MS) } } }),
    ]);

    const counts: AdminUserCountsDto = {
      total: 0,
      byRole: { CUSTOMER: 0, VENDOR: 0, ADMIN: 0 },
      byStatus: { ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 },
      activeVendors,
      newLast30Days,
    };
    for (const group of grouped) {
      counts.total += group._count._all;
      counts.byRole[group.role] += group._count._all;
      counts.byStatus[group.status] += group._count._all;
    }
    return counts;
  }
}
