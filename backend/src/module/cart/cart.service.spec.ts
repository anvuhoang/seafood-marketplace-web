import {
  ArgumentMetadata,
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CART_ITEM_NOT_FOUND,
  CartService,
  OFFER_NOT_FOUND,
  OFFER_UNAVAILABLE,
  OUT_OF_STOCK,
  VENDOR_NOT_SELLING_MESSAGE,
} from './cart.service.js';
import {
  AddToCartDto,
  CartLinesDto,
  UpdateCartItemDto,
} from './dto/add-to-cart.dto.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const SHRIMP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CRAB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MISSING = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const D = (value: string | number) => new Prisma.Decimal(value);

interface OfferSeed {
  id: string;
  price?: string;
  stock?: string;
  status?: string;
  vendorStatus?: string;
  variantActive?: boolean;
  productStatus?: string;
  unit?: string;
  name?: string;
}

/** An offer row shaped like what the service reads (offer + vendor + variant + product + images). */
const makeOffer = (seed: OfferSeed) => ({
  id: seed.id,
  price: D(seed.price ?? '420000'),
  stock: D(seed.stock ?? '10'),
  status: seed.status ?? 'ACTIVE',
  vendor: {
    id: 'vendor-1',
    name: 'Vựa Phú Quốc',
    slug: 'vua-phu-quoc',
    status: seed.vendorStatus ?? 'ACTIVE',
  },
  variant: {
    name: 'Size 15 - 20',
    unit: seed.unit ?? 'kg',
    sizeLabel: '15 - 20 con/kg',
    isActive: seed.variantActive ?? true,
    product: {
      id: `product-${seed.id}`,
      name: seed.name ?? 'Tôm sú',
      slug: 'tom-su',
      status: seed.productStatus ?? 'ACTIVE',
      images: [{ imageUrl: 'https://img/tom.jpg', isPrimary: true }],
    },
  },
});

type OfferRow = ReturnType<typeof makeOffer>;

interface CartRow {
  id: string;
  userId: string;
}
interface ItemRow {
  id: string;
  cartId: string;
  offerId: string;
  quantity: Prisma.Decimal;
  createdAt: number;
}

/**
 * A tiny in-memory stand-in for the tables the cart touches. It answers the Prisma calls the
 * service makes with the same meaning (a `where` on `cart.userId` really filters by user), so the
 * tests can check what is stored and whose it is.
 */
class FakePrisma {
  offers = new Map<string, OfferRow>();
  carts: CartRow[] = [];
  items: ItemRow[] = [];
  writes = 0;
  private seq = 0;

