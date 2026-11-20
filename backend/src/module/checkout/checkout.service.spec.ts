import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADDRESS_INVALID,
  CART_EMPTY,
  CheckoutService,
  IDEMPOTENCY_KEY_INVALID,
  IDEMPOTENCY_KEY_REQUIRED,
  NOT_IN_CART,
  PAYMENT_NOT_SUPPORTED,
  SHIPPING_ONE_ONLY,
  SHIPPING_REQUIRED,
} from './checkout.service.js';
import { PlaceOrderDto } from './dto/checkout.dto.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const SHRIMP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CRAB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOAT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const KEY = 'key-0000-0001';

const D = (value: string | number) => new Prisma.Decimal(value);
const ZERO = (value: Prisma.Decimal) => value.toNumber();

interface OfferSeed {
  id: string;
  price?: string;
  stock?: string;
  status?: string;
  vendorId?: string;
  vendorStatus?: string;
  variantActive?: boolean;
  productStatus?: string;
  name?: string;
  unit?: string;
}

const makeOffer = (seed: OfferSeed) => ({
  id: seed.id,
  price: D(seed.price ?? '100000'),
  stock: D(seed.stock ?? '10'),
  status: seed.status ?? 'ACTIVE',
  vendor: {
    id: seed.vendorId ?? 'vendor-1',
    name: seed.vendorId === 'vendor-2' ? 'Vựa Năm Căn' : 'Vựa Phú Quốc',
    slug: 'vua',
    district: 'Phú Quốc',
    province: 'Kiên Giang',
    status: seed.vendorStatus ?? 'ACTIVE',
  },
  variant: {
    name: 'Size 15 - 20',
    unit: seed.unit ?? 'kg',
    sizeLabel: null,
    isActive: seed.variantActive ?? true,
    product: {
      id: `product-${seed.id}`,
      name: seed.name ?? 'Tôm sú',
      slug: 'tom-su',
      status: seed.productStatus ?? 'ACTIVE',
      images: [],
    },
  },
});
type OfferRow = ReturnType<typeof makeOffer>;

const unique = (...columns: string[]) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: columns },
  });

interface StoredOrder {
  id: string;
  userId: string;
  orderNumber: string;
  idempotencyKey: string | null;
  [field: string]: unknown;
  vendorOrders: Array<{ vendorId: string; items: Array<Record<string, unknown>>; [f: string]: unknown }>;
  payment: Record<string, unknown>;
}

/** In-memory tables with the Prisma calls the service makes, and a transaction that undoes its writes on failure. */
class FakeDb {
  offers = new Map<string, OfferRow>();
  cartItems: Array<{ id: string; userId: string; offerId: string; quantity: Prisma.Decimal; createdAt: number }> = [];
  orders: StoredOrder[] = [];
  addresses: Array<Record<string, unknown>> = [];
  /** Offers whose stock update finds nothing to update, as if another buyer took the stock a moment ago. */
  loseRaceFor = new Set<string>();
  /** How many of the next idempotency lookups pretend the order is not there yet. */
  hideLookups = 0;
  /** How many of the next order creations meet an order number that is already taken. */
  collideOrderNumbers = 0;
  lockedCarts: string[] = [];
  private seq = 0;

  vendorOffer = {
    updateMany: ({ where, data }: { where: Record<string, any>; data: { stock: { decrement: Prisma.Decimal } } }) => {
      const offer = this.offers.get(where.id);
      const open =
        offer &&
        !this.loseRaceFor.has(where.id) &&
        offer.status === where.status &&
        offer.vendor.status === where.vendor.status &&
        offer.variant.isActive === where.variant.isActive &&
        offer.variant.product.status === where.variant.product.status &&
        offer.stock.gte(where.stock.gte);
      if (!open) return Promise.resolve({ count: 0 });
      offer.stock = offer.stock.minus(data.stock.decrement);
      return Promise.resolve({ count: 1 });
    },
  };

  cartItem = {
    findMany: ({ where }: { where: { cart: { userId: string }; offerId?: { in: string[] } } }) =>
      Promise.resolve(
        this.cartItems
          .filter((i) => i.userId === where.cart.userId && (!where.offerId || where.offerId.in.includes(i.offerId)))
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((i) => ({ ...i, offer: this.offers.get(i.offerId) })),
      ),
    deleteMany: ({ where }: { where: { id: { in: string[] } } }) => {
      this.cartItems = this.cartItems.filter((i) => !where.id.in.includes(i.id));
      return Promise.resolve({ count: where.id.in.length });
    },
  };

