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
import { Prisma } from '@prisma/client';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SELLABLE_OFFER_WHERE } from '../../category/category.service.js';
import {
  CreateVendorOfferDto,
  UpdateVendorOfferDto,
  UpdateVendorOfferStatusDto,
  VendorOfferQueryDto,
} from './dto/vendor-offer.dto.js';
import { VENDOR_READ_ONLY } from '../shared/vendor-access.js';
import { VendorController } from '../vendor.controller.js';
import { VendorModule } from '../vendor.module.js';
import { VendorOfferController } from './vendor-offer.controller.js';
import {
  LOW_STOCK_THRESHOLD,
  OFFER_ALREADY_EXISTS,
  OFFER_DISCONTINUED,
  OFFER_NOT_FOUND,
  OFFER_ONCE_DISCONTINUED,
  VARIANT_NOT_FOUND,
  VendorOfferService,
} from './vendor-offer.service.js';

const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const VENDOR_A = 'vendor-a';
const VENDOR_B = 'vendor-b';
const OFFER_A = '11111111-1111-4111-8111-111111111111';
const OFFER_B = '22222222-2222-4222-8222-222222222222';
const VARIANT_ID = '33333333-3333-4333-8333-333333333333';

/** Same pipe settings as main.ts. */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const body = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
  data: '',
});

/** Messages the pipe returns for a body, or [] when it is accepted. */
async function rejections(
  metatype: ArgumentMetadata['metatype'],
  value: Record<string, unknown>,
): Promise<string[]> {
  try {
    await pipe.transform(value, body(metatype));
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse()['message'] as string[];
  }
}

const offerRow = (overrides: Record<string, unknown> = {}) => ({
  id: OFFER_A,
  vendorId: VENDOR_A,
  price: new Prisma.Decimal('1450000'),
  stock: new Prisma.Decimal('12.5'),
  status: 'ACTIVE',
  updatedAt: new Date('2026-11-18T08:00:00.000Z'),
  variant: {
    id: VARIANT_ID,
    name: 'Loại 1',
    unit: 'kg',
    sizeLabel: '1 - 1.2 kg/con',
    product: {
      id: 'product-1',
      name: 'Tôm hùm bông Nha Trang',
      slug: 'tom-hum-bong-nha-trang',
      status: 'ACTIVE',
      createdByVendorId: null,
      images: [
        { imageUrl: 'https://img/2.jpg', isPrimary: false },
        { imageUrl: 'https://img/1.jpg', isPrimary: true },
      ],
      categories: [{ category: { id: 'cat-tom', name: 'Tôm' } }],
    },
  },
  ...overrides,
});

/** Write methods of the order side that discontinuing must never touch. */
const ORDER_SIDE_MODELS = [
  'order',
  'orderItem',
  'vendorOrder',
  'payment',
  'cartItem',
  'cart',
] as const;
const WRITE_METHODS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
] as const;
const writeMocks = () =>
  Object.fromEntries(WRITE_METHODS.map((method) => [method, vi.fn()]));