  vendorOffer = {
    findUnique: ({ where }: { where: { id: string } }) =>
      Promise.resolve(this.offers.get(where.id) ?? null),
    findMany: ({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(
        where.id.in.map((id) => this.offers.get(id)).filter(Boolean),
      ),
  };

  cart = {
    upsert: ({ where, create }: { where: { userId: string }; create: { userId: string } }) => {
      let cart = this.carts.find((c) => c.userId === where.userId);
      if (!cart) {
        this.writes += 1;
        cart = { id: `cart-${create.userId}`, userId: create.userId };
        this.carts.push(cart);
      }
      return Promise.resolve({ id: cart.id });
    },
  };

  private ownedBy(userId: string) {
    const cartIds = new Set(
      this.carts.filter((c) => c.userId === userId).map((c) => c.id),
    );
    return this.items.filter((item) => cartIds.has(item.cartId));
  }

  cartItem = {
    findUnique: ({ where }: { where: { cartId_offerId: { cartId: string; offerId: string } } }) =>
      Promise.resolve(
        this.items.find(
          (i) =>
            i.cartId === where.cartId_offerId.cartId &&
            i.offerId === where.cartId_offerId.offerId,
        ) ?? null,
      ),
    findFirst: ({ where }: { where: { id: string; cart: { userId: string } } }) =>
      Promise.resolve(
        this.ownedBy(where.cart.userId).find((i) => i.id === where.id) ?? null,
      ),
    findMany: ({ where }: { where: { cart: { userId: string } } }) =>
      Promise.resolve(
        this.ownedBy(where.cart.userId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((item) => ({ ...item, offer: this.offers.get(item.offerId) })),
      ),
    upsert: ({
      where,
      update,
      create,
    }: {
      where: { cartId_offerId: { cartId: string; offerId: string } };
      update: { quantity: Prisma.Decimal };
      create: { cartId: string; offerId: string; quantity: Prisma.Decimal };
    }) => {
      this.writes += 1;
      const existing = this.items.find(
        (i) =>
          i.cartId === where.cartId_offerId.cartId &&
          i.offerId === where.cartId_offerId.offerId,
      );
      if (existing) {
        existing.quantity = update.quantity;
        return Promise.resolve(existing);
      }
      const row = { id: this.newId(), ...create, createdAt: (this.seq += 1) };
      this.items.push(row);
      return Promise.resolve(row);
    },
    update: ({ where, data }: { where: { id: string }; data: { quantity: Prisma.Decimal } }) => {
      this.writes += 1;
      const row = this.items.find((i) => i.id === where.id)!;
      row.quantity = data.quantity;
      return Promise.resolve(row);
    },
    delete: ({ where }: { where: { id: string } }) => {
      this.writes += 1;
      this.items = this.items.filter((i) => i.id !== where.id);
      return Promise.resolve({});
    },
    deleteMany: ({ where }: { where: { cart: { userId: string } } }) => {
      this.writes += 1;
      const mine = new Set(this.ownedBy(where.cart.userId).map((i) => i.id));
      this.items = this.items.filter((i) => !mine.has(i.id));
      return Promise.resolve({ count: mine.size });
    },
  };

  $transaction<T>(fn: (tx: FakePrisma) => Promise<T>): Promise<T> {
    // Like a real transaction, a failure undoes what the callback wrote.
    const before = { carts: [...this.carts], items: this.items.map((i) => ({ ...i })) };
    return fn(this).catch((error: unknown) => {
      this.carts = before.carts;
      this.items = before.items;
      throw error;
    });
  }

  private newId() {
    const n = (this.seq += 1);
    return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  }

  itemsOf(userId: string) {
    return this.ownedBy(userId);
  }
}

let db: FakePrisma;
let service: CartService;

const seed = (...offers: OfferSeed[]) =>
  offers.forEach((offer) => db.offers.set(offer.id, makeOffer(offer)));

beforeEach(() => {
  db = new FakePrisma();
  service = new CartService(db as never);
  seed({ id: SHRIMP, price: '420000', stock: '10' }, { id: CRAB, price: '99999.99', stock: '3', name: 'Cua' });
});

const rejection = async (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error as Error,
  );

describe('getCart', () => {
  it('is empty for a user with no cart', async () => {
    expect(await service.getCart(ALICE)).toEqual({
      items: [],
      lineCount: 0,
      subtotal: 0,
      hasProblems: false,
    });
  });
});

describe('addItem', () => {
  it('adds a line and the server works out the price and the total', async () => {
    const cart = await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2.5 });

    expect(cart.lineCount).toBe(1);
    expect(cart.items[0]).toMatchObject({
      offerId: SHRIMP,
      productName: 'Tôm sú',
      vendor: { name: 'Vựa Phú Quốc' },
      unit: 'kg',
      unitPrice: 420000,
      quantity: 2.5,
      subtotal: 1050000,
      stock: 10,
      available: true,
      problem: null,
      imageUrl: 'https://img/tom.jpg',
    });
    expect(cart.subtotal).toBe(1050000);
  });

  it('adds to the quantity already in the cart', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    const cart = await service.addItem(ALICE, { offerId: SHRIMP, quantity: 3 });
    expect(cart.lineCount).toBe(1);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.subtotal).toBe(2100000);
  });