  userAddress = {
    findFirst: ({ where }: { where: { id: string; userId: string } }) =>
      Promise.resolve(this.addresses.find((a) => a.id === where.id && a.userId === where.userId) ?? null),
  };

  order = {
    findUnique: ({ where }: { where: { userId_idempotencyKey: { userId: string; idempotencyKey: string } } }) => {
      if (this.hideLookups > 0) {
        this.hideLookups -= 1;
        return Promise.resolve(null);
      }
      const { userId, idempotencyKey } = where.userId_idempotencyKey;
      const found = this.orders.find((o) => o.userId === userId && o.idempotencyKey === idempotencyKey);
      return Promise.resolve(found ? { orderNumber: found.orderNumber } : null);
    },
    create: ({ data }: { data: Record<string, any> }) => {
      if (this.collideOrderNumbers > 0) {
        this.collideOrderNumbers -= 1;
        throw unique('order_number');
      }
      if (this.orders.some((o) => o.userId === data.userId && o.idempotencyKey === data.idempotencyKey)) {
        throw unique('user_id', 'idempotency_key');
      }
      if (this.orders.some((o) => o.orderNumber === data.orderNumber)) throw unique('order_number');
      const { vendorOrders, payment, ...order } = data;
      const row = {
        id: `order-${(this.seq += 1)}`,
        ...order,
        vendorOrders: vendorOrders.create.map((vo: any) => ({ ...vo, items: vo.items.create })),
        payment: payment.create,
      } as StoredOrder;
      this.orders.push(row);
      return Promise.resolve({ orderNumber: row.orderNumber });
    },
  };

  $queryRaw = (_strings: TemplateStringsArray, userId: string) => {
    this.lockedCarts.push(userId);
    return Promise.resolve([]);
  };

  async $transaction<T>(fn: (tx: FakeDb) => Promise<T>): Promise<T> {
    const before = {
      stock: new Map([...this.offers].map(([id, offer]) => [id, offer.stock])),
      items: [...this.cartItems],
      orders: [...this.orders],
    };
    try {
      return await fn(this);
    } catch (error) {
      for (const [id, stock] of before.stock) this.offers.get(id)!.stock = stock;
      this.cartItems = before.items;
      this.orders = before.orders;
      throw error;
    }
  }

  addToCart(userId: string, offerId: string, quantity: number | string) {
    this.cartItems.push({ id: `line-${(this.seq += 1)}`, userId, offerId, quantity: D(quantity), createdAt: this.seq });
  }
  stockOf = (offerId: string) => this.offers.get(offerId)!.stock.toNumber();
  /** The offers in a customer's cart, in a fixed order so tests do not depend on insertion order. */
  cartOf = (userId: string) => this.cartItems.filter((i) => i.userId === userId).map((i) => i.offerId).sort();
}

const SHIPPING = {
  recipientName: 'Nguyễn Văn An',
  recipientPhone: '0912345678',
  province: 'TP. Hồ Chí Minh',
  district: 'Quận 7',
  ward: 'Phường Tân Phong',
  streetAddress: 'Số 12 Nguyễn Hữu Thọ',
};
const order = (overrides: Partial<PlaceOrderDto> = {}): PlaceOrderDto =>
  ({ shipping: { ...SHIPPING }, paymentMethod: 'COD', ...overrides }) as PlaceOrderDto;

let db: FakeDb;
let service: CheckoutService;
let getOrder: ReturnType<typeof vi.fn>;

beforeEach(() => {
  db = new FakeDb();
  db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, price: '420000', stock: '10' }));
  db.offers.set(CRAB, makeOffer({ id: CRAB, price: '99999.99', stock: '3', name: 'Cua' }));
  db.offers.set(BOAT, makeOffer({ id: BOAT, price: '300000', stock: '10', vendorId: 'vendor-2', name: 'Ghẹ' }));
  getOrder = vi.fn((_userId: string, orderNumber: string) => Promise.resolve({ orderNumber }));
  const config = { get: () => ({ shippingFeePerVendor: 30000 }) };
  service = new CheckoutService(db as never, config as never, { getOrder } as never);
});

