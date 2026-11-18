import { vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  VendorOrderStatus,
  VendorStatus,
} from '@prisma/client';

/**
 * A tiny in-memory stand-in for the order tables, enough for the order
 * services. Rows come back as a superset of every select the services use.
 * `$transaction` restores the state when the callback throws, like Postgres.
 * Decimals are kept as strings so the state can be snapshotted.
 */

export interface FakeVendor {
  id: string;
  ownerId: string;
  status: VendorStatus;
  name: string;
  slug: string;
}
export interface FakeOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: string;
  shippingTotal: string;
  grandTotal: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingWard: string | null;
  shippingDistrict: string;
  shippingProvince: string;
  customerNote: string | null;
  createdAt: Date;
}
export interface FakePayment {
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: Date | null;
}
export interface FakeVendorOrder {
  id: string;
  orderId: string;
  vendorId: string;
  status: VendorOrderStatus;
  subtotal: string;
  shippingFee: string;
  grandTotal: string;
  vendorNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface FakeItem {
  id: string;
  vendorOrderId: string;
  offerId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  vendorNameSnapshot: string;
  unitSnapshot: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
  reviewed: boolean;
}
export interface FakeShipment {
  vendorOrderId: string;
  status: VendorOrderStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}
export interface FakeState {
  vendors: FakeVendor[];
  orders: FakeOrder[];
  payments: FakePayment[];
  vendorOrders: FakeVendorOrder[];
  items: FakeItem[];
  /** offer id -> stock */
  stock: Record<string, string>;
  shipments: FakeShipment[];
}

const D = (value: string) => new Prisma.Decimal(value);

export const fakeOrder = (overrides: Partial<FakeOrder> = {}): FakeOrder => ({
  id: 'order-1',
  orderNumber: 'HSE-90001',
  userId: 'user-1',
  status: 'PENDING',
  subtotal: '840000',
  shippingTotal: '0',
  grandTotal: '840000',
  recipientName: 'Phạm Thu Hà',
  recipientPhone: '0901000003',
  shippingAddress: '42 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
  shippingWard: 'Phường Bến Thành',
  shippingDistrict: 'Quận 1',
  shippingProvince: 'TP. Hồ Chí Minh',
  customerNote: null,
  createdAt: new Date('2026-11-17T03:00:00.000Z'),
  ...overrides,
});

export const fakeVendorOrder = (
  overrides: Partial<FakeVendorOrder> = {},
): FakeVendorOrder => ({
  id: 'vo-1',
  orderId: 'order-1',
  vendorId: 'vendor-a',
  status: 'PENDING',
  subtotal: '840000',
  shippingFee: '0',
  grandTotal: '840000',
  vendorNote: null,
  createdAt: new Date('2026-11-17T03:00:00.000Z'),
  updatedAt: new Date('2026-11-17T03:00:00.000Z'),
  ...overrides,
});

export const fakeItem = (overrides: Partial<FakeItem> = {}): FakeItem => ({
  id: 'item-1',
  vendorOrderId: 'vo-1',
  offerId: 'offer-1',
  productNameSnapshot: 'Tôm sú biển',
  variantNameSnapshot: 'Loại 1',
  vendorNameSnapshot: 'Vựa A',
  unitSnapshot: 'kg',
  unitPrice: '420000',
  quantity: '2',
  lineTotal: '840000',
  reviewed: false,
  ...overrides,
});

type Where = Record<string, any>;

export function createFakeOrderDb(initial: FakeState) {
  let state: FakeState = structuredClone(initial);

  const paymentOf = (orderId: string) =>
    state.payments.find((row) => row.orderId === orderId) ?? null;
  const shipmentOf = (vendorOrderId: string) =>
    state.shipments.find((row) => row.vendorOrderId === vendorOrderId) ?? null;
  const vendorOf = (id: string) => state.vendors.find((row) => row.id === id)!;

  const itemView = (item: FakeItem) => ({
    ...item,
    unitPrice: D(item.unitPrice),
    quantity: D(item.quantity),
    lineTotal: D(item.lineTotal),
    review: item.reviewed ? { id: `review-${item.id}` } : null,
    offer: {
      variant: {
        product: {
          id: `product-${item.offerId}`,
          name: item.productNameSnapshot,
          slug: `slug-${item.offerId}`,
          images: [{ imageUrl: `https://img/${item.offerId}.jpg`, isPrimary: true }],
        },
      },
    },
  });

  const orderBase = (order: FakeOrder) => ({
    ...order,
    subtotal: D(order.subtotal),
    shippingTotal: D(order.shippingTotal),
    grandTotal: D(order.grandTotal),
    payment: paymentOf(order.id),
  });

  const vendorOrderView = (vo: FakeVendorOrder) => ({
    ...vo,
    subtotal: D(vo.subtotal),
    shippingFee: D(vo.shippingFee),
    grandTotal: D(vo.grandTotal),
    vendor: { name: vendorOf(vo.vendorId).name, slug: vendorOf(vo.vendorId).slug },
    shipment: shipmentOf(vo.id),
    items: state.items.filter((item) => item.vendorOrderId === vo.id).map(itemView),
    order: orderBase(state.orders.find((order) => order.id === vo.orderId)!),
  });

  const orderView = (order: FakeOrder) => ({
    ...orderBase(order),
    vendorOrders: state.vendorOrders
      .filter((vo) => vo.orderId === order.id)
      .map((vo) => {
        const view = vendorOrderView(vo);
        return { ...view, order: undefined };
      }),
  });

  const matchVendorOrder = (vo: FakeVendorOrder, where: Where = {}) => {
    if (typeof where.id === 'string' && vo.id !== where.id) return false;
    if (where.id?.in && !where.id.in.includes(vo.id)) return false;
    if (where.vendorId !== undefined && vo.vendorId !== where.vendorId) return false;
    if (where.orderId !== undefined && vo.orderId !== where.orderId) return false;
    if (typeof where.status === 'string' && vo.status !== where.status) return false;
    if (where.createdAt?.gte && vo.createdAt < where.createdAt.gte) return false;
    if (where.createdAt?.lt && vo.createdAt >= where.createdAt.lt) return false;
    return true;
  };
  const matchOrder = (order: FakeOrder, where: Where = {}) =>
    (where.id === undefined || order.id === where.id) &&
    (where.orderNumber === undefined || order.orderNumber === where.orderNumber) &&
    (where.userId === undefined || order.userId === where.userId) &&
    (where.status === undefined || order.status === where.status);
  const newestFirst = <T extends { createdAt: Date; id: string }>(rows: T[]) =>
    [...rows].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
    );