  it('refuses a total above the stock and leaves the cart as it was', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 8 });
    const error = await rejection(service.addItem(ALICE, { offerId: SHRIMP, quantity: 3 }));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toContain('Tổng số lượng trong giỏ (11)');
    expect(db.itemsOf(ALICE)[0].quantity.toNumber()).toBe(8);
  });

  it('refuses a quantity above the stock on the first add', async () => {
    const error = await rejection(service.addItem(ALICE, { offerId: SHRIMP, quantity: 11 }));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toContain('vượt quá số lượng còn lại trong kho (10)');
    expect(db.itemsOf(ALICE)).toHaveLength(0);
  });

  it.each([
    ['an offer that does not exist', MISSING],
    ['an id that is not a UUID', 'prod-discontinued'],
    ['the old mock id', 'discontinued-sample'],
  ])('answers not found for %s, never success', async (_label, offerId) => {
    const error = await rejection(service.addItem(ALICE, { offerId, quantity: 1 }));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error?.message).toBe(OFFER_NOT_FOUND);
    expect(db.itemsOf(ALICE)).toHaveLength(0);
  });

  it.each([
    ['an offer that is not active', { status: 'PAUSED' }, OFFER_UNAVAILABLE],
    ['a discontinued offer', { status: 'DISCONTINUED' }, OFFER_UNAVAILABLE],
    ['a withdrawn variant', { variantActive: false }, OFFER_UNAVAILABLE],
    ['a product that is not published', { productStatus: 'DRAFT' }, OFFER_UNAVAILABLE],
    ['a hidden product', { productStatus: 'INACTIVE' }, OFFER_UNAVAILABLE],
    ['a store that is suspended', { vendorStatus: 'SUSPENDED' }, VENDOR_NOT_SELLING_MESSAGE],
    ['a store that is not approved yet', { vendorStatus: 'PENDING' }, VENDOR_NOT_SELLING_MESSAGE],
    ['an offer with no stock', { stock: '0' }, OUT_OF_STOCK],
  ])('refuses %s', async (_label, overrides, message) => {
    const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    seed({ id, ...overrides });
    const error = await rejection(service.addItem(ALICE, { offerId: id, quantity: 1 }));
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toBe(message);
    expect(db.itemsOf(ALICE)).toHaveLength(0);
  });

  it('keeps each user\'s cart separate', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    await service.addItem(BOB, { offerId: SHRIMP, quantity: 1 });
    expect((await service.getCart(ALICE)).items[0].quantity).toBe(2);
    expect((await service.getCart(BOB)).items[0].quantity).toBe(1);
  });
});

describe('totals', () => {
  it('are exact decimals, not floating point', async () => {
    const id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    seed({ id, price: '33333.33', stock: '10' });
    const cart = await service.addItem(ALICE, { offerId: id, quantity: 1.333 });
    // 33333.33 x 1.333 = 44433.32889 -> 44433.33
    expect(cart.items[0].subtotal).toBe(44433.33);
    expect(cart.subtotal).toBe(44433.33);

    const sum = await service.addItem(ALICE, { offerId: CRAB, quantity: 3 });
    // 99999.99 x 3 = 299999.97, plus the first line
    expect(sum.subtotal).toBe(344433.3);
  });

  it('use the price in the database now, so a price change shows up', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 1 });
    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, price: '500000' }));
    const cart = await service.getCart(ALICE);
    expect(cart.items[0].unitPrice).toBe(500000);
    expect(cart.subtotal).toBe(500000);
  });

  it('leave out a line that can no longer be bought and flag it', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    await service.addItem(ALICE, { offerId: CRAB, quantity: 1 });

    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, stock: '0' }));
    const cart = await service.getCart(ALICE);

    const shrimp = cart.items.find((i) => i.offerId === SHRIMP)!;
    expect(shrimp).toMatchObject({ available: false, problem: OUT_OF_STOCK, subtotal: 0 });
    expect(cart.hasProblems).toBe(true);
    expect(cart.subtotal).toBe(99999.99);
  });

  it('flag a line above the stock after the stock dropped', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 8 });
    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, stock: '5' }));
    const cart = await service.getCart(ALICE);
    expect(cart.items[0].available).toBe(false);
    expect(cart.items[0].problem).toContain('Chỉ còn 5 kg');
    expect(cart.subtotal).toBe(0);
  });
});