const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error as Error,
  );

describe('preview', () => {
  it('works out vendor totals, shipping per vendor and the grand total', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, BOAT, 1);
    const preview = await service.preview(ALICE, {});

    expect(preview.vendors).toHaveLength(2);
    const byName = Object.fromEntries(preview.vendors.map((v) => [v.vendor.id, v]));
    expect(byName['vendor-1']).toMatchObject({ subtotal: 840000, shippingFee: 30000, total: 870000 });
    expect(byName['vendor-2']).toMatchObject({ subtotal: 300000, shippingFee: 30000, total: 330000 });
    expect(preview).toMatchObject({ subtotal: 1140000, shippingTotal: 60000, grandTotal: 1200000, canCheckout: true, problems: [] });
    expect(preview.supportedPaymentMethods).toEqual(['COD']);
  });

  it('lists lines that cannot be bought and refuses checkout, charging no shipping for a vendor with nothing to ship', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, BOAT, 1);
    db.offers.set(BOAT, makeOffer({ id: BOAT, vendorId: 'vendor-2', name: 'Ghẹ', stock: '0' }));
    const preview = await service.preview(ALICE, {});
    expect(preview.canCheckout).toBe(false);
    expect(preview.problems).toEqual(['Ghẹ: Sản phẩm hiện đã hết hàng.']);
    expect(preview.shippingTotal).toBe(30000);
    expect(preview.grandTotal).toBe(870000);
  });

  it('prices only the listed offers, and refuses one that is not in the cart', async () => {
    db.addToCart(ALICE, SHRIMP, 1);
    db.addToCart(ALICE, BOAT, 1);
    expect((await service.preview(ALICE, { items: [SHRIMP] })).subtotal).toBe(420000);
    const error = await rejection(service.preview(ALICE, { items: [SHRIMP, CRAB] }));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toBe(NOT_IN_CART);
  });

  it('says so for an empty cart, and never shows another customer\'s lines', async () => {
    db.addToCart(BOB, SHRIMP, 1);
    const preview = await service.preview(ALICE, {});
    expect(preview).toMatchObject({ lineCount: 0, canCheckout: false, problems: [CART_EMPTY] });
  });
});

