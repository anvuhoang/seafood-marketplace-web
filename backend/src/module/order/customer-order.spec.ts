import { describe, it, expect, beforeEach } from 'vitest';
import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { VendorOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  createFakeOrderDb,
  fakeItem,
  fakeOrder,
  fakeVendorOrder,
  type FakeState,
} from '../../../test/fake-order-db.js';
import { orderNumberPipe } from './customer-order.controller.js';
import { CustomerOrderService } from './customer-order.service.js';
import { CustomerOrderQueryDto } from './dto/customer-order.dto.js';
import {
  ORDER_ALREADY_CANCELLED,
  ORDER_NOT_FOUND,
  OrderLifecycleService,
} from './order-lifecycle.service.js';

const ME = 'user-1';
const SOMEONE_ELSE = 'user-2';

function state(a: VendorOrderStatus, b: VendorOrderStatus, payment: { method: any; status: any } = { method: 'CARD', status: 'PAID' }): FakeState {
  return {
    vendors: [
      { id: 'vendor-a', ownerId: 'owner-a', status: 'ACTIVE', name: 'Vựa A', slug: 'vua-a' },
      { id: 'vendor-b', ownerId: 'owner-b', status: 'ACTIVE', name: 'Vựa B', slug: 'vua-b' },
    ],
    orders: [
      fakeOrder({ id: 'order-1', orderNumber: 'HSE-90001', userId: ME }),
      fakeOrder({ id: 'order-9', orderNumber: 'HSE-99999', userId: SOMEONE_ELSE }),
    ],
    payments: [
      { orderId: 'order-1', ...payment, paidAt: null },
      { orderId: 'order-9', method: 'COD', status: 'PENDING', paidAt: null },
    ],
    vendorOrders: [
      fakeVendorOrder({ id: 'vo-a', orderId: 'order-1', vendorId: 'vendor-a', status: a }),
      fakeVendorOrder({ id: 'vo-b', orderId: 'order-1', vendorId: 'vendor-b', status: b }),
      fakeVendorOrder({ id: 'vo-x', orderId: 'order-9', vendorId: 'vendor-a', status: 'PENDING' }),
    ],
    items: [
      fakeItem({ id: 'item-a', vendorOrderId: 'vo-a', offerId: 'offer-a', quantity: '1.5', reviewed: true }),
      fakeItem({ id: 'item-b', vendorOrderId: 'vo-b', offerId: 'offer-b', quantity: '2' }),
      fakeItem({ id: 'item-x', vendorOrderId: 'vo-x', offerId: 'offer-a', quantity: '4' }),
    ],
    stock: { 'offer-a': '3', 'offer-b': '0' },
    shipments: [],
  };
}