describe('Vendor offers', () => {
  let service: VendorOfferService;
  let prisma: any;
  let vendorStatus: Record<string, string>;
  /** The store's offers: A's own one and B's. */
  let offers: Array<ReturnType<typeof offerRow>>;

  beforeEach(() => {
    vendorStatus = { [VENDOR_A]: 'ACTIVE', [VENDOR_B]: 'ACTIVE' };
    offers = [offerRow(), offerRow({ id: OFFER_B, vendorId: VENDOR_B })];
    const owners: Record<string, string> = {
      [OWNER_A]: VENDOR_A,
      [OWNER_B]: VENDOR_B,
    };
    const matches = (
      row: ReturnType<typeof offerRow>,
      where: Record<string, any>,
    ) =>
      (where.id === undefined || row.id === where.id) &&
      (where.vendorId === undefined || row.vendorId === where.vendorId);

    prisma = {
      vendor: {
        findUnique: vi.fn(({ where }: { where: { ownerId: string } }) => {
          const id = owners[where.ownerId];
          return Promise.resolve(id ? { id, status: vendorStatus[id] } : null);
        }),
      },
      vendorOffer: {
        findMany: vi.fn(({ where }) =>
          Promise.resolve(offers.filter((row) => matches(row, where))),
        ),
        findFirst: vi.fn(({ where }) =>
          Promise.resolve(offers.find((row) => matches(row, where)) ?? null),
        ),
        findFirstOrThrow: vi.fn(({ where }) =>
          Promise.resolve(offers.find((row) => matches(row, where))),
        ),
        findUnique: vi.fn().mockResolvedValue(null),
        groupBy: vi.fn().mockResolvedValue([
          { status: 'ACTIVE', _count: { _all: 3 } },
          { status: 'PAUSED', _count: { _all: 1 } },
          { status: 'DISCONTINUED', _count: { _all: 2 } },
        ]),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(({ data }) =>
          Promise.resolve(offerRow({ ...data, id: 'new-offer' })),
        ),
        update: vi.fn(({ where, data }) =>
          Promise.resolve({
            ...offers.find((row) => row.id === where.id)!,
            ...data,
          }),
        ),
      },
      productVariant: {
        findFirst: vi.fn().mockResolvedValue({ id: VARIANT_ID }),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([{ id: 'cat-tom-hum' }]),
      },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      ...Object.fromEntries(
        ORDER_SIDE_MODELS.map((model) => [model, writeMocks()]),
      ),
    };
    service = new VendorOfferService(prisma as PrismaService);
  });

  describe('routes', () => {
    const handlers = Object.getOwnPropertyNames(VendorOfferController.prototype)
      .filter((name) => name !== 'constructor')
      .map(
        (name) =>
          [name, (VendorOfferController.prototype as any)[name]] as const,
      );

    it.each(handlers)('%s is VENDOR-only', async (_name, handler) => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride<string[]>(ROLES_KEY, [
          handler,
          VendorOfferController,
        ]),
      ).toEqual(['VENDOR']);

      const findUnique = vi.fn();
      const guard = new RolesGuard(reflector, {
        user: { findUnique },
      } as unknown as PrismaService);
      const asRole = (role: string) => {
        findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
        return guard.canActivate({
          getHandler: () => handler,
          getClass: () => VendorOfferController,
          switchToHttp: () => ({
            getRequest: () => ({ user: { sub: OWNER_A, role } }),
          }),
        } as unknown as ExecutionContext);
      };
      await expect(asRole('VENDOR')).resolves.toBe(true);
      await expect(asRole('CUSTOMER')).rejects.toThrow(ForbiddenException);
      await expect(asRole('ADMIN')).rejects.toThrow(ForbiddenException);
    });

    it('registers /vendors/me/... before /vendors/:slug so the slug route cannot swallow them', () => {
      const controllers = Reflect.getMetadata(
        MODULE_METADATA.CONTROLLERS,
        VendorModule,
      ) as unknown[];
      expect(controllers.indexOf(VendorOfferController)).toBeLessThan(
        controllers.indexOf(VendorController),
      );
    });
  });

  describe('listOffers', () => {
    it("returns only the signed-in vendor's offers, found by the token owner", async () => {
      const result = await service.listOffers(OWNER_A, {});

      expect(prisma.vendor.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: OWNER_A } }),
      );
      expect(prisma.vendorOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vendorId: VENDOR_A }),
        }),
      );
      expect(result.items.map((item) => item.id)).toEqual([OFFER_A]);
      expect(result.items[0]).toEqual({
        id: OFFER_A,
        product: {
          id: 'product-1',
          name: 'Tôm hùm bông Nha Trang',
          slug: 'tom-hum-bong-nha-trang',
          status: 'ACTIVE',
          isOwnProduct: false,
          imageUrl: 'https://img/1.jpg',
          categories: [{ id: 'cat-tom', name: 'Tôm' }],
        },
        variant: {
          id: VARIANT_ID,
          name: 'Loại 1',
          unit: 'kg',
          sizeLabel: '1 - 1.2 kg/con',
        },
        price: '1450000.00',
        stock: '12.5',
        status: 'ACTIVE',
        updatedAt: '2026-11-18T08:00:00.000Z',
      });
    });

    it('hides discontinued offers unless that status is asked for', async () => {
      await service.listOffers(OWNER_A, {});
      expect(prisma.vendorOffer.findMany.mock.calls[0][0].where.status).toEqual(
        { not: 'DISCONTINUED' },
      );

      await service.listOffers(OWNER_A, { status: 'DISCONTINUED' });
      expect(prisma.vendorOffer.findMany.mock.calls[1][0].where.status).toBe(
        'DISCONTINUED',
      );
    });

    it('filters by category including its subcategories', async () => {
      await service.listOffers(OWNER_A, { categoryId: 'cat-tom' });
      expect(
        prisma.vendorOffer.findMany.mock.calls[0][0].where.variant,
      ).toEqual({
        product: {
          categories: {
            some: { categoryId: { in: ['cat-tom', 'cat-tom-hum'] } },
          },
        },
      });
    });

    it('searches without accents and paginates the matches', async () => {
      offers = [
        offerRow({ id: 'o1' }),
        offerRow({
          id: 'o2',
          variant: {
            ...offerRow().variant,
            product: { ...offerRow().variant.product, name: 'Cua Cà Mau' },
          },
        }),
      ];
      const found = await service.listOffers(OWNER_A, { search: 'tom hum' });
      expect(found.items.map((item) => item.id)).toEqual(['o1']);
      expect(found.pagination).toEqual({
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
      });

      const page2 = await service.listOffers(OWNER_A, { page: 2, pageSize: 1 });
      expect(page2.items.map((item) => item.id)).toEqual(['o2']);
      expect(page2.pagination).toEqual({
        page: 2,
        limit: 1,
        totalItems: 2,
        totalPages: 2,
      });
    });

    it('summarises every offer of the store, whatever the filters', async () => {
      const { summary } = await service.listOffers(OWNER_A, {
        status: 'PAUSED',
        search: 'không khớp',
      });

      expect(prisma.vendorOffer.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vendorId: VENDOR_A } }),
      );
      expect(prisma.vendorOffer.count).toHaveBeenCalledWith({
        where: {
          vendorId: VENDOR_A,
          status: 'ACTIVE',
          stock: { lte: LOW_STOCK_THRESHOLD },
        },
      });
      expect(summary).toEqual({
        total: 6,
        active: 3,
        paused: 1,
        lowStock: 1,
        discontinued: 2,
        pendingApproval: 1,
        lowStockThreshold: 5,
      });
    });

    it('is 404 when the account has no store', async () => {
      await expect(service.listOffers('nobody', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createOffer', () => {
    const dto = { variantId: VARIANT_ID, price: 450000, stock: 10 };

    it('creates an ACTIVE offer for the signed-in vendor with exact decimals', async () => {
      const result = await service.createOffer(OWNER_A, {
        ...dto,
        price: 0.1,
        stock: 0.3,
      });

      const data = prisma.vendorOffer.create.mock.calls[0][0].data;
      expect(data.vendorId).toBe(VENDOR_A);
      expect(data.status).toBe('ACTIVE');
      expect(data.price.toString()).toBe('0.1');
      expect(data.stock.toString()).toBe('0.3');
      expect(result.id).toBe('new-offer');
    });

    it('only accepts active variants of published products or of the vendor own drafts', async () => {
      await service.createOffer(OWNER_A, dto);
      expect(prisma.productVariant.findFirst).toHaveBeenCalledWith({
        where: {
          id: VARIANT_ID,
          isActive: true,
          product: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'DRAFT', createdByVendorId: VENDOR_A },
            ],
          },
        },
        select: { id: true },
      });
    });

    it("is 404 for an inactive variant or another vendor's draft (the lookup finds nothing)", async () => {
      prisma.productVariant.findFirst.mockResolvedValue(null);
      await expect(service.createOffer(OWNER_A, dto)).rejects.toThrow(
        new NotFoundException(VARIANT_NOT_FOUND),
      );
      expect(prisma.vendorOffer.create).not.toHaveBeenCalled();
    });

    it('is 409 when the vendor already sells the variant', async () => {
      prisma.vendorOffer.findUnique.mockResolvedValue({ status: 'PAUSED' });
      await expect(service.createOffer(OWNER_A, dto)).rejects.toThrow(
        new ConflictException(OFFER_ALREADY_EXISTS),
      );
      expect(prisma.vendorOffer.create).not.toHaveBeenCalled();
    });

    it('is 409 with its own message when the variant was discontinued before', async () => {
      prisma.vendorOffer.findUnique.mockResolvedValue({
        status: 'DISCONTINUED',
      });
      await expect(service.createOffer(OWNER_A, dto)).rejects.toThrow(
        new ConflictException(OFFER_ONCE_DISCONTINUED),
      );
    });

    it('turns a unique-key race into 409', async () => {
      prisma.vendorOffer.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(service.createOffer(OWNER_A, dto)).rejects.toThrow(
        new ConflictException(OFFER_ALREADY_EXISTS),
      );
    });
  });

  describe('updateOffer', () => {
    it('changes price and stock of my own offer', async () => {
      const result = await service.updateOffer(OWNER_A, OFFER_A, {
        price: 500000.5,
        stock: 0,
      });

      const call = prisma.vendorOffer.update.mock.calls[0][0];
      expect(call.where).toEqual({
        id: OFFER_A,
        vendorId: VENDOR_A,
        status: { not: 'DISCONTINUED' },
      });
      expect(call.data.price.toFixed(2)).toBe('500000.50');
      expect(call.data.stock.toString()).toBe('0');
      expect(result.price).toBe('500000.50');
    });

    it("is 404 for another vendor's offer, without revealing it exists", async () => {
      await expect(
        service.updateOffer(OWNER_A, OFFER_B, { price: 1 }),
      ).rejects.toThrow(new NotFoundException(OFFER_NOT_FOUND));
      expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
    });

    it('is 409 for a discontinued offer', async () => {
      offers[0].status = 'DISCONTINUED';
      await expect(
        service.updateOffer(OWNER_A, OFFER_A, { price: 1 }),
      ).rejects.toThrow(new ConflictException(OFFER_DISCONTINUED));
      expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('pauses and resumes my own offer', async () => {
      const paused = await service.changeStatus(OWNER_A, OFFER_A, {
        status: 'PAUSED',
      });
      expect(prisma.vendorOffer.update.mock.calls[0][0]).toMatchObject({
        where: { id: OFFER_A, vendorId: VENDOR_A, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      expect(paused.status).toBe('PAUSED');
    });

    it('lets a legacy OUT_OF_STOCK offer move on to ACTIVE', async () => {
      offers[0].status = 'OUT_OF_STOCK';
      await service.changeStatus(OWNER_A, OFFER_A, { status: 'ACTIVE' });
      expect(prisma.vendorOffer.update.mock.calls[0][0].data).toEqual({
        status: 'ACTIVE',
      });
    });

    it('discontinues by changing the offer status only, never orders, payments or carts', async () => {
      const result = await service.changeStatus(OWNER_A, OFFER_A, {
        status: 'DISCONTINUED',
      });

      expect(result.status).toBe('DISCONTINUED');
      expect(prisma.vendorOffer.update).toHaveBeenCalledTimes(1);
      expect(prisma.vendorOffer.update.mock.calls[0][0].data).toEqual({
        status: 'DISCONTINUED',
      });
      for (const model of ORDER_SIDE_MODELS) {
        for (const method of WRITE_METHODS) {
          expect(
            prisma[model][method],
            `${model}.${method}`,
          ).not.toHaveBeenCalled();
        }
      }
    });

    it('never reactivates or re-pauses a discontinued offer', async () => {
      offers[0].status = 'DISCONTINUED';
      for (const status of ['ACTIVE', 'PAUSED', 'DISCONTINUED'] as const) {
        await expect(
          service.changeStatus(OWNER_A, OFFER_A, { status }),
        ).rejects.toThrow(new ConflictException(OFFER_DISCONTINUED));
      }
      expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
    });

    it("is 404 for another vendor's offer", async () => {
      await expect(
        service.changeStatus(OWNER_A, OFFER_B, { status: 'PAUSED' }),
      ).rejects.toThrow(new NotFoundException(OFFER_NOT_FOUND));
      expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
    });

    it('does not write when the status is unchanged', async () => {
      const result = await service.changeStatus(OWNER_A, OFFER_A, {
        status: 'ACTIVE',
      });
      expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('read-only stores', () => {
    it.each(['SUSPENDED', 'REJECTED'])(
      'a %s store gets 403 on every write and nothing is written',
      async (status) => {
        vendorStatus[VENDOR_A] = status;
        const forbidden = new ForbiddenException(VENDOR_READ_ONLY);

        await expect(
          service.createOffer(OWNER_A, {
            variantId: VARIANT_ID,
            price: 1,
            stock: 1,
          }),
        ).rejects.toThrow(forbidden);
        await expect(
          service.updateOffer(OWNER_A, OFFER_A, { price: 1 }),
        ).rejects.toThrow(forbidden);
        await expect(
          service.changeStatus(OWNER_A, OFFER_A, { status: 'PAUSED' }),
        ).rejects.toThrow(forbidden);
        expect(prisma.vendorOffer.create).not.toHaveBeenCalled();
        expect(prisma.vendorOffer.update).not.toHaveBeenCalled();
      },
    );

    it.each(['SUSPENDED', 'REJECTED'])(
      'a %s store can still read its offers',
      async (status) => {
        vendorStatus[VENDOR_A] = status;
        await expect(service.listOffers(OWNER_A, {})).resolves.toMatchObject({
          items: [{ id: OFFER_A }],
        });
      },
    );

    it('a PENDING store can prepare its offers before approval', async () => {
      vendorStatus[VENDOR_A] = 'PENDING';
      await expect(
        service.updateOffer(OWNER_A, OFFER_A, { stock: 3 }),
      ).resolves.toMatchObject({ id: OFFER_A });
    });
  });

  describe('searchCatalog', () => {
    it('offers published products and my own drafts, flagging variants I already sell', async () => {
      prisma.product.findMany
        .mockResolvedValueOnce([
          { id: 'p1', name: 'Tôm hùm bông', species: null, categories: [] },
          { id: 'p2', name: 'Cua thịt', species: null, categories: [] },
        ])
        .mockResolvedValueOnce([
          {
            ...offerRow().variant.product,
            id: 'p1',
            status: 'DRAFT',
            createdByVendorId: VENDOR_A,
            variants: [
              {
                id: 'v1',
                name: 'Loại 1',
                unit: 'kg',
                sizeLabel: null,
                offers: [{ id: 'mine' }],
              },
              {
                id: 'v2',
                name: 'Loại 2',
                unit: 'kg',
                sizeLabel: null,
                offers: [],
              },
            ],
          },
        ]);

      const result = await service.searchCatalog(OWNER_A, { search: 'tom' });

      expect(prisma.product.findMany.mock.calls[0][0].where).toEqual({
        OR: [
          { status: 'ACTIVE' },
          { status: 'DRAFT', createdByVendorId: VENDOR_A },
        ],
        variants: { some: { isActive: true } },
      });
      expect(
        prisma.product.findMany.mock.calls[1][0].select.variants.where,
      ).toEqual({ isActive: true });
      expect(
        prisma.product.findMany.mock.calls[1][0].select.variants.select.offers
          .where,
      ).toEqual({ vendorId: VENDOR_A });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ id: 'p1', isOwnProduct: true });
      expect(
        result.items[0].variants.map((v) => [v.id, v.alreadyOffered]),
      ).toEqual([
        ['v1', true],
        ['v2', false],
      ]);
    });
  });

  describe('validation', () => {
    const valid = { variantId: VARIANT_ID, price: 450000, stock: 10 };

    it('accepts the largest values the columns hold', async () => {
      expect(
        await rejections(CreateVendorOfferDto, {
          ...valid,
          price: 999_999_999_999.99,
          stock: 999_999_999.999,
        }),
      ).toEqual([]);
      expect(
        await rejections(CreateVendorOfferDto, {
          ...valid,
          price: 0.01,
          stock: 0,
        }),
      ).toEqual([]);
    });

    it.each([
      ['price 0', { price: 0 }, 'Giá bán phải lớn hơn 0.'],
      ['negative price', { price: -1000 }, 'Giá bán phải lớn hơn 0.'],
      [
        'price with 3 decimals',
        { price: 1000.123 },
        'Giá bán chỉ được có tối đa 2 chữ số thập phân.',
      ],
      [
        'price above Decimal(14,2)',
        { price: 1_000_000_000_000 },
        'Giá bán tối đa 999.999.999.999,99 đ.',
      ],
      ['price as text', { price: '1000' }, 'Giá bán phải là số.'],
      ['negative stock', { stock: -1 }, 'Tồn kho không được âm.'],
      [
        'stock with 4 decimals',
        { stock: 1.2345 },
        'Tồn kho chỉ được có tối đa 3 chữ số thập phân.',
      ],
      [
        'tiny stock in exponent form',
        { stock: 1e-7 },
        'Tồn kho chỉ được có tối đa 3 chữ số thập phân.',
      ],
      [
        'stock above Decimal(12,3)',
        { stock: 1_000_000_000 },
        'Tồn kho tối đa 999.999.999,999.',
      ],
      [
        'status OUT_OF_STOCK',
        { status: 'OUT_OF_STOCK' },
        'Trạng thái chỉ có thể là đang bán hoặc tạm ngưng.',
      ],
      [
        'a vendorId from the client',
        { vendorId: VENDOR_B },
        'property vendorId should not exist',
      ],
    ])('rejects %s on create', async (_label, change, message) => {
      expect(
        await rejections(CreateVendorOfferDto, { ...valid, ...change }),
      ).toContain(message);
    });

    it('validates price and stock on update too, and refuses null', async () => {
      expect(await rejections(UpdateVendorOfferDto, { price: 0 })).toContain(
        'Giá bán phải lớn hơn 0.',
      );
      expect(await rejections(UpdateVendorOfferDto, { stock: -0.5 })).toContain(
        'Tồn kho không được âm.',
      );
      expect(await rejections(UpdateVendorOfferDto, { price: null })).toContain(
        'Giá bán phải là số.',
      );
      expect(await rejections(UpdateVendorOfferDto, { stock: 2.5 })).toEqual(
        [],
      );
    });

    it('only lets vendors pick ACTIVE, PAUSED or DISCONTINUED', async () => {
      expect(
        await rejections(UpdateVendorOfferStatusDto, {
          status: 'DISCONTINUED',
        }),
      ).toEqual([]);
      expect(
        await rejections(UpdateVendorOfferStatusDto, {
          status: 'OUT_OF_STOCK',
        }),
      ).toHaveLength(1);
    });

    it('parses list queries and caps the page size', async () => {
      const query = {
        type: 'query',
        metatype: VendorOfferQueryDto,
        data: '',
      } as ArgumentMetadata;
      await expect(
        pipe.transform({ page: '2', pageSize: '20', search: '  tôm ' }, query),
      ).resolves.toMatchObject({
        page: 2,
        pageSize: 20,
        search: 'tôm',
      });
      await expect(pipe.transform({ pageSize: '500' }, query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(pipe.transform({ status: 'SOLD' }, query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('customer side', () => {
    it('only ACTIVE offers of ACTIVE vendors are sellable in the product listing and category pages', () => {
      expect(SELLABLE_OFFER_WHERE).toEqual({
        status: 'ACTIVE',
        vendor: { status: 'ACTIVE' },
      });
    });
  });
});