describe('placeOrder: what is created', () => {
  it('creates one order with a vendor order per vendor, its items, and a PENDING payment', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, CRAB, 1);
    db.addToCart(ALICE, BOAT, 1.5);

    const result = await service.placeOrder(ALICE, KEY, order({ customerNote: 'Giao giờ hành chính' }));

    expect(db.orders).toHaveLength(1);
    const created = db.orders[0];
    expect(created.orderNumber).toMatch(/^HSE-\d{8}$/);
    expect(result).toEqual({ order: { orderNumber: created.orderNumber }, alreadyPlaced: false });
    expect(created).toMatchObject({
      userId: ALICE,
      status: 'PENDING',
      addressId: null,
      recipientName: 'Nguyễn Văn An',
      recipientPhone: '0912345678',
      shippingProvince: 'TP. Hồ Chí Minh',
      shippingDistrict: 'Quận 7',
      shippingWard: 'Phường Tân Phong',
      shippingAddress: 'Số 12 Nguyễn Hữu Thọ',
      customerNote: 'Giao giờ hành chính',
      idempotencyKey: KEY,
    });

    // 840000 + 99999.99 | 450000, plus 30000 shipping for each of the two vendors.
    expect(created.vendorOrders).toHaveLength(2);
    const [one, two] = created.vendorOrders as any[];
    expect([one, two].map((v) => v.vendorId).sort()).toEqual(['vendor-1', 'vendor-2']);
    const vendor1 = created.vendorOrders.find((v) => v.vendorId === 'vendor-1') as any;
    const vendor2 = created.vendorOrders.find((v) => v.vendorId === 'vendor-2') as any;
    expect([ZERO(vendor1.subtotal), ZERO(vendor1.shippingFee), ZERO(vendor1.grandTotal)]).toEqual([939999.99, 30000, 969999.99]);
    expect([ZERO(vendor2.subtotal), ZERO(vendor2.shippingFee), ZERO(vendor2.grandTotal)]).toEqual([450000, 30000, 480000]);
    expect([ZERO(created.subtotal as Prisma.Decimal), ZERO(created.shippingTotal as Prisma.Decimal), ZERO(created.grandTotal as Prisma.Decimal)]).toEqual([1389999.99, 60000, 1449999.99]);
    expect(vendor1.status).toBe('PENDING');

    // The order, the vendor orders and the items add up to the same amounts.
    const vendorSum = created.vendorOrders.reduce((sum, v: any) => sum.plus(v.grandTotal), D(0));
    expect(vendorSum.toNumber()).toBe(ZERO(created.grandTotal as Prisma.Decimal));
    const itemSum = created.vendorOrders.flatMap((v) => v.items).reduce((sum, i: any) => sum.plus(i.lineTotal), D(0));
    expect(itemSum.toNumber()).toBe(ZERO(created.subtotal as Prisma.Decimal));

    expect(created.payment).toMatchObject({ method: 'COD', status: 'PENDING' });
    expect(ZERO(created.payment.amount as Prisma.Decimal)).toBe(1449999.99);
  });

  it('stores the names and prices as they are at purchase', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    await service.placeOrder(ALICE, KEY, order());
    // The vendor changes the price and the name afterwards.
    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, price: '999999', stock: '8', name: 'Tên mới' }));
    const item = db.orders[0].vendorOrders[0].items[0] as any;
    expect(item).toMatchObject({
      offerId: SHRIMP,
      productNameSnapshot: 'Tôm sú',
      variantNameSnapshot: 'Size 15 - 20',
      vendorNameSnapshot: 'Vựa Phú Quốc',
      unitSnapshot: 'kg',
    });
    expect([ZERO(item.unitPrice), ZERO(item.quantity), ZERO(item.lineTotal)]).toEqual([420000, 2, 840000]);
  });

  it('works out money with exact decimals', async () => {
    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, price: '33333.33', stock: '10' }));
    db.addToCart(ALICE, SHRIMP, 1.333);
    await service.placeOrder(ALICE, KEY, order());
    const created = db.orders[0];
    // 33333.33 x 1.333 = 44433.32889 -> 44433.33, plus 30000
    expect(ZERO((created.vendorOrders[0].items[0] as any).lineTotal)).toBe(44433.33);
    expect(ZERO(created.grandTotal as Prisma.Decimal)).toBe(74433.33);
  });

  it('takes the stock, and removes exactly the bought lines from the cart', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, CRAB, 1);
    db.addToCart(ALICE, BOAT, 4);
    db.addToCart(BOB, SHRIMP, 1);

    await service.placeOrder(ALICE, KEY, order({ items: [SHRIMP, BOAT] }));

    expect(db.stockOf(SHRIMP)).toBe(8);
    expect(db.stockOf(BOAT)).toBe(6);
    expect(db.stockOf(CRAB)).toBe(3); // not bought
    expect(db.cartOf(ALICE)).toEqual([CRAB]);
    expect(db.cartOf(BOB)).toEqual([SHRIMP]); // another customer's cart is never touched
  });

  it('can take the last of the stock', async () => {
    db.addToCart(ALICE, CRAB, 3);
    await service.placeOrder(ALICE, KEY, order());
    expect(db.stockOf(CRAB)).toBe(0);
  });

  it('locks the customer\'s cart so two checkouts take turns', async () => {
    db.addToCart(ALICE, SHRIMP, 1);
    await service.placeOrder(ALICE, KEY, order());
    expect(db.lockedCarts).toEqual([ALICE]);
  });

  it('uses a saved address of the customer', async () => {
    db.addresses.push({
      id: '33333333-3333-4333-8333-333333333333',
      userId: ALICE,
      recipientName: 'Trần Thị B',
      recipientPhone: '0987654321',
      province: 'Hà Nội',
      district: 'Cầu Giấy',
      ward: null,
      streetAddress: '1 Duy Tân',
      note: 'gọi trước 15 phút',
    });
    db.addToCart(ALICE, SHRIMP, 1);
    await service.placeOrder(ALICE, KEY, { addressId: '33333333-3333-4333-8333-333333333333', paymentMethod: 'COD' } as PlaceOrderDto);
    expect(db.orders[0]).toMatchObject({
      addressId: '33333333-3333-4333-8333-333333333333',
      recipientName: 'Trần Thị B',
      shippingProvince: 'Hà Nội',
      shippingWard: null,
      customerNote: 'gọi trước 15 phút',
    });
  });
});

