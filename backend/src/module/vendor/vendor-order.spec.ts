import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import type { VendorOrderStatus } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  createFakeOrderDb,
  fakeItem,
  fakeOrder,
  fakeVendorOrder,
  type FakeState,
} from '../../../test/fake-order-db.js';
import {
  OrderLifecycleService,
  ORDER_CHANGED_MEANWHILE,
  VENDOR_ORDER_NOT_FOUND,
} from '../order/order-lifecycle.service.js';
import {
  VENDOR_ORDER_STATUS_LABELS,
  VENDOR_ORDER_STATUSES,
} from '../order/order-status.js';
import { ReviewService } from '../review/review.service.js';
import { UpdateVendorOrderStatusDto, VendorOrderQueryDto } from './dto/vendor-order.dto.js';
import { VENDOR_READ_ONLY } from './vendor-access.js';
import { VendorController } from './vendor.controller.js';
import { VendorModule } from './vendor.module.js';
import { VendorOrderController } from './vendor-order.controller.js';
import { INVALID_DATE_RANGE, VendorOrderService } from './vendor-order.service.js';

const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const VO_A = '11111111-1111-4111-8111-111111111111';
const VO_B = '22222222-2222-4222-8222-222222222222';

/** Same pipe settings as main.ts. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
async function rejections(
  metatype: ArgumentMetadata['metatype'],
  value: Record<string, unknown>,
  type: ArgumentMetadata['type'] = 'body',
): Promise<string[]> {
  try {
    await pipe.transform(value, { type, metatype, data: '' });
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse()['message'] as string[];
  }
}

/** The only moves a vendor order may make, written out by hand. */
const VALID = new Set([
  'PENDING>ACCEPTED',
  'PENDING>CANCELLED',
  'ACCEPTED>PREPARING',
  'ACCEPTED>CANCELLED',
  'PREPARING>SHIPPING',
  'SHIPPING>COMPLETED',
]);
const ALL_PAIRS = VENDOR_ORDER_STATUSES.flatMap((from) =>
  VENDOR_ORDER_STATUSES.map((to) => [from, to] as const),
);

/**
 * One customer order with two vendors: A sells 1.5 kg + 2 kg, B sells another
 * item. Payment is for the whole order.
 */
function baseState(overrides: { method?: any; payment?: any; a?: VendorOrderStatus; b?: VendorOrderStatus | null } = {}): FakeState {
  const vendorOrders = [fakeVendorOrder({ id: VO_A, vendorId: 'vendor-a', status: overrides.a ?? 'PENDING', grandTotal: '1470000' })];
  const items = [
    fakeItem({ id: 'item-a1', vendorOrderId: VO_A, offerId: 'offer-a1', quantity: '1.5', productNameSnapshot: 'Tôm sú biển' }),
    fakeItem({ id: 'item-a2', vendorOrderId: VO_A, offerId: 'offer-a2', quantity: '2', productNameSnapshot: 'Cua gạch' }),
  ];
  if (overrides.b !== null && overrides.b !== undefined) {
    vendorOrders.push(fakeVendorOrder({ id: VO_B, vendorId: 'vendor-b', status: overrides.b, grandTotal: '999000' }));
    items.push(fakeItem({ id: 'item-b1', vendorOrderId: VO_B, offerId: 'offer-b1', quantity: '3', productNameSnapshot: 'Ghẹ xanh của vựa B' }));
  }
  return {
    vendors: [
      { id: 'vendor-a', ownerId: OWNER_A, status: 'ACTIVE', name: 'Vựa A', slug: 'vua-a' },
      { id: 'vendor-b', ownerId: OWNER_B, status: 'ACTIVE', name: 'Vựa B', slug: 'vua-b' },
    ],
    orders: [fakeOrder({ id: 'order-1', userId: 'user-1', grandTotal: '2469000' })],
    payments: [{ orderId: 'order-1', method: overrides.method ?? 'CARD', status: overrides.payment ?? 'PAID', paidAt: null }],
    vendorOrders,
    items,
    stock: { 'offer-a1': '10', 'offer-a2': '0.5', 'offer-b1': '7' },
    shipments: [],
  };
}