  const db = {
    vendor: {
      findUnique: vi.fn(async ({ where }: { where: { ownerId: string } }) => {
        const vendor = state.vendors.find((row) => row.ownerId === where.ownerId);
        return vendor ? { id: vendor.id, status: vendor.status } : null;
      }),
    },
    vendorOrder: {
      findFirst: vi.fn(async ({ where }: { where: Where }) => {
        const vo = state.vendorOrders.find((row) => matchVendorOrder(row, where));
        return vo ? vendorOrderView(vo) : null;
      }),
      findFirstOrThrow: vi.fn(async ({ where }: { where: Where }) => {
        const vo = state.vendorOrders.find((row) => matchVendorOrder(row, where));
        if (!vo) throw new Error('not found');
        return vendorOrderView(vo);
      }),
      findMany: vi.fn(async ({ where, skip, take }: { where: Where; skip?: number; take?: number }) => {
        const rows = newestFirst(state.vendorOrders.filter((row) => matchVendorOrder(row, where)));
        const start = skip ?? 0;
        return rows
          .slice(start, take === undefined ? undefined : start + take)
          .map(vendorOrderView);
      }),
      count: vi.fn(async ({ where }: { where: Where }) =>
        state.vendorOrders.filter((row) => matchVendorOrder(row, where)).length,
      ),
      groupBy: vi.fn(async ({ where }: { where: Where }) => {
        const counts = new Map<VendorOrderStatus, number>();
        for (const row of state.vendorOrders.filter((vo) => matchVendorOrder(vo, where))) {
          counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
        }
        return [...counts].map(([status, count]) => ({ status, _count: { _all: count } }));
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakeVendorOrder> }) => {
        const rows = state.vendorOrders.filter((row) => matchVendorOrder(row, where));
        for (const row of rows) Object.assign(row, data, { updatedAt: new Date() });
        return { count: rows.length };
      }),
    },
    order: {
      findFirst: vi.fn(async ({ where }: { where: Where }) => {
        const order = state.orders.find((row) => matchOrder(row, where));
        return order ? orderView(order) : null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: Where }) => {
        const order = state.orders.find((row) => matchOrder(row, where));
        if (!order) throw new Error('not found');
        return orderView(order);
      }),
      findMany: vi.fn(async ({ where, skip, take }: { where: Where; skip?: number; take?: number }) => {
        const rows = newestFirst(state.orders.filter((row) => matchOrder(row, where)));
        const start = skip ?? 0;
        return rows.slice(start, take === undefined ? undefined : start + take).map(orderView);
      }),
      count: vi.fn(async ({ where }: { where: Where }) =>
        state.orders.filter((row) => matchOrder(row, where)).length,
      ),
      update: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakeOrder> }) => {
        const order = state.orders.find((row) => row.id === where.id)!;
        Object.assign(order, data);
        return order;
      }),
    },
    payment: {
      updateMany: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakePayment> }) => {
        const rows = state.payments.filter(
          (row) => row.orderId === where.orderId && (where.status === undefined || row.status === where.status),
        );
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      }),
    },
    shipment: {
      upsert: vi.fn(async ({ where, create, update }: { where: Where; create: Partial<FakeShipment>; update: Partial<FakeShipment> }) => {
        const existing = shipmentOf(where.vendorOrderId);
        if (existing) return Object.assign(existing, update);
        const row: FakeShipment = {
          vendorOrderId: where.vendorOrderId,
          status: 'PENDING',
          carrier: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null,
          ...create,
        };
        state.shipments.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Where; data: Partial<FakeShipment> }) => {
        const rows = state.shipments.filter((row) => row.vendorOrderId === where.vendorOrderId);
        for (const row of rows) Object.assign(row, data);
        return { count: rows.length };
      }),
    },
    orderItem: {
      findMany: vi.fn(async ({ where }: { where: Where }) => {
        if (where.vendorOrderId) {
          return state.items.filter((item) => item.vendorOrderId === where.vendorOrderId).map(itemView);
        }
        // The review center's query: unreviewed items of the user's orders with a vendor order in some status.
        return state.items
          .filter((item) => {
            const vo = state.vendorOrders.find((row) => row.id === item.vendorOrderId)!;
            const order = state.orders.find((row) => row.id === vo.orderId)!;
            return (
              (where.review?.is !== null || !item.reviewed) &&
              vo.status === where.vendorOrder?.status &&
              order.userId === where.vendorOrder?.order?.userId
            );
          })
          .map((item) => {
            const vo = state.vendorOrders.find((row) => row.id === item.vendorOrderId)!;
            return { ...itemView(item), vendorOrder: vendorOrderView(vo) };
          });
      }),
    },
    vendorOffer: {
      update: vi.fn(async ({ where, data }: { where: Where; data: { stock: { increment: Prisma.Decimal } } }) => {
        const current = D(state.stock[where.id] ?? '0');
        state.stock[where.id] = current.add(data.stock.increment).toString();
        return { id: where.id };
      }),
    },
    $queryRaw: vi.fn(async () => []),
  };

  /** The plain client: reads only, so a write outside the transaction fails loudly. */
  const prisma = {
    vendor: db.vendor,
    vendorOrder: {
      findFirst: db.vendorOrder.findFirst,
      findMany: db.vendorOrder.findMany,
      count: db.vendorOrder.count,
      groupBy: db.vendorOrder.groupBy,
    },
    order: {
      findFirst: db.order.findFirst,
      findMany: db.order.findMany,
      count: db.order.count,
    },
    orderItem: { findMany: db.orderItem.findMany },
    $transaction: vi.fn(async (fn: (tx: typeof db) => Promise<unknown>) => {
      const snapshot = structuredClone(state);
      try {
        return await fn(db);
      } catch (error) {
        state = snapshot;
        throw error;
      }
    }),
  };

  return {
    prisma,
    tx: db,
    get state() {
      return state;
    },
  };
}