describe('Customer orders', () => {
  let fake: ReturnType<typeof createFakeOrderDb>;
  let service: CustomerOrderService;

  function setup(initial: FakeState) {
    fake = createFakeOrderDb(initial);
    const prisma = fake.prisma as unknown as PrismaService;
    service = new CustomerOrderService(prisma, new OrderLifecycleService(prisma));
  }

  beforeEach(() => setup(state('PENDING', 'PENDING')));

  it('lists only my orders, each with its vendors, items and cancel flag', async () => {
    const list = await service.listOrders(ME, {});
    expect(list.items.map((order) => order.orderNumber)).toEqual(['HSE-90001']);
    expect(fake.prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: ME } }));
    const [order] = list.items;
    expect(order).toMatchObject({
      status: 'PENDING',
      canCancel: true,
      payment: { method: 'CARD', status: 'PAID' },
    });
    expect(order!.vendorOrders.map((vo) => [vo.vendor.name, vo.status])).toEqual([
      ['Vựa A', 'PENDING'],
      ['Vựa B', 'PENDING'],
    ]);
    expect(order!.vendorOrders[0]!.items[0]).toMatchObject({ id: 'item-a', quantity: '1.5', reviewed: true });
  });

  it('filters by the order status', async () => {
    await service.listOrders(ME, { status: 'SHIPPING' });
    expect(fake.prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME, status: 'SHIPPING' } }),
    );
  });

  it("is 404 for someone else's order, read or cancel", async () => {
    await expect(service.getOrder(ME, 'HSE-99999')).rejects.toThrow(new NotFoundException(ORDER_NOT_FOUND));
    await expect(service.cancelOrder(ME, 'HSE-99999')).rejects.toThrow(NotFoundException);
    expect(fake.state.vendorOrders.find((vo) => vo.id === 'vo-x')!.status).toBe('PENDING');
    expect(fake.state.stock['offer-a']).toBe('3');
  });

  it('answers a malformed order number like an unknown one', () => {
    expect(() => orderNumberPipe.transform('../../etc', { type: 'param' } as ArgumentMetadata)).toThrow(NotFoundException);
    expect(orderNumberPipe.transform('HSE-90001', { type: 'param' } as ArgumentMetadata)).toBe('HSE-90001');
  });

  it('cancels the whole order while every vendor is PENDING: restock, refund, parent status', async () => {
    const detail = await service.cancelOrder(ME, 'HSE-90001');
    expect(fake.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(detail.status).toBe('CANCELLED');
    expect(detail.canCancel).toBe(false);
    expect(detail.vendorOrders.map((vo) => vo.status)).toEqual(['CANCELLED', 'CANCELLED']);
    expect(detail.payment?.status).toBe('REFUNDED');
    expect(fake.state.stock).toEqual({ 'offer-a': '4.5', 'offer-b': '2' });
    // Another customer's order on the same offer is untouched.
    expect(fake.state.vendorOrders.find((vo) => vo.id === 'vo-x')!.status).toBe('PENDING');
  });

  it('skips a part a vendor already cancelled', async () => {
    setup(state('CANCELLED', 'PENDING', { method: 'COD', status: 'PENDING' }));
    const detail = await service.cancelOrder(ME, 'HSE-90001');
    expect(detail.status).toBe('CANCELLED');
    expect(detail.payment?.status).toBe('FAILED');
    expect(fake.state.stock).toEqual({ 'offer-a': '3', 'offer-b': '2' });
  });

  it.each(['ACCEPTED', 'PREPARING', 'SHIPPING', 'COMPLETED'] as const)(
    'is 409 when a vendor is already %s, and nothing changes',
    async (started) => {
      setup(state('PENDING', started));
      const error = await service.cancelOrder(ME, 'HSE-90001').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as Error).message).toContain('Vựa B');
      expect(fake.state.vendorOrders.map((vo) => vo.status)).toEqual(['PENDING', started, 'PENDING']);
      expect(fake.state.stock).toEqual({ 'offer-a': '3', 'offer-b': '0' });
      expect((await service.getOrder(ME, 'HSE-90001')).canCancel).toBe(false);
    },
  );

  it('restocks once: cancelling twice is 409 the second time', async () => {
    await service.cancelOrder(ME, 'HSE-90001');
    await expect(service.cancelOrder(ME, 'HSE-90001')).rejects.toThrow(new ConflictException(ORDER_ALREADY_CANCELLED));
    expect(fake.state.stock).toEqual({ 'offer-a': '4.5', 'offer-b': '2' });
  });

  it('shows the latest status after a vendor moves its part', async () => {
    setup(state('ACCEPTED', 'SHIPPING'));
    const detail = await service.getOrder(ME, 'HSE-90001');
    expect(detail.vendorOrders.map((vo) => vo.status)).toEqual(['ACCEPTED', 'SHIPPING']);
    expect(detail.recipient).toMatchObject({ name: 'Phạm Thu Hà', district: 'Quận 1' });
  });

  it('checks the list query', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const meta: ArgumentMetadata = { type: 'query', metatype: CustomerOrderQueryDto, data: '' };
    await expect(pipe.transform({ status: 'ACCEPTED' }, meta)).rejects.toThrow(BadRequestException);
    await expect(pipe.transform({ status: 'CONFIRMED', page: '2' }, meta)).resolves.toMatchObject({ page: 2 });
  });
});
