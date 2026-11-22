import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ArgumentMetadata,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ProductService } from '../../product/product.service.js';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
} from './dto/vendor-product.dto.js';
import {
  VENDOR_READ_ONLY,
  vendorProductUploadFolder,
} from '../shared/vendor-access.js';
import {
  PRODUCT_DUPLICATE_VARIANT,
  PRODUCT_INVALID_CATEGORY,
  PRODUCT_INVALID_IMAGE,
  PRODUCT_NOT_FOUND,
  PRODUCT_OFFER_ON_EXISTING_VARIANT,
  PRODUCT_UNKNOWN_VARIANT,
  productVariantInUse,
  VendorProductService,
} from './vendor-product.service.js';

const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const VENDOR_A = 'vendor-a';
const VENDOR_B = 'vendor-b';
const PRODUCT_ID = '44444444-4444-4444-8444-444444444444';
const CATEGORY_ID = '55555555-5555-4555-8555-555555555555';
const VARIANT_1 = '66666666-6666-4666-8666-666666666666';
const VARIANT_2 = '77777777-7777-4777-8777-777777777777';
const CLOUD = { cloudName: 'demo-cloud', apiKey: 'key', apiSecret: 'secret' };
const OWN_IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1730000000/${vendorProductUploadFolder(VENDOR_A)}/tom_1.jpg`;
const STORE_IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1730000000/haisan-express/vendors/${VENDOR_A}/logo.png`;
const OTHER_VENDOR_IMAGE = `https://res.cloudinary.com/demo-cloud/image/upload/v1/${vendorProductUploadFolder(VENDOR_B)}/x.jpg`;

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

async function rejections(
  metatype: ArgumentMetadata['metatype'],
  value: Record<string, unknown>,
): Promise<string[]> {
  try {
    await pipe.transform(value, { type: 'body', metatype, data: '' });
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return ((error as BadRequestException).getResponse() as { message: string[] }).message;
  }
}

const createDto = (overrides: Record<string, unknown> = {}) => ({
  name: 'Tôm hùm bông Nha Trang',
  description: 'Giao sống',
  categoryIds: [CATEGORY_ID],
  images: [{ imageUrl: OWN_IMAGE, isPrimary: true }],
  variants: [
    {
      name: 'Loại 1',
      unit: 'kg',
      sizeLabel: '1 - 1.2 kg/con',
      offer: { price: 1450000, stock: 8.5 },
    },
    { name: 'Loại 2', unit: 'kg' },
  ],
  ...overrides,
});

const variantRow = (id: string, name: string, offers: unknown[] = []) => ({
  id,
  name,
  unit: 'kg',
  sizeLabel: null,
  offers,
});

const ownOffer = (counts = { cartItems: 0, orderItems: 0 }) => ({
  id: 'offer-1',
  vendorId: VENDOR_A,
  price: new Prisma.Decimal('1450000'),
  stock: new Prisma.Decimal('8.5'),
  status: 'ACTIVE',
  _count: counts,
});

const draftRow = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  name: 'Tôm hùm bông Nha Trang',
  slug: 'tom-hum-bong-nha-trang',
  description: 'Giao sống',
  status: 'DRAFT',
  createdByVendorId: VENDOR_A,
  createdAt: new Date('2026-11-18T08:00:00.000Z'),
  updatedAt: new Date('2026-11-18T09:00:00.000Z'),
  categories: [{ category: { id: CATEGORY_ID, name: 'Tôm' } }],
  images: [
    {
      id: 'img-1',
      imageUrl: STORE_IMAGE,
      altText: null,
      isPrimary: true,
      sortOrder: 0,
    },
  ],
  variants: [
    variantRow(VARIANT_1, 'Loại 1', [ownOffer()]),
    variantRow(VARIANT_2, 'Loại 2'),
  ],
  ...overrides,
});