describe('placeOrder: all or nothing', () => {
  const untouched = (expectedStock: Record<string, number>, cart: string[]) => {
    expect(db.orders).toHaveLength(0);
    for (const [offerId, stock] of Object.entries(expectedStock)) expect(db.stockOf(offerId)).toBe(stock);
    expect(db.cartOf(ALICE)).toEqual([...cart].sort());
  };

  it('fails the whole order when one line is out of stock, naming it, and changes nothing', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, CRAB, 5); // only 3 left
    const error = await rejection(service.placeOrder(ALICE, KEY, order()));

    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toContain('Cua: Chỉ còn 3 kg');
    expect((error as ConflictException).getResponse()).toMatchObject({ problems: [expect.stringContaining('Cua')] });
    untouched({ [SHRIMP]: 10, [CRAB]: 3 }, [CRAB, SHRIMP]);
  });

  it.each([
    ['sold out', { stock: '0' }, 'hết hàng'],
    ['paused', { status: 'PAUSED' }, 'không khả dụng'],
    ['a withdrawn variant', { variantActive: false }, 'không khả dụng'],
    ['an unpublished product', { productStatus: 'DRAFT' }, 'không khả dụng'],
    ['a suspended store', { vendorStatus: 'SUSPENDED' }, 'tạm ngưng'],
  ])('refuses a line that is %s and reports every problem at once', async (_label, overrides, text) => {
    db.offers.set(BOAT, makeOffer({ id: BOAT, vendorId: 'vendor-2', name: 'Ghẹ', ...overrides }));
    db.addToCart(ALICE, SHRIMP, 1);
    db.addToCart(ALICE, BOAT, 1);
    db.offers.set(CRAB, makeOffer({ id: CRAB, name: 'Cua', stock: '0' }));
    db.addToCart(ALICE, CRAB, 1);

    const error = await rejection(service.placeOrder(ALICE, KEY, order()));
    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toContain('Ghẹ:');
    expect(error?.message).toContain(text);
    expect(error?.message).toContain('Cua:'); // both problems in one answer
    untouched({ [SHRIMP]: 10 }, [CRAB, BOAT, SHRIMP]);
  });

  it('gives the stock back when another buyer wins the race for a later line', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.addToCart(ALICE, BOAT, 2);
    db.loseRaceFor.add(BOAT); // the update finds the stock gone, after SHRIMP was already taken
    const error = await rejection(service.placeOrder(ALICE, KEY, order()));
    expect(error).toBeInstanceOf(ConflictException);
    // SHRIMP sorts first, so it was taken and must be put back: no partial order, no lost stock.
    untouched({ [SHRIMP]: 10, [BOAT]: 10 }, [BOAT, SHRIMP]);
  });

  it('refuses an empty cart and a line that is not in the cart', async () => {
    expect((await rejection(service.placeOrder(ALICE, KEY, order())))?.message).toBe(CART_EMPTY);
    db.addToCart(ALICE, SHRIMP, 1);
    expect((await rejection(service.placeOrder(ALICE, KEY, order({ items: [CRAB] }))))?.message).toBe(NOT_IN_CART);
    untouched({ [SHRIMP]: 10 }, [SHRIMP]);
  });

  it("cannot buy another customer's cart", async () => {
    db.addToCart(BOB, SHRIMP, 1);
    expect((await rejection(service.placeOrder(ALICE, KEY, order())))?.message).toBe(CART_EMPTY);
    expect((await rejection(service.placeOrder(ALICE, 'key-0000-0002', order({ items: [SHRIMP] }))))?.message).toBe(NOT_IN_CART);
    expect(db.cartOf(BOB)).toEqual([SHRIMP]);
    expect(db.stockOf(SHRIMP)).toBe(10);
  });
});

