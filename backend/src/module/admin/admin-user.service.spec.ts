import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUserController } from './admin-user.controller.js';
import { AdminUserService } from './admin-user.service.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  fullName: 'Nguyễn Văn A',
  email: 'a@example.com',
  phone: '0900000001',
  avatarUrl: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  vendor: null,
  _count: { orders: 2 },
  ...overrides,
});

describe('AdminUserService', () => {
  let service: AdminUserService;
  let prisma: {
    user: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    vendor: { count: ReturnType<typeof vi.fn> };
    order: { groupBy: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([row()]),
        count: vi.fn().mockResolvedValue(1),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      vendor: { count: vi.fn().mockResolvedValue(0) },
      order: { groupBy: vi.fn().mockResolvedValue([]) },
    };
    service = new AdminUserService(prisma as unknown as PrismaService);
  });

  it('never selects the password hash', async () => {
    await service.list({});

    const select = prisma.user.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty('passwordHash');
    expect(select).toHaveProperty('email');
  });

  it('adds order figures, leaving cancelled orders out of the value', async () => {
    prisma.order.groupBy.mockResolvedValue([{ userId: 'user-1', _sum: { grandTotal: '450000.00' } }]);

    const result = await service.list({});

    expect(prisma.order.groupBy.mock.calls[0]![0].where).toEqual({
      userId: { in: ['user-1'] },
      status: { not: 'CANCELLED' },
    });
    expect(result.items[0]).toMatchObject({ orderCount: 2, orderTotal: 450000 });
    expect(result.items[0]).not.toHaveProperty('_count');
  });

  it('shows 0 for an account without orders', async () => {
    const result = await service.list({});

    expect(result.items[0]!.orderTotal).toBe(0);
  });

  it('applies role, status and search together', async () => {
    await service.list({ role: 'VENDOR', status: 'SUSPENDED', q: 'an' });

    expect(prisma.user.findMany.mock.calls[0]![0].where).toEqual({
      role: 'VENDOR',
      status: 'SUSPENDED',
      OR: [
        { fullName: { contains: 'an', mode: 'insensitive' } },
        { email: { contains: 'an', mode: 'insensitive' } },
        { phone: { contains: 'an' } },
      ],
    });
  });

  it('paginates', async () => {
    prisma.user.count.mockImplementation(async (args?: { where?: { createdAt?: unknown } }) =>
      args?.where?.createdAt ? 3 : 45,
    );

    const result = await service.list({ page: 3, limit: 20 });

    expect(prisma.user.findMany.mock.calls[0]![0]).toMatchObject({ skip: 40, take: 20 });
    expect(result.pagination).toEqual({ page: 3, limit: 20, totalItems: 45, totalPages: 3 });
  });

  it('counts the whole system regardless of the filters', async () => {
    prisma.user.groupBy.mockResolvedValue([
      { role: 'CUSTOMER', status: 'ACTIVE', _count: { _all: 8 } },
      { role: 'CUSTOMER', status: 'SUSPENDED', _count: { _all: 1 } },
      { role: 'VENDOR', status: 'ACTIVE', _count: { _all: 7 } },
      { role: 'ADMIN', status: 'ACTIVE', _count: { _all: 1 } },
    ]);
    prisma.vendor.count.mockResolvedValue(6);
    prisma.user.count.mockImplementation(async (args?: { where?: { createdAt?: unknown } }) =>
      args?.where?.createdAt ? 3 : 1,
    );

    const { counts } = await service.list({ role: 'ADMIN' });

    expect(prisma.user.groupBy.mock.calls[0]![0].where).toBeUndefined();
    expect(counts).toEqual({
      total: 17,
      byRole: { CUSTOMER: 9, VENDOR: 7, ADMIN: 1 },
      byStatus: { ACTIVE: 16, INACTIVE: 0, SUSPENDED: 1 },
      activeVendors: 6,
      newLast30Days: 3,
    });
  });
});

describe('AdminUserController access', () => {
  it('is restricted to the ADMIN role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminUserController)).toEqual(['ADMIN']);
  });
});
