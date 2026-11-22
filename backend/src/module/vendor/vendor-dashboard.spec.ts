import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VendorOrderStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { VendorController } from './vendor.controller.js';
import {
  DASHBOARD_LOW_STOCK_LIMIT,
  DASHBOARD_ORDER_LIMIT,
  VendorService,
} from './vendor.service.js';
import { LOW_STOCK_THRESHOLD } from './offers/vendor-offer.service.js';

const decimal = (value: string) => ({
  toString: () => value,
  toFixed: (places: number) => Number(value).toFixed(places),
});

function roleContext(role: string): ExecutionContext {
  return {
    getHandler: () => VendorController.prototype.getDashboard,
    getClass: () => VendorController,
    switchToHttp: () => ({ getRequest: () => ({ user: { sub: 'user-a', role } }) }),
  } as unknown as ExecutionContext;
}

describe('Vendor dashboard', () => {
  let service: VendorService;
  let prisma: {
    vendor: { findUnique: ReturnType<typeof vi.fn> };
    vendorOffer: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    vendorOrder: {
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      vendor: { findUnique: vi.fn() },
      vendorOffer: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      vendorOrder: {
        count: vi.fn().mockResolvedValue(0),
        aggregate: vi.fn().mockResolvedValue({ _sum: { subtotal: null } }),
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new VendorService(prisma as unknown as PrismaService, {} as CloudinaryService);
  });

  it('resolves and returns only the authenticated Vendor dashboard', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });

    await service.getDashboard('user-a');

    expect(prisma.vendor.findUnique).toHaveBeenCalledWith({
      where: { ownerId: 'user-a' },
      select: { id: true, name: true, slug: true },
    });
    expect(prisma.vendorOffer.count).toHaveBeenCalledWith({
      where: { vendorId: 'vendor-a', status: 'ACTIVE' },
    });
    expect(prisma.vendorOrder.count).toHaveBeenCalledWith({
      where: { vendorId: 'vendor-a' },
    });
    expect(prisma.vendorOrder.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vendorId: 'vendor-a', status: 'COMPLETED' } }),
    );
    expect(prisma.vendorOrder.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vendorId: 'vendor-a' } }),
    );
    expect(prisma.vendorOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          vendorId: 'vendor-a',
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),
    );
    expect(prisma.vendorOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendorId: 'vendor-a', status: 'ACTIVE', stock: { lte: 5 } },
      }),
    );
  });

  it('rejects a user who has no Vendor record', async () => {
    prisma.vendor.findUnique.mockResolvedValue(null);

    await expect(service.getDashboard('user-without-vendor')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.vendorOrder.count).not.toHaveBeenCalled();
    expect(prisma.vendorOffer.count).not.toHaveBeenCalled();
  });

  it('allows only VENDOR role through the dashboard route guard', async () => {
    const reflector = new Reflector();
    const findUnique = vi.fn();
    const guard = new RolesGuard(reflector, {
      user: { findUnique },
    } as unknown as PrismaService);
    const asRole = (role: string) => {
      findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
      return guard.canActivate(roleContext(role));
    };

    expect(
      reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        VendorController.prototype.getDashboard,
        VendorController,
      ]),
    ).toEqual(['VENDOR']);
    await expect(asRole('VENDOR')).resolves.toBe(true);
    await expect(asRole('CUSTOMER')).rejects.toThrow(ForbiddenException);
    await expect(asRole('ADMIN')).rejects.toThrow(ForbiddenException);
  });

  it('counts active VendorOffers rather than distinct catalog products', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });
    prisma.vendorOffer.count.mockResolvedValue(3);

    const result = await service.getDashboard('user-a');

    expect(result.summary.productCount).toBe(3);
    expect(prisma.vendorOffer.count).toHaveBeenCalledWith({
      where: { vendorId: 'vendor-a', status: 'ACTIVE' },
    });
  });

  it('includes every VendorOrderStatus with zero counts when absent', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });
    prisma.vendorOrder.groupBy.mockResolvedValue([
      { status: VendorOrderStatus.PENDING, _count: { _all: 2 } },
    ]);

    const result = await service.getDashboard('user-a');

    expect(result.ordersByStatus).toEqual([
      { status: VendorOrderStatus.PENDING, count: 2 },
      { status: VendorOrderStatus.ACCEPTED, count: 0 },
      { status: VendorOrderStatus.PREPARING, count: 0 },
      { status: VendorOrderStatus.SHIPPING, count: 0 },
      { status: VendorOrderStatus.COMPLETED, count: 0 },
      { status: VendorOrderStatus.CANCELLED, count: 0 },
    ]);
  });

  it('counts and lists only PENDING and ACCEPTED VendorOrders', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });
    prisma.vendorOrder.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);
    prisma.vendorOrder.findMany.mockResolvedValue([
      {
        id: 'order-pending',
        status: VendorOrderStatus.PENDING,
        subtotal: decimal('120.00'),
        createdAt: new Date('2026-11-07T08:00:00.000Z'),
        order: {
          orderNumber: 'HSX-1',
          recipientName: 'Customer',
          recipientPhone: '0900000000',
          shippingAddress: 'Address',
        },
        items: [],
      },
      {
        id: 'order-accepted',
        status: VendorOrderStatus.ACCEPTED,
        subtotal: decimal('240.00'),
        createdAt: new Date('2026-11-07T09:00:00.000Z'),
        order: {
          orderNumber: 'HSX-2',
          recipientName: 'Customer',
          recipientPhone: '0900000000',
          shippingAddress: 'Address',
        },
        items: [],
      },
    ]);

    const result = await service.getDashboard('user-a');

    expect(result.summary.orderCount).toBe(4);
    expect(result.summary.ordersNeedingActionCount).toBe(2);
    expect(result.ordersNeedingAction.map((order) => order.status)).toEqual([
      VendorOrderStatus.PENDING,
      VendorOrderStatus.ACCEPTED,
    ]);
    expect(prisma.vendorOrder.count).toHaveBeenNthCalledWith(2, {
      where: {
        vendorId: 'vendor-a',
        status: { in: [VendorOrderStatus.PENDING, VendorOrderStatus.ACCEPTED] },
      },
    });
  });

  it('sums only completed VendorOrder.subtotal and excludes shipping values', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });
    prisma.vendorOrder.aggregate.mockResolvedValue({
      _sum: { subtotal: decimal('1234.56') },
    });

    const result = await service.getDashboard('user-a');

    expect(result.summary.revenue).toBe('1234.56');
    expect(prisma.vendorOrder.aggregate).toHaveBeenCalledWith({
      where: { vendorId: 'vendor-a', status: VendorOrderStatus.COMPLETED },
      _sum: { subtotal: true },
    });
  });

  it('includes active offers at the stock boundary of 5 and excludes inactive offers', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-a',
      name: 'Vendor A',
      slug: 'vendor-a',
    });
    prisma.vendorOffer.findMany.mockResolvedValue([
      {
        id: 'offer-at-boundary',
        stock: decimal('5.000'),
        variant: {
          name: 'Size A',
          unit: 'kg',
          product: { name: 'Seafood A' },
        },
      },
      {
        id: 'offer-under-boundary',
        stock: decimal('4.500'),
        variant: {
          name: 'Size B',
          unit: 'kg',
          product: { name: 'Seafood B' },
        },
      },
    ]);

    const result = await service.getDashboard('user-a');

    expect(result.lowStockOffers).toEqual([
      {
        id: 'offer-at-boundary',
        productName: 'Seafood A',
        variantName: 'Size A',
        stock: '5.000',
        unit: 'kg',
      },
      {
        id: 'offer-under-boundary',
        productName: 'Seafood B',
        variantName: 'Size B',
        stock: '4.500',
        unit: 'kg',
      },
    ]);
    expect(prisma.vendorOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendorId: 'vendor-a', status: 'ACTIVE', stock: { lte: 5 } },
      }),
    );
  });

  it('lists at most a few orders needing action, most urgent first, but counts them all', async () => {
    prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-a', name: 'Vendor A', slug: 'vendor-a' });
    prisma.vendorOrder.count.mockResolvedValueOnce(40).mockResolvedValueOnce(12);

    const result = await service.getDashboard('user-a');

    expect(result.summary.ordersNeedingActionCount).toBe(12);
    expect(prisma.vendorOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendorId: 'vendor-a', status: { in: ['PENDING', 'ACCEPTED'] } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        take: DASHBOARD_ORDER_LIMIT,
      }),
    );
  });

  it('returns the real low stock count when the low stock list is cut short', async () => {
    prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-a', name: 'Vendor A', slug: 'vendor-a' });
    prisma.vendorOffer.count.mockImplementation(({ where }: { where: { stock?: unknown } }) =>
      Promise.resolve(where.stock ? 11 : 30),
    );
    prisma.vendorOffer.findMany.mockResolvedValue(
      Array.from({ length: DASHBOARD_LOW_STOCK_LIMIT }, (_, index) => ({
        id: `offer-${index}`,
        stock: decimal('1.000'),
        variant: { name: 'Size', unit: 'kg', product: { name: `Seafood ${index}` } },
      })),
    );

    const result = await service.getDashboard('user-a');

    expect(result.summary.productCount).toBe(30);
    expect(result.summary.lowStockCount).toBe(11);
    expect(result.summary.lowStockThreshold).toBe(LOW_STOCK_THRESHOLD);
    expect(result.lowStockOffers).toHaveLength(DASHBOARD_LOW_STOCK_LIMIT);
    expect(prisma.vendorOffer.count).toHaveBeenCalledWith({
      where: { vendorId: 'vendor-a', status: 'ACTIVE', stock: { lte: LOW_STOCK_THRESHOLD } },
    });
    expect(prisma.vendorOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: DASHBOARD_LOW_STOCK_LIMIT }),
    );
  });
});