describe('Vendor orders', () => {
  let fake: ReturnType<typeof createFakeOrderDb>;
  let service: VendorOrderService;

  function setup(state: FakeState) {
    fake = createFakeOrderDb(state);
    const prisma = fake.prisma as unknown as PrismaService;
    service = new VendorOrderService(prisma, new OrderLifecycleService(prisma));
  }
  const move = (to: any, owner = OWNER_A, id = VO_A, note?: string) =>
    service.changeStatus(owner, id, { status: to, ...(note !== undefined && { note }) });
  const statusOf = (id: string) => fake.state.vendorOrders.find((vo) => vo.id === id)!.status;

  beforeEach(() => setup(baseState()));

  describe('routes', () => {
    const handlers = Object.getOwnPropertyNames(VendorOrderController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => [name, (VendorOrderController.prototype as any)[name]] as const);

    it.each(handlers)('%s is VENDOR-only', async (_name, handler) => {
      const reflector = new Reflector();
      expect(reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, VendorOrderController])).toEqual(['VENDOR']);
      const findUnique = vi.fn();
      const guard = new RolesGuard(reflector, { user: { findUnique } } as unknown as PrismaService);
      const asRole = (role: string) => {
        findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
        return guard.canActivate({
          getHandler: () => handler,
          getClass: () => VendorOrderController,
          switchToHttp: () => ({ getRequest: () => ({ user: { sub: OWNER_A, role } }) }),
        } as unknown as ExecutionContext);
      };
      await expect(asRole('VENDOR')).resolves.toBe(true);
      await expect(asRole('CUSTOMER')).rejects.toThrow(ForbiddenException);
      await expect(asRole('ADMIN')).rejects.toThrow(ForbiddenException);
    });

    it('registers /vendors/me/orders before /vendors/:slug', () => {
      const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, VendorModule) as unknown[];
      expect(controllers.indexOf(VendorOrderController)).toBeLessThan(controllers.indexOf(VendorController));
    });
  });

  describe('status body', () => {
    it.each(['ACCEPTED', 'PREPARING', 'SHIPPING', 'COMPLETED', 'CANCELLED'])('accepts %s', async (status) => {
      expect(await rejections(UpdateVendorOrderStatusDto, { status, note: 'ok' })).toEqual([]);
    });

    it('refuses PENDING and unknown statuses', async () => {
      expect(await rejections(UpdateVendorOrderStatusDto, { status: 'PENDING' })).toHaveLength(1);
      expect(await rejections(UpdateVendorOrderStatusDto, { status: 'PAID' })).toHaveLength(1);
      expect(await rejections(UpdateVendorOrderStatusDto, {})).toHaveLength(1);
    });

    it('refuses paymentStatus and any other unknown field (400)', async () => {
      expect(await rejections(UpdateVendorOrderStatusDto, { status: 'ACCEPTED', paymentStatus: 'PAID' })).toEqual([
        'property paymentStatus should not exist',
      ]);
      expect(await rejections(UpdateVendorOrderStatusDto, { status: 'ACCEPTED', vendorId: 'vendor-b' })).toEqual([
        'property vendorId should not exist',
      ]);
    });

    it('limits the note to 500 characters', async () => {
      expect(await rejections(UpdateVendorOrderStatusDto, { status: 'CANCELLED', note: 'x'.repeat(501) })).toEqual([
        'Ghi chú tối đa 500 ký tự.',
      ]);
    });

    it('checks the list query', async () => {
      expect(await rejections(VendorOrderQueryDto, { status: 'PAID' }, 'query')).toHaveLength(1);
      expect(await rejections(VendorOrderQueryDto, { from: '18/11/2026' }, 'query')).toHaveLength(1);
      expect(await rejections(VendorOrderQueryDto, { status: 'SHIPPING', from: '2026-11-01', page: '2' }, 'query')).toEqual([]);
    });
  });

  describe('transitions (every 6×6 pair)', () => {
    it.each(ALL_PAIRS)('%s → %s', async (from, to) => {
      setup(baseState({ a: from }));
      if (VALID.has(`${from}>${to}`)) {
        await expect(move(to)).resolves.toMatchObject({ status: to });
        expect(statusOf(VO_A)).toBe(to);
      } else {
        const error = await move(to).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as Error).message).toContain(VENDOR_ORDER_STATUS_LABELS[from]);
        expect(statusOf(VO_A)).toBe(from);
      }
    });
  });

  describe('accepting', () => {
    it.each([
      ['CARD', 'PAID'],
      ['BANK_TRANSFER', 'PAID'],
      ['COD', 'PAID'],
      ['COD', 'PENDING'],
    ])('%s payment %s can be accepted', async (method, payment) => {
      setup(baseState({ method, payment }));
      await expect(move('ACCEPTED')).resolves.toMatchObject({ status: 'ACCEPTED' });
    });

    it.each([
      ['BANK_TRANSFER', 'PENDING'],
      ['E_WALLET', 'PENDING'],
      ['CARD', 'FAILED'],
      ['CARD', 'REFUNDED'],
    ])('%s payment %s is 409 and stays PENDING', async (method, payment) => {
      setup(baseState({ method, payment }));
      await expect(move('ACCEPTED')).rejects.toThrow(ConflictException);
      expect(statusOf(VO_A)).toBe('PENDING');
    });

    it('shows why instead of offering "accept" on an unpaid order', async () => {
      setup(baseState({ method: 'BANK_TRANSFER', payment: 'PENDING' }));
      const detail = await service.getOrder(OWNER_A, VO_A);
      expect(detail.allowedActions).toEqual(['CANCELLED']);
      expect(detail.acceptBlockedReason).toContain('chưa thanh toán');
    });
  });

  describe('ownership', () => {
    beforeEach(() => setup(baseState({ b: 'PENDING' })));

    it("is 404 for another vendor's order, read or write", async () => {
      await expect(service.getOrder(OWNER_B, VO_A)).rejects.toThrow(new NotFoundException(VENDOR_ORDER_NOT_FOUND));
      await expect(move('ACCEPTED', OWNER_B, VO_A)).rejects.toThrow(new NotFoundException(VENDOR_ORDER_NOT_FOUND));
      await expect(move('CANCELLED', OWNER_B, VO_A)).rejects.toThrow(NotFoundException);
      expect(statusOf(VO_A)).toBe('PENDING');
      expect(fake.state.stock['offer-a1']).toBe('10');
    });

    it("never shows the other vendors' part or the whole order's total", async () => {
      const detail = await service.getOrder(OWNER_A, VO_A);
      const text = JSON.stringify(detail);
      expect(detail.items.map((item) => item.id).sort()).toEqual(['item-a1', 'item-a2']);
      expect(text).not.toContain(VO_B);
      expect(text).not.toContain('Ghẹ xanh của vựa B');
      expect(text).not.toContain('2469000');
      expect(detail.grandTotal).toBe('1470000.00');
    });

    it('lists only its own orders, found from the token owner', async () => {
      const list = await service.listOrders(OWNER_A, {});
      expect(list.items.map((item) => item.id)).toEqual([VO_A]);
      expect(fake.prisma.vendor.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: OWNER_A } }));
    });

    it('is 404 for an account without a store', async () => {
      await expect(service.listOrders('nobody', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('read-only stores', () => {
    it.each(['SUSPENDED', 'REJECTED'] as const)('%s: 403 on every status change, nothing written', async (status) => {
      fake.state.vendors[0]!.status = status;
      for (const to of ['ACCEPTED', 'CANCELLED']) {
        await expect(move(to)).rejects.toThrow(new ForbiddenException(VENDOR_READ_ONLY));
      }
      expect(fake.prisma.$transaction).not.toHaveBeenCalled();
      expect(statusOf(VO_A)).toBe('PENDING');
    });

    it('can still read its orders, with no actions offered', async () => {
      fake.state.vendors[0]!.status = 'SUSPENDED';
      const detail = await service.getOrder(OWNER_A, VO_A);
      expect(detail.allowedActions).toEqual([]);
      await expect(service.listOrders(OWNER_A, {})).resolves.toBeDefined();
    });
  });

  describe('cancelling', () => {
    it('restocks every line by its exact quantity, inside one transaction', async () => {
      await move('CANCELLED', OWNER_A, VO_A, 'Hết hàng tươi');
      expect(fake.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(fake.state.stock).toEqual({ 'offer-a1': '11.5', 'offer-a2': '2.5', 'offer-b1': '7' });
      expect(fake.state.vendorOrders[0]!.vendorNote).toBe('Hết hàng tươi');
      expect(fake.tx.$queryRaw).toHaveBeenCalled(); // the parent order row is locked first
    });

    it('restocks once: a second cancel is 409 and changes nothing', async () => {
      await move('CANCELLED');
      await expect(move('CANCELLED')).rejects.toThrow(ConflictException);
      expect(fake.state.stock['offer-a1']).toBe('11.5');
    });

    it('is 409 without restocking when the status changed between the check and the update', async () => {
      fake.tx.vendorOrder.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(move('CANCELLED')).rejects.toThrow(new ConflictException(ORDER_CHANGED_MEANWHILE));
      expect(fake.tx.vendorOffer.update).not.toHaveBeenCalled();
      expect(fake.state.stock['offer-a1']).toBe('10');
    });

    it('rolls everything back when a later write fails', async () => {
      fake.tx.vendorOffer.update.mockImplementationOnce(async ({ where, data }: any) => {
        fake.state.stock[where.id] = 'changed';
        void data;
        throw new Error('db down');
      });
      await expect(move('CANCELLED')).rejects.toThrow('db down');
      expect(statusOf(VO_A)).toBe('PENDING');
      expect(fake.state.stock['offer-a1']).toBe('10');
    });

    it('refunds a paid order (simulated) when its only vendor cancels', async () => {
      await move('CANCELLED');
      expect(fake.state.payments[0]!.status).toBe('REFUNDED');
      expect(fake.state.orders[0]!.status).toBe('CANCELLED');
    });

    it('keeps PAID when one vendor of several cancels, refunds when the last one does', async () => {
      setup(baseState({ b: 'ACCEPTED' }));
      await move('CANCELLED');
      expect(fake.state.payments[0]!.status).toBe('PAID');
      expect(fake.state.orders[0]!.status).toBe('CONFIRMED');

      await move('CANCELLED', OWNER_B, VO_B);
      expect(fake.state.payments[0]!.status).toBe('REFUNDED');
      expect(fake.state.orders[0]!.status).toBe('CANCELLED');
      expect(fake.state.stock['offer-b1']).toBe('10');
    });

    it('marks an unpaid order FAILED when it is fully cancelled', async () => {
      setup(baseState({ method: 'COD', payment: 'PENDING' }));
      await move('CANCELLED');
      expect(fake.state.payments[0]!.status).toBe('FAILED');
    });

    it('keeps an existing shipment in step', async () => {
      setup(baseState({ a: 'ACCEPTED' }));
      fake.state.shipments.push({ vendorOrderId: VO_A, status: 'ACCEPTED', carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null });
      await move('CANCELLED');
      expect(fake.state.shipments[0]!.status).toBe('CANCELLED');
    });
  });

  describe('shipment, parent order and cash on delivery', () => {
    it('walks a COD order to COMPLETED: shippedAt, deliveredAt, then PAID', async () => {
      setup(baseState({ method: 'COD', payment: 'PENDING' }));
      for (const to of ['ACCEPTED', 'PREPARING'] as const) {
        await move(to);
        expect(fake.state.payments[0]!.status).toBe('PENDING');
        expect(fake.state.shipments).toEqual([]);
      }
      expect(fake.state.orders[0]!.status).toBe('PROCESSING');

      const shipping = await move('SHIPPING');
      expect(fake.state.payments[0]!.status).toBe('PENDING');
      expect(shipping.shipment).toMatchObject({ status: 'SHIPPING', shippedAt: expect.any(String), deliveredAt: null });
      expect(fake.state.orders[0]!.status).toBe('SHIPPING');

      const done = await move('COMPLETED');
      expect(done.shipment).toMatchObject({ status: 'COMPLETED', shippedAt: expect.any(String), deliveredAt: expect.any(String) });
      expect(done.payment).toMatchObject({ method: 'COD', status: 'PAID', paidAt: expect.any(String) });
      expect(done.allowedActions).toEqual([]);
      expect(fake.state.orders[0]!.status).toBe('COMPLETED');
    });

    it('creates the shipment when it reaches SHIPPING without one', async () => {
      setup(baseState({ a: 'PREPARING' }));
      await move('SHIPPING');
      expect(fake.state.shipments).toHaveLength(1);
      expect(fake.state.shipments[0]!.shippedAt).toBeInstanceOf(Date);
    });

    it('collects COD only when every vendor still running has delivered', async () => {
      setup(baseState({ method: 'COD', payment: 'PENDING', a: 'SHIPPING', b: 'SHIPPING' }));
      await move('COMPLETED');
      expect(fake.state.payments[0]!.status).toBe('PENDING');
      expect(fake.state.orders[0]!.status).toBe('SHIPPING');
      await move('COMPLETED', OWNER_B, VO_B);
      expect(fake.state.payments[0]!.status).toBe('PAID');
      expect(fake.state.orders[0]!.status).toBe('COMPLETED');
    });

    it('never touches the payment of a non-COD order on the way', async () => {
      setup(baseState({ method: 'BANK_TRANSFER', payment: 'PAID', a: 'SHIPPING' }));
      await move('COMPLETED');
      expect(fake.tx.payment.updateMany).not.toHaveBeenCalled();
    });

    it('waits for the slowest vendor before confirming the parent order', async () => {
      setup(baseState({ b: 'PENDING' }));
      await move('ACCEPTED');
      expect(fake.state.orders[0]!.status).toBe('PENDING');
      await move('ACCEPTED', OWNER_B, VO_B);
      expect(fake.state.orders[0]!.status).toBe('CONFIRMED');
    });
  });

  it('a vendor order completed here opens its items for review', async () => {
    setup(baseState({ a: 'SHIPPING' }));
    const prisma = {
      ...fake.prisma,
      user: { findUnique: vi.fn().mockResolvedValue({ fullName: 'Phạm Thu Hà' }) },
      review: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const reviews = new ReviewService(prisma, { isEnabled: () => false } as unknown as CloudinaryService);

    expect((await reviews.getReviewCenter('user-1')).pending).toEqual([]);
    await move('COMPLETED');
    const center = await reviews.getReviewCenter('user-1');
    expect(center.pending.map((item) => item.orderItemId).sort()).toEqual(['item-a1', 'item-a2']);
    expect(center.pending[0]!.deliveredAt).toBe(fake.state.shipments[0]!.deliveredAt!.toISOString());
  });

  describe('listOrders', () => {
    beforeEach(() => {
      const state = baseState();
      state.orders.push(fakeOrder({ id: 'order-2', orderNumber: 'HSE-90002', recipientName: 'Lê Hoàng Nam', recipientPhone: '0901000004' }));
      state.payments.push({ orderId: 'order-2', method: 'COD', status: 'PENDING', paidAt: null });
      state.vendorOrders.push(
        fakeVendorOrder({ id: 'vo-2', orderId: 'order-2', status: 'COMPLETED', createdAt: new Date('2026-11-10T03:00:00.000Z') }),
      );
      state.items.push(fakeItem({ id: 'item-2', vendorOrderId: 'vo-2' }));
      setup(state);
    });

    it('returns rows newest first with the first item and payment', async () => {
      const list = await service.listOrders(OWNER_A, {});
      expect(list.items.map((item) => item.orderNumber)).toEqual(['HSE-90001', 'HSE-90002']);
      expect(list.items[0]).toMatchObject({
        id: VO_A,
        recipientName: 'Phạm Thu Hà',
        itemCount: 2,
        firstItem: { productName: 'Tôm sú biển', quantity: '1.5', unit: 'kg' },
        grandTotal: '1470000.00',
        status: 'PENDING',
        payment: { method: 'CARD', status: 'PAID' },
      });
    });

    it('searches order number, recipient name and phone without accents', async () => {
      const byName = await service.listOrders(OWNER_A, { search: 'le hoang' });
      expect(byName.items.map((item) => item.orderNumber)).toEqual(['HSE-90002']);
      const byNumber = await service.listOrders(OWNER_A, { search: 'hse-90001' });
      expect(byNumber.items.map((item) => item.orderNumber)).toEqual(['HSE-90001']);
      const byPhone = await service.listOrders(OWNER_A, { search: '0901000004' });
      expect(byPhone.pagination.totalItems).toBe(1);
    });

    it('filters by status and by days in Vietnam time, but summarises the whole store', async () => {
      const done = await service.listOrders(OWNER_A, { status: 'COMPLETED' });
      expect(done.items.map((item) => item.id)).toEqual(['vo-2']);
      expect(done.summary).toMatchObject({ total: 2, PENDING: 1, COMPLETED: 1, CANCELLED: 0 });

      // 2026-11-10T03:00Z is 10:00 on the 10th in Vietnam.
      const day = await service.listOrders(OWNER_A, { from: '2026-11-10', to: '2026-11-10' });
      expect(day.items.map((item) => item.id)).toEqual(['vo-2']);
    });

    it('is 400 for an impossible or reversed date range', async () => {
      await expect(service.listOrders(OWNER_A, { from: '2026-02-31' })).rejects.toThrow(new BadRequestException(INVALID_DATE_RANGE));
      await expect(service.listOrders(OWNER_A, { from: '2026-11-20', to: '2026-11-10' })).rejects.toThrow(BadRequestException);
    });

    it('paginates', async () => {
      const page2 = await service.listOrders(OWNER_A, { page: 2, pageSize: 1 });
      expect(page2.items.map((item) => item.id)).toEqual(['vo-2']);
      expect(page2.pagination).toEqual({ page: 2, limit: 1, totalItems: 2, totalPages: 2 });
    });
  });
});