describe('placeOrder: no duplicate orders', () => {
  it('returns the first order for the same key, and takes the stock once', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    const first = await service.placeOrder(ALICE, KEY, order());
    const second = await service.placeOrder(ALICE, KEY, order());

    expect(db.orders).toHaveLength(1);
    expect(first.alreadyPlaced).toBe(false);
    expect(second).toEqual({ order: first.order, alreadyPlaced: true });
    expect(db.stockOf(SHRIMP)).toBe(8);
  });

  it('answers a repeat even when the cart changed or is empty by then', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    const first = await service.placeOrder(ALICE, KEY, order());
    db.addToCart(ALICE, CRAB, 1);
    const again = await service.placeOrder(ALICE, KEY, order({ items: [CRAB] }));
    expect(again.order).toEqual(first.order);
    expect(db.orders).toHaveLength(1);
    expect(db.cartOf(ALICE)).toEqual([CRAB]); // the repeat did not touch the new line
  });

  it('a different key is a new order', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    await service.placeOrder(ALICE, KEY, order());
    db.addToCart(ALICE, SHRIMP, 1);
    await service.placeOrder(ALICE, 'key-0000-0002', order());
    expect(db.orders).toHaveLength(2);
    expect(db.stockOf(SHRIMP)).toBe(7);
  });

  it('two customers may use the same key', async () => {
    db.addToCart(ALICE, SHRIMP, 1);
    db.addToCart(BOB, SHRIMP, 1);
    await service.placeOrder(ALICE, KEY, order());
    const bobs = await service.placeOrder(BOB, KEY, order());
    expect(bobs.alreadyPlaced).toBe(false);
    expect(db.orders).toHaveLength(2);
  });

  it('catches a repeat that arrives while the first is still being placed (seen once the cart is locked)', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    const first = await service.placeOrder(ALICE, KEY, order());
    db.hideLookups = 1; // the check before the transaction does not see the order yet
    const second = await service.placeOrder(ALICE, KEY, order());
    expect(second).toEqual({ order: first.order, alreadyPlaced: true });
    expect(db.orders).toHaveLength(1);
    expect(db.stockOf(SHRIMP)).toBe(8);
  });

  it('falls back on the database constraint when two identical requests meet, and puts the stock back', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    const first = await service.placeOrder(ALICE, KEY, order());
    db.addToCart(ALICE, SHRIMP, 2);
    db.hideLookups = 2; // neither check sees it: only the unique key stops the second order
    const second = await service.placeOrder(ALICE, KEY, order());
    expect(second).toEqual({ order: first.order, alreadyPlaced: true });
    expect(db.orders).toHaveLength(1);
    expect(db.stockOf(SHRIMP)).toBe(8); // the second attempt's stock was given back
  });

  it('needs a well-formed key', async () => {
    db.addToCart(ALICE, SHRIMP, 1);
    expect((await rejection(service.placeOrder(ALICE, undefined, order())))?.message).toBe(IDEMPOTENCY_KEY_REQUIRED);
    for (const bad of ['', 'short', 'has spaces in it', 'x'.repeat(101), 'bad/key/with/slash']) {
      expect((await rejection(service.placeOrder(ALICE, bad, order())))?.message).toBe(
        bad === '' ? IDEMPOTENCY_KEY_REQUIRED : IDEMPOTENCY_KEY_INVALID,
      );
    }
    expect(db.orders).toHaveLength(0);
    expect(db.stockOf(SHRIMP)).toBe(10);
  });

  it('tries a new order number when one is already taken, without losing the stock', async () => {
    db.addToCart(ALICE, SHRIMP, 2);
    db.collideOrderNumbers = 1;
    await service.placeOrder(ALICE, KEY, order());
    expect(db.orders).toHaveLength(1);
    expect(db.stockOf(SHRIMP)).toBe(8);
  });
});