describe('Vendor draft products', () => {
  let service: VendorProductService;
  let prisma: any;
  let tx: any;
  let vendorStatus: Record<string, string>;
  let drafts: Array<ReturnType<typeof draftRow>>;

  beforeEach(() => {
    vendorStatus = { [VENDOR_A]: 'ACTIVE', [VENDOR_B]: 'ACTIVE' };
    drafts = [draftRow()];
    const owners: Record<string, string> = {
      [OWNER_A]: VENDOR_A,
      [OWNER_B]: VENDOR_B,
    };

    tx = {
      product: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ slug: 'tom-hum-bong-nha-trang' }]),
        create: vi.fn().mockResolvedValue({ id: PRODUCT_ID }),
        update: vi.fn().mockResolvedValue({ id: PRODUCT_ID }),
      },
      productVariant: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    };
    prisma = {
      vendor: {
        findUnique: vi.fn(({ where }) => {
          const id = owners[where.ownerId];
          return Promise.resolve(id ? { id, status: vendorStatus[id] } : null);
        }),
      },
      product: {
        // Behaves like the real filter on id + createdByVendorId.
        findFirst: vi.fn(({ where }) =>
          Promise.resolve(
            drafts.find(
              (row) =>
                row.id === where.id &&
                row.createdByVendorId === where.createdByVendorId,
            ) ?? null,
          ),
        ),
        create: vi.fn(),
        update: vi.fn(),
      },
      productVariant: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
      category: {
        findMany: vi.fn(({ where }) =>
          Promise.resolve(
            where.id.in.map((id: string) => ({ id, parent: null })),
          ),
        ),
      },
      $transaction: vi.fn((fn: (client: unknown) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const config = { get: vi.fn(() => CLOUD) } as unknown as ConfigService;
    service = new VendorProductService(
      prisma as PrismaService,
      new CloudinaryService(config),
    );
  });

  describe('createProduct', () => {
    it('saves an ACTIVE product owned by my store, with variants and offers, inside one transaction', async () => {
      const result = await service.createProduct(OWNER_A, createDto() as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // Every write goes through the transaction client, none through the plain client.
      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(prisma.productVariant.create).not.toHaveBeenCalled();

      const product = tx.product.create.mock.calls[0][0].data;
      expect(product).toMatchObject({
        name: 'Tôm hùm bông Nha Trang',
        slug: 'tom-hum-bong-nha-trang-2', // the base slug is taken
        status: 'ACTIVE',
        createdByVendorId: VENDOR_A,
        categories: { create: [{ categoryId: CATEGORY_ID }] },
        images: {
          create: [
            {
              imageUrl: OWN_IMAGE,
              altText: null,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      });

      expect(tx.productVariant.create).toHaveBeenCalledTimes(2);
      const first = tx.productVariant.create.mock.calls[0][0].data;
      expect(first).toMatchObject({
        productId: PRODUCT_ID,
        name: 'Loại 1',
        unit: 'kg',
        sizeLabel: '1 - 1.2 kg/con',
      });
      expect(first.offers.create.vendorId).toBe(VENDOR_A);
      expect(first.offers.create.price.toString()).toBe('1450000');
      expect(first.offers.create.stock.toString()).toBe('8.5');
      expect(
        tx.productVariant.create.mock.calls[1][0].data.offers,
      ).toBeUndefined();

      expect(result).toMatchObject({
        id: PRODUCT_ID,
        status: 'DRAFT',
        editable: true,
      });
    });

    it.each([
      ['an image from another vendor', OTHER_VENDOR_IMAGE],
      ['a store logo instead of a product image', STORE_IMAGE],
      ['an outside URL', 'https://example.com/tom.jpg'],
    ])(
      'is 400 for %s, before anything is written',
      async (_label, imageUrl) => {
        await expect(
          service.createProduct(
            OWNER_A,
            createDto({ images: [{ imageUrl, isPrimary: true }] }) as any,
          ),
        ).rejects.toThrow(new BadRequestException(PRODUCT_INVALID_IMAGE));
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('is 400 for an inactive or unknown category', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await expect(
        service.createProduct(OWNER_A, createDto() as any),
      ).rejects.toThrow(new BadRequestException(PRODUCT_INVALID_CATEGORY));
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [CATEGORY_ID] }, isActive: true },
        }),
      );
    });

    it('is 400 for a category whose parent is hidden', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: CATEGORY_ID, parent: { isActive: false } },
      ]);
      await expect(
        service.createProduct(OWNER_A, createDto() as any),
      ).rejects.toThrow(new BadRequestException(PRODUCT_INVALID_CATEGORY));
    });

    it('is 400 for two variants with the same name and size', async () => {
      const variants = [
        { name: 'Loại 1', unit: 'kg' },
        { name: 'loai 1', unit: 'con' },
      ];
      await expect(
        service.createProduct(OWNER_A, createDto({ variants }) as any),
      ).rejects.toThrow(new BadRequestException(PRODUCT_DUPLICATE_VARIANT));
    });

    it('retries with the next slug when another draft took it meanwhile', async () => {
      prisma.$transaction
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('dup', {
            code: 'P2002',
            clientVersion: 't',
          }),
        )
        .mockImplementationOnce((fn: (client: unknown) => Promise<unknown>) =>
          fn(tx),
        );
      await expect(
        service.createProduct(OWNER_A, createDto() as any),
      ).resolves.toMatchObject({ id: PRODUCT_ID });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProduct', () => {
    it('returns my draft with my offer on each variant', async () => {
      const result = await service.getProduct(OWNER_A, PRODUCT_ID);

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PRODUCT_ID, createdByVendorId: VENDOR_A },
        }),
      );
      expect(result.variants).toEqual([
        {
          id: VARIANT_1,
          name: 'Loại 1',
          unit: 'kg',
          sizeLabel: null,
          offer: {
            id: 'offer-1',
            price: '1450000.00',
            stock: '8.5',
            status: 'ACTIVE',
          },
          removable: true,
        },
        {
          id: VARIANT_2,
          name: 'Loại 2',
          unit: 'kg',
          sizeLabel: null,
          offer: null,
          removable: true,
        },
      ]);
      expect(result.imageUploadEnabled).toBe(true);
    });

    it("is 404 for another vendor's draft", async () => {
      await expect(service.getProduct(OWNER_B, PRODUCT_ID)).rejects.toThrow(
        new NotFoundException(PRODUCT_NOT_FOUND),
      );
    });

    it('can still be read once the product is published', async () => {
      drafts[0].status = 'ACTIVE';
      await expect(service.getProduct(OWNER_A, PRODUCT_ID)).resolves.toMatchObject({
        id: PRODUCT_ID,
        status: 'ACTIVE',
      });
    });

    it('is read-only (editable false) for a suspended store', async () => {
      vendorStatus[VENDOR_A] = 'SUSPENDED';
      await expect(
        service.getProduct(OWNER_A, PRODUCT_ID),
      ).resolves.toMatchObject({ editable: false });
    });
  });

  describe('updateProduct', () => {
    it('updates fields, keeps old images, edits, adds and removes variants in one transaction', async () => {
      await service.updateProduct(OWNER_A, PRODUCT_ID, {
        name: 'Tôm hùm bông loại đặc biệt',
        images: [
          { imageUrl: STORE_IMAGE, isPrimary: false }, // already on the draft, so it may stay
          { imageUrl: OWN_IMAGE, isPrimary: true },
        ],
        variants: [
          { id: VARIANT_1, name: 'Loại 1 (to)', unit: 'kg' },
          { name: 'Loại 3', unit: 'con', offer: { price: 900000, stock: 2 } },
        ],
      } as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const update = tx.product.update.mock.calls[0][0];
      expect(update.where).toEqual({
        id: PRODUCT_ID,
        createdByVendorId: VENDOR_A,
      });
      expect(update.data.name).toBe('Tôm hùm bông loại đặc biệt');
      expect(update.data.slug).toBeUndefined();
      expect(update.data.images.deleteMany).toEqual({});
      expect(update.data.categories).toBeUndefined();

      expect(tx.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [VARIANT_2] }, productId: PRODUCT_ID },
      });
      expect(tx.productVariant.update).toHaveBeenCalledWith({
        where: { id: VARIANT_1, productId: PRODUCT_ID },
        data: { name: 'Loại 1 (to)', unit: 'kg', sizeLabel: null },
      });
      expect(tx.productVariant.create.mock.calls[0][0].data).toMatchObject({
        productId: PRODUCT_ID,
        name: 'Loại 3',
      });
    });

    it('refuses to remove a variant that is in a cart or an order', async () => {
      drafts[0].variants[0] = variantRow(VARIANT_1, 'Loại 1', [
        ownOffer({ cartItems: 1, orderItems: 0 }),
      ]);
      await expect(
        service.updateProduct(OWNER_A, PRODUCT_ID, {
          variants: [{ id: VARIANT_2, name: 'Loại 2', unit: 'kg' }],
        } as any),
      ).rejects.toThrow(new ConflictException(productVariantInUse('Loại 1')));
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses a variant id of another product, and an offer on an existing variant', async () => {
      await expect(
        service.updateProduct(OWNER_A, PRODUCT_ID, {
          variants: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              name: 'X',
              unit: 'kg',
            },
          ],
        } as any),
      ).rejects.toThrow(new BadRequestException(PRODUCT_UNKNOWN_VARIANT));
      await expect(
        service.updateProduct(OWNER_A, PRODUCT_ID, {
          variants: [
            {
              id: VARIANT_1,
              name: 'Loại 1',
              unit: 'kg',
              offer: { price: 1, stock: 1 },
            },
          ],
        } as any),
      ).rejects.toThrow(
        new BadRequestException(PRODUCT_OFFER_ON_EXISTING_VARIANT),
      );
    });

    it('is 400 for a new image outside my product folder', async () => {
      await expect(
        service.updateProduct(OWNER_A, PRODUCT_ID, {
          images: [{ imageUrl: OTHER_VENDOR_IMAGE, isPrimary: true }],
        } as any),
      ).rejects.toThrow(new BadRequestException(PRODUCT_INVALID_IMAGE));
    });

    it("is 404 for another vendor's product, and my own published product can be edited", async () => {
      await expect(
        service.updateProduct(OWNER_B, PRODUCT_ID, { name: 'Đổi tên' }),
      ).rejects.toThrow(new NotFoundException(PRODUCT_NOT_FOUND));
      expect(prisma.$transaction).not.toHaveBeenCalled();

      drafts[0].status = 'ACTIVE';
      await expect(
        service.updateProduct(OWNER_A, PRODUCT_ID, { name: 'Đổi tên' }),
      ).resolves.toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('read-only stores', () => {
    it.each(['SUSPENDED', 'REJECTED'])(
      'a %s store gets 403 on create, edit and upload',
      async (status) => {
        vendorStatus[VENDOR_A] = status;
        const forbidden = new ForbiddenException(VENDOR_READ_ONLY);
        await expect(
          service.createProduct(OWNER_A, createDto() as any),
        ).rejects.toThrow(forbidden);
        await expect(
          service.updateProduct(OWNER_A, PRODUCT_ID, { name: 'Mới' }),
        ).rejects.toThrow(forbidden);
        await expect(service.createUploadSignature(OWNER_A)).rejects.toThrow(
          forbidden,
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('createUploadSignature', () => {
    it('signs uploads into my own product folder, separate from the store images', async () => {
      const signature = await service.createUploadSignature(OWNER_A);
      expect(signature.folder).toBe(
        `haisan-express/vendor-products/${VENDOR_A}`,
      );
    });
  });

  describe('validation', () => {
    it('accepts a full draft, and one without images', async () => {
      expect(await rejections(CreateVendorProductDto, createDto())).toEqual([]);
      expect(
        await rejections(CreateVendorProductDto, createDto({ images: [] })),
      ).toEqual([]);
    });

    it.each([
      ['a blank name', { name: '   ' }, 'Vui lòng nhập tên sản phẩm.'],
      ['no category', { categoryIds: [] }, 'Vui lòng chọn ít nhất 1 danh mục.'],
      ['no variant', { variants: [] }, 'Vui lòng thêm ít nhất 1 biến thể.'],
      [
        'six images',
        {
          images: Array.from({ length: 6 }, (_, i) => ({
            imageUrl: OWN_IMAGE,
            isPrimary: i === 0,
          })),
        },
        'Tối đa 5 ảnh sản phẩm.',
      ],
      [
        'two primary images',
        {
          images: [
            { imageUrl: OWN_IMAGE, isPrimary: true },
            { imageUrl: OWN_IMAGE, isPrimary: true },
          ],
        },
        'Vui lòng chọn đúng 1 ảnh đại diện.',
      ],
      [
        'no primary image',
        { images: [{ imageUrl: OWN_IMAGE, isPrimary: false }] },
        'Vui lòng chọn đúng 1 ảnh đại diện.',
      ],
      [
        'a status from the client',
        { status: 'ACTIVE' },
        'property status should not exist',
      ],
      [
        'a creator from the client',
        { createdByVendorId: VENDOR_B },
        'property createdByVendorId should not exist',
      ],
    ])('rejects %s', async (_label, change, message) => {
      expect(
        await rejections(CreateVendorProductDto, createDto(change)),
      ).toContain(message);
    });

    it('reports nested variant and offer errors with their position', async () => {
      const messages = await rejections(
        CreateVendorProductDto,
        createDto({
          variants: [
            { name: ' ', unit: 'kg', offer: { price: 0, stock: 1.0005 } },
          ],
        }),
      );
      expect(messages).toEqual(
        expect.arrayContaining([
          'variants.0.Vui lòng nhập tên biến thể.',
          'variants.0.offer.Giá bán phải lớn hơn 0.',
          'variants.0.offer.Tồn kho chỉ được có tối đa 3 chữ số thập phân.',
        ]),
      );
    });

    it('lets an edit send only some fields, but not null for the name', async () => {
      expect(
        await rejections(UpdateVendorProductDto, { description: null }),
      ).toEqual([]);
      expect(
        await rejections(UpdateVendorProductDto, { name: null }),
      ).toContain('Tên sản phẩm phải là chuỗi ký tự.');
    });
  });

  describe('public API', () => {
    it('never serves a vendor draft on the product detail page', async () => {
      const findFirst = vi.fn(({ where }) =>
        Promise.resolve(
          where.status?.not === 'DRAFT'
            ? null
            : { ...draftRow(), species: null },
        ),
      );
      const products = new ProductService({
        product: { findFirst },
      } as unknown as PrismaService);

      await expect(products.findByIdOrSlug(PRODUCT_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        products.findByIdOrSlug('tom-hum-bong-nha-trang'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