describe('updateItem', () => {
  it('sets the quantity (it does not add)', async () => {
    const added = await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    const cart = await service.updateItem(ALICE, added.items[0].id!, { quantity: 4 });
    expect(cart.items[0].quantity).toBe(4);
    expect(cart.subtotal).toBe(1680000);
  });

  it('refuses a quantity above the stock and keeps the old one', async () => {
    const added = await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    const error = await rejection(
      service.updateItem(ALICE, added.items[0].id!, { quantity: 11 }),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toContain('vượt quá số lượng còn lại trong kho (10)');
    expect(db.itemsOf(ALICE)[0].quantity.toNumber()).toBe(2);
  });

  it('refuses to change a line whose offer can no longer be bought', async () => {
    const added = await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    db.offers.set(SHRIMP, makeOffer({ id: SHRIMP, vendorStatus: 'SUSPENDED' }));
    const error = await rejection(
      service.updateItem(ALICE, added.items[0].id!, { quantity: 1 }),
    );
    expect(error?.message).toBe(VENDOR_NOT_SELLING_MESSAGE);
  });

  it("is not found for another user's line, and changes nothing", async () => {
    const bobs = await service.addItem(BOB, { offerId: SHRIMP, quantity: 2 });
    const error = await rejection(
      service.updateItem(ALICE, bobs.items[0].id!, { quantity: 9 }),
    );
    expect(error).toBeInstanceOf(NotFoundException);
    expect(error?.message).toBe(CART_ITEM_NOT_FOUND);
    expect(db.itemsOf(BOB)[0].quantity.toNumber()).toBe(2);
  });

  it.each([MISSING, 'not-a-uuid'])('is not found for the id %s', async (id) => {
    const error = await rejection(service.updateItem(ALICE, id, { quantity: 1 }));
    expect(error).toBeInstanceOf(NotFoundException);
  });
});

describe('removeItem and clear', () => {
  it('removes one of my lines', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 1 });
    const two = await service.addItem(ALICE, { offerId: CRAB, quantity: 1 });
    const crab = two.items.find((i) => i.offerId === CRAB)!;
    const cart = await service.removeItem(ALICE, crab.id!);
    expect(cart.items.map((i) => i.offerId)).toEqual([SHRIMP]);
  });

  it("is not found for another user's line, which stays in their cart", async () => {
    const bobs = await service.addItem(BOB, { offerId: SHRIMP, quantity: 2 });
    const error = await rejection(service.removeItem(ALICE, bobs.items[0].id!));
    expect(error).toBeInstanceOf(NotFoundException);
    expect(db.itemsOf(BOB)).toHaveLength(1);
  });

  it('empties only my cart', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 1 });
    await service.addItem(BOB, { offerId: SHRIMP, quantity: 1 });
    const cart = await service.clear(ALICE);
    expect(cart.lineCount).toBe(0);
    expect(db.itemsOf(BOB)).toHaveLength(1);
  });
});

describe('merge (browser cart after sign-in)', () => {
  it('adds the quantities to what the server cart already holds', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 2 });
    const result = await service.merge(ALICE, {
      items: [
        { offerId: SHRIMP, quantity: 1 },
        { offerId: CRAB, quantity: 1 },
      ],
    });
    expect(result.notices).toEqual([]);
    const byOffer = Object.fromEntries(result.cart.items.map((i) => [i.offerId, i.quantity]));
    expect(byOffer).toEqual({ [SHRIMP]: 3, [CRAB]: 1 });
  });

  it('counts the same offer listed twice once, added up', async () => {
    const result = await service.merge(ALICE, {
      items: [
        { offerId: SHRIMP, quantity: 1 },
        { offerId: SHRIMP, quantity: 2 },
      ],
    });
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0].quantity).toBe(3);
  });

  it('lowers a quantity above the stock and says so', async () => {
    await service.addItem(ALICE, { offerId: SHRIMP, quantity: 8 });
    const result = await service.merge(ALICE, { items: [{ offerId: SHRIMP, quantity: 5 }] });
    expect(result.cart.items[0].quantity).toBe(10);
    expect(result.notices.join(' ')).toContain('chỉ còn 10 kg');
  });

  it('leaves out unknown and unavailable offers and reports them, without failing', async () => {
    const closed = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    seed({ id: closed, vendorStatus: 'SUSPENDED', name: 'Ghẹ' });
    const result = await service.merge(ALICE, {
      items: [
        { offerId: SHRIMP, quantity: 1 },
        { offerId: MISSING, quantity: 1 },
        { offerId: closed, quantity: 1 },
      ],
    });
    expect(result.cart.items.map((i) => i.offerId)).toEqual([SHRIMP]);
    expect(result.notices).toHaveLength(2);
    expect(result.notices.join(' ')).toContain('"Ghẹ"');
  });

  it('only ever touches the cart of the signed-in user', async () => {
    await service.addItem(BOB, { offerId: SHRIMP, quantity: 4 });
    await service.merge(ALICE, { items: [{ offerId: SHRIMP, quantity: 1 }] });
    expect(db.itemsOf(BOB)[0].quantity.toNumber()).toBe(4);
  });
});