describe('placeOrder: shipping and payment', () => {
  beforeEach(() => db.addToCart(ALICE, SHRIMP, 1));

  it('needs the shipping information', async () => {
    expect((await rejection(service.placeOrder(ALICE, KEY, { paymentMethod: 'COD' } as PlaceOrderDto)))?.message).toBe(SHIPPING_REQUIRED);
  });

  it('takes a saved address or new fields, not both', async () => {
    const error = await rejection(
      service.placeOrder(ALICE, KEY, order({ addressId: '33333333-3333-4333-8333-333333333333' })),
    );
    expect(error?.message).toBe(SHIPPING_ONE_ONLY);
  });

  it("refuses an address that is not the customer's own", async () => {
    db.addresses.push({ id: '33333333-3333-4333-8333-333333333333', userId: BOB });
    const error = await rejection(
      service.placeOrder(ALICE, KEY, { addressId: '33333333-3333-4333-8333-333333333333', paymentMethod: 'COD' } as PlaceOrderDto),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toBe(ADDRESS_INVALID);
  });

  it.each(['BANK_TRANSFER', 'E_WALLET', 'CARD'] as const)('only cash on delivery works for now, not %s', async (method) => {
    const error = await rejection(service.placeOrder(ALICE, KEY, order({ paymentMethod: method })));
    expect(error?.message).toBe(PAYMENT_NOT_SUPPORTED);
    expect(db.orders).toHaveLength(0);
    expect(db.stockOf(SHRIMP)).toBe(10);
  });
});

describe('request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const check = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: PlaceOrderDto } as ArgumentMetadata);
  const messages = async (value: unknown) => {
    const error = await rejection(check(value));
    return JSON.stringify((error as BadRequestException)?.getResponse?.() ?? '');
  };

  it('accepts a complete order, and trims the text', async () => {
    const parsed = (await check({
      paymentMethod: 'COD',
      customerNote: '  Giao giờ hành chính  ',
      shipping: { ...SHIPPING, recipientName: '  Nguyễn Văn An  ', ward: '   ' },
    })) as PlaceOrderDto;
    expect(parsed.customerNote).toBe('Giao giờ hành chính');
    expect(parsed.shipping?.recipientName).toBe('Nguyễn Văn An');
    expect(parsed.shipping?.ward).toBeUndefined();
  });

  it.each([
    ['a name that is too short', { recipientName: 'A' }, 'tối thiểu 2 ký tự'],
    ['a missing name', { recipientName: '' }, 'Tên người nhận'],
    ['a phone with letters', { recipientPhone: '09123abc78' }, 'Số điện thoại không hợp lệ'],
    ['a phone that is too short', { recipientPhone: '091234' }, 'Số điện thoại không hợp lệ'],
    ['no province', { province: '' }, 'tỉnh/thành phố'],
    ['no district', { district: '' }, 'quận/huyện'],
    ['a street that is too short', { streetAddress: 'ab' }, 'số nhà, tên đường'],
    ['a street that is too long', { streetAddress: 'x'.repeat(256) }, 'tối đa 255'],
  ])('refuses %s', async (_label, patch, text) => {
    expect(await messages({ paymentMethod: 'COD', shipping: { ...SHIPPING, ...patch } })).toContain(text);
  });

  it('accepts both +84 and 0 phone numbers', async () => {
    for (const phone of ['0912345678', '+84912345678', '02812345678']) {
      await expect(check({ paymentMethod: 'COD', shipping: { ...SHIPPING, recipientPhone: phone } })).resolves.toBeDefined();
    }
  });

  it('refuses an unknown payment method, a long note and a list of bad ids', async () => {
    expect(await messages({ paymentMethod: 'BITCOIN', shipping: SHIPPING })).toContain('Phương thức thanh toán');
    expect(await messages({ paymentMethod: 'COD', shipping: SHIPPING, customerNote: 'x'.repeat(501) })).toContain('tối đa 500');
    expect(await messages({ paymentMethod: 'COD', shipping: SHIPPING, items: ['not-a-uuid'] })).toContain('Sản phẩm không hợp lệ');
    expect(await messages({ paymentMethod: 'COD', shipping: SHIPPING, items: [] })).toContain('ít nhất 1');
    expect(await messages({ paymentMethod: 'COD', shipping: SHIPPING, items: [SHRIMP, SHRIMP] })).toContain('trùng');
  });

  it.each(['price', 'unitPrice', 'subtotal', 'shippingFee', 'shippingTotal', 'grandTotal', 'total', 'status', 'userId', 'idempotencyKey'])(
    'does not accept "%s" from the browser: prices, totals and the rest are the server\'s',
    async (field) => {
      expect(await messages({ paymentMethod: 'COD', shipping: SHIPPING, [field]: 1 })).toContain(`property ${field} should not exist`);
    },
  );

  it('does not accept a price tucked into the shipping part either', async () => {
    expect(await messages({ paymentMethod: 'COD', shipping: { ...SHIPPING, shippingFee: 0 } })).toContain('shippingFee should not exist');
  });
});
