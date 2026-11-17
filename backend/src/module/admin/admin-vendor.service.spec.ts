import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminVendorService } from './admin-vendor.service.js';
import { AdminVendorController } from './admin-vendor.controller.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const VENDOR_ID = 'vendor-1';
const ADMIN_ID = 'admin-1';
const OWNER_ID = 'owner-1';

/** A vendor row as the transaction first reads it. */
const vendorState = (status: string, ownerRole = 'CUSTOMER') => ({
  id: VENDOR_ID,
  status,
  ownerId: OWNER_ID,
  owner: { role: ownerRole },
});

/** The row getDetail reads after the decision. */
const detailRow = (status: string) => ({
  id: VENDOR_ID,
  name: 'Vựa A',
  slug: 'vua-a',
  description: null,
  logoUrl: null,
  coverUrl: null,
  phone: null,
  email: null,
  province: 'Kiên Giang',
  district: 'Phú Quốc',
  ward: null,
  streetAddress: '1 Bến Cảng',
  status,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  owner: { id: OWNER_ID, fullName: 'Chủ vựa', email: 'chu@example.com', phone: null, role: 'VENDOR' },
  decisions: [],
  _count: { offers: 3, orders: 7 },
});

describe('AdminVendorService', () => {
  let service: AdminVendorService;
  let tx: {
    vendor: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
    user: { update: ReturnType<typeof vi.fn> };
    vendorDecision: { create: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    vendor: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    tx = {
      vendor: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue({}) },
      vendorDecision: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
      vendor: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
    };
    service = new AdminVendorService(prisma as unknown as PrismaService);
  });

  describe('approve', () => {
    it('activates the store, promotes the owner to VENDOR and records the decision', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('ACTIVE'));

      const result = await service.approve(VENDOR_ID, ADMIN_ID);

      expect(tx.vendor.updateMany).toHaveBeenCalledWith({
        where: { id: VENDOR_ID, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: OWNER_ID }, data: { role: 'VENDOR' } });
      expect(tx.vendorDecision.create).toHaveBeenCalledWith({
        data: {
          vendorId: VENDOR_ID,
          adminId: ADMIN_ID,
          action: 'APPROVE',
          fromStatus: 'PENDING',
          toStatus: 'ACTIVE',
          reason: null,
        },
      });
      expect(result.status).toBe('ACTIVE');
    });

    it('runs the status change, role change and audit row inside one transaction', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('ACTIVE'));

      await service.approve(VENDOR_ID, ADMIN_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('leaves the owner role alone when the owner is an ADMIN', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING', 'ADMIN'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('ACTIVE'));

      await service.approve(VENDOR_ID, ADMIN_ID);

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.vendorDecision.create).toHaveBeenCalled();
    });

    it('refuses a store that is not PENDING and changes nothing', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('ACTIVE', 'VENDOR'));
      tx.vendor.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve(VENDOR_ID, ADMIN_ID)).rejects.toThrow(ConflictException);
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.vendorDecision.create).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown store', async () => {
      tx.vendor.findUnique.mockResolvedValue(null);

      await expect(service.approve(VENDOR_ID, ADMIN_ID)).rejects.toThrow(NotFoundException);
      expect(tx.vendor.updateMany).not.toHaveBeenCalled();
    });

    it('does not report success when recording the decision fails', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING'));
      tx.vendorDecision.create.mockRejectedValue(new Error('db down'));

      // The transaction rejects, so Prisma rolls back the status and role writes.
      await expect(service.approve(VENDOR_ID, ADMIN_ID)).rejects.toThrow('db down');
      expect(prisma.vendor.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('rejects a pending store with a reason and keeps the owner a CUSTOMER', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('REJECTED'));

      await service.reject(VENDOR_ID, ADMIN_ID, 'Thiếu giấy phép ATTP');

      expect(tx.vendor.updateMany).toHaveBeenCalledWith({
        where: { id: VENDOR_ID, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.vendorDecision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'REJECT',
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          reason: 'Thiếu giấy phép ATTP',
          adminId: ADMIN_ID,
        }),
      });
    });

    it('refuses to reject a store that is already decided', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('REJECTED'));
      tx.vendor.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reject(VENDOR_ID, ADMIN_ID, 'Lý do bất kỳ')).rejects.toThrow(ConflictException);
    });
  });

  describe('suspend', () => {
    it('suspends an active store and returns the owner to CUSTOMER', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('ACTIVE', 'VENDOR'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('SUSPENDED'));

      await service.suspend(VENDOR_ID, ADMIN_ID, 'Bán hàng không đạt chuẩn');

      expect(tx.vendor.updateMany).toHaveBeenCalledWith({
        where: { id: VENDOR_ID, status: 'ACTIVE' },
        data: { status: 'SUSPENDED' },
      });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: OWNER_ID }, data: { role: 'CUSTOMER' } });
      expect(tx.vendorDecision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SUSPEND',
          fromStatus: 'ACTIVE',
          toStatus: 'SUSPENDED',
          reason: 'Bán hàng không đạt chuẩn',
        }),
      });
    });

    it('never demotes an ADMIN who owns the store', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('ACTIVE', 'ADMIN'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('SUSPENDED'));

      await service.suspend(VENDOR_ID, ADMIN_ID, 'Kiểm tra định kỳ');

      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('refuses a store that is not ACTIVE', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('PENDING'));
      tx.vendor.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.suspend(VENDOR_ID, ADMIN_ID, 'Lý do bất kỳ')).rejects.toThrow(ConflictException);
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('reactivates a suspended store and gives the owner the VENDOR role back', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('SUSPENDED', 'CUSTOMER'));
      prisma.vendor.findUnique.mockResolvedValue(detailRow('ACTIVE'));

      await service.reactivate(VENDOR_ID, ADMIN_ID);

      expect(tx.vendor.updateMany).toHaveBeenCalledWith({
        where: { id: VENDOR_ID, status: 'SUSPENDED' },
        data: { status: 'ACTIVE' },
      });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: OWNER_ID }, data: { role: 'VENDOR' } });
      expect(tx.vendorDecision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'REACTIVATE', fromStatus: 'SUSPENDED', toStatus: 'ACTIVE' }),
      });
    });

    it('refuses a store that is not SUSPENDED', async () => {
      tx.vendor.findUnique.mockResolvedValue(vendorState('REJECTED'));
      tx.vendor.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reactivate(VENDOR_ID, ADMIN_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('returns tab counts for every status, filling missing ones with 0', async () => {
      prisma.vendor.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { _all: 2 } },
        { status: 'ACTIVE', _count: { _all: 5 } },
      ]);

      const result = await service.list({});

      expect(result.counts).toEqual({ PENDING: 2, ACTIVE: 5, REJECTED: 0, SUSPENDED: 0, total: 7 });
    });

    it('filters by status and paginates', async () => {
      prisma.vendor.count.mockResolvedValue(45);

      const result = await service.list({ status: 'PENDING', page: 2, limit: 20 });

      expect(prisma.vendor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' }, skip: 20, take: 20 }),
      );
      expect(result.pagination).toEqual({ page: 2, limit: 20, totalItems: 45, totalPages: 3 });
    });

    it('applies the search to the tab counts but not the status filter', async () => {
      await service.list({ status: 'ACTIVE', q: 'phú quốc' });

      const groupByArgs = prisma.vendor.groupBy.mock.calls[0][0];
      expect(groupByArgs.where).toHaveProperty('OR');
      expect(groupByArgs.where).not.toHaveProperty('status');
    });
  });

  describe('getDetail', () => {
    it('throws 404 for an unknown store', async () => {
      prisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.getDetail(VENDOR_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns the owner, counts and decision history', async () => {
      prisma.vendor.findUnique.mockResolvedValue(detailRow('ACTIVE'));

      const result = await service.getDetail(VENDOR_ID);

      expect(result.owner.email).toBe('chu@example.com');
      expect(result.offerCount).toBe(3);
      expect(result.orderCount).toBe(7);
      expect(result.decisions).toEqual([]);
    });
  });
});

describe('AdminVendorController access control', () => {
  it('restricts every admin vendor route to the ADMIN role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminVendorController)).toEqual(['ADMIN']);
  });

  it('uses the shared JWT and roles guards', () => {
    const guards = Reflect.getMetadata('__guards__', AdminVendorController) as Array<{ name: string }>;
    expect(guards.map((guard) => guard.name)).toEqual(['JwtAuthGuard', 'RolesGuard']);
  });
});