describe('quote (guest cart)', () => {
  it('prices the lines with the server prices and stores nothing', async () => {
    const quote = await service.quote({
      items: [
        { offerId: SHRIMP, quantity: 2 },
        { offerId: CRAB, quantity: 1 },
      ],
    });
    expect(quote.subtotal).toBe(939999.99);
    expect(quote.items.every((item) => item.id === null)).toBe(true);
    expect(quote.unknownOfferIds).toEqual([]);
    expect(db.writes).toBe(0);
    expect(db.carts).toHaveLength(0);
  });

  it('lists unknown offers and flags unavailable or over-stock ones, leaving them out of the total', async () => {
    seed({ id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', productStatus: 'INACTIVE' });
    const quote = await service.quote({
      items: [
        { offerId: SHRIMP, quantity: 20 },
        { offerId: MISSING, quantity: 1 },
        { offerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', quantity: 1 },
        { offerId: CRAB, quantity: 1 },
      ],
    });
    expect(quote.unknownOfferIds).toEqual([MISSING]);
    expect(quote.hasProblems).toBe(true);
    expect(quote.items.filter((i) => !i.available)).toHaveLength(2);
    expect(quote.subtotal).toBe(99999.99);
  });
});

describe('request validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const check = (type: new () => object, value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: type } as ArgumentMetadata);

  it('accepts an offer id and a positive quantity', async () => {
    await expect(check(AddToCartDto, { offerId: SHRIMP, quantity: 1.5 })).resolves.toBeDefined();
    await expect(check(UpdateCartItemDto, { quantity: 0.001 })).resolves.toBeDefined();
  });

  it.each([
    ['zero', { offerId: SHRIMP, quantity: 0 }],
    ['negative', { offerId: SHRIMP, quantity: -1 }],
    ['not a number', { offerId: SHRIMP, quantity: '2' }],
    ['more than three decimals', { offerId: SHRIMP, quantity: 1.2345 }],
    ['absurdly large', { offerId: SHRIMP, quantity: 1e9 }],
    ['no offer id', { quantity: 1 }],
    ['an id that is not a UUID', { offerId: 'prod-1', quantity: 1 }],
  ])('refuses %s', async (_label, body) => {
    await expect(check(AddToCartDto, body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not accept a price (or any other field) from the browser', async () => {
    const error = await rejection(
      check(AddToCartDto, { offerId: SHRIMP, quantity: 1, price: 1, userId: BOB }),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(JSON.stringify((error as BadRequestException).getResponse())).toContain(
      'property price should not exist',
    );
  });

  it('limits a list of lines to 50 and refuses an empty one', async () => {
    const line = { offerId: SHRIMP, quantity: 1 };
    await expect(check(CartLinesDto, { items: Array(50).fill(line) })).resolves.toBeDefined();
    await expect(check(CartLinesDto, { items: Array(51).fill(line) })).rejects.toBeInstanceOf(BadRequestException);
    await expect(check(CartLinesDto, { items: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(check(CartLinesDto, { items: [{ offerId: SHRIMP, quantity: -1 }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
