import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const vendor = (slug: string, status = 'ACTIVE') => ({
  id: `v-${slug}`,
  name: `Vựa ${slug}`,
  slug,
  description: null,
  logoUrl: null,
  coverUrl: null,
  streetAddress: 'Cảng cá',
  district: 'Nha Trang',
  province: 'Khánh Hòa',
  status,
  ratingAverage: { toString: () => '4.70' },
  ratingCount: 98,
});

const offer = (id: string, price: number, stock: number, v = vendor('a'), status = 'ACTIVE') => ({
  id,
  price,
  stock,
  status,
  vendor: v,
});

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Tôm Hùm Bông Nha Trang',
  slug: 'tom-hum-bong-nha-trang',
  description: null,
  status: 'ACTIVE',
  isFeatured: true,
  species: null,
  categories: [
    { category: { id: 'c1', name: 'Hải Sản Đặc Sản', slug: 'hai-san-dac-san', isActive: true, parent: { isActive: true } } },
    { category: { id: 'c2', name: 'Ẩn', slug: 'an', isActive: false, parent: null } },
    { category: { id: 'c3', name: 'Con của danh mục ẩn', slug: 'con', isActive: true, parent: { isActive: false } } },
  ],
  images: [],
  variants: [
    {
      sku: null,
      unit: 'kg',
      sizeLabel: '1 - 1.2 kg/con',
      isActive: true,
      offers: [offer('o1', 1450000, 6)],
    },
  ],
  ...overrides,
});

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      product: { findFirst: vi.fn() },
      review: {
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new ProductService(prisma as PrismaService);
  });

  it('throws NotFound for an unknown product instead of returning mock data', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrSlug('khong-ton-tai')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('looks up slugs by slug and UUIDs by id, never returning drafts', async () => {
    prisma.product.findFirst.mockResolvedValue(productRow());

    await service.findByIdOrSlug('tom-hum-bong-nha-trang');
    await service.findByIdOrSlug('e44b0e7e-84db-45bd-9629-d612a4a4cc46');

    expect(prisma.product.findFirst.mock.calls[0][0].where).toEqual({
      slug: 'tom-hum-bong-nha-trang',
      status: { not: 'DRAFT' },
    });
    expect(prisma.product.findFirst.mock.calls[1][0].where).toEqual({
      id: 'e44b0e7e-84db-45bd-9629-d612a4a4cc46',
      status: { not: 'DRAFT' },
    });
  });

  it('returns only real data: no fake discount, specs or vendor stats', async () => {
    prisma.product.findFirst.mockResolvedValue(productRow());

    const result = await service.findByIdOrSlug('tom-hum-bong-nha-trang');

    expect(result).toMatchObject({
      price: 1450000,
      originalPrice: null,
      discountPercent: null,
      sizeLabel: '1 - 1.2 kg/con',
      stock: 6,
      inStock: true,
      offerId: 'o1',
      specifications: { commonName: null, scientificName: null, origin: 'Nha Trang, Khánh Hòa' },
    });
    expect(result.vendor).toMatchObject({ slug: 'a', ratingAverage: 4.7, verified: true });
    expect(result.vendor).not.toHaveProperty('positiveRatingPercent');
    expect(result.categories.map((c) => c.slug)).toEqual(['hai-san-dac-san']);
  });

  it('prefers the cheapest in-stock offer from an ACTIVE vendor', async () => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        variants: [
          {
            sku: null,
            unit: 'kg',
            sizeLabel: null,
            isActive: true,
            offers: [
              offer('sold-out', 1000000, 0, vendor('a')),
              offer('suspended', 900000, 9, vendor('b', 'SUSPENDED')),
              offer('ok', 1200000, 4, vendor('c')),
            ],
          },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ offerId: 'ok', price: 1200000, stock: 4, inStock: true });
    expect(result.vendor?.slug).toBe('c');
  });

  it('does not present a suspended vendor as the seller', async () => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        variants: [
          { sku: null, unit: 'kg', sizeLabel: null, isActive: true, offers: [offer('o1', 280000, 10, vendor('ha-long', 'SUSPENDED'))] },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ vendor: null, offerId: null, inStock: false, stock: 0 });
    expect(result.specifications.origin).toBeNull();
  });

  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])('does not leak the price or offer of a %s vendor', async (status) => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        variants: [
          { sku: 'PENDING-SKU', unit: 'kg', sizeLabel: '2 con/kg', isActive: true, offers: [offer('hidden', 990000, 30, vendor('new', status))] },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ vendor: null, offerId: null, price: null, sku: null, inStock: false });
    expect(JSON.stringify(result)).not.toContain('hidden');
    expect(JSON.stringify(result)).not.toContain('PENDING-SKU');
  });

  it.each(['PAUSED', 'DISCONTINUED'])('does not sell or show a %s offer, not even as the last known price', async (status) => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        variants: [
          { sku: 'WITHDRAWN', unit: 'kg', sizeLabel: null, isActive: true, offers: [offer('withdrawn', 990000, 30, vendor('a'), status)] },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ vendor: null, offerId: null, price: null, sku: null, inStock: false, stock: 0 });
  });

  it('sells the ACTIVE offer and ignores a cheaper discontinued one', async () => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        variants: [
          {
            sku: null,
            unit: 'kg',
            sizeLabel: null,
            isActive: true,
            offers: [offer('gone', 100000, 50, vendor('cheap'), 'DISCONTINUED'), offer('ok', 500000, 5, vendor('b'))],
          },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ offerId: 'ok', price: 500000 });
    expect(result.vendor?.slug).toBe('b');
  });

  it('returns a null price for a discontinued product whose only offers belong to non-ACTIVE vendors', async () => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        status: 'INACTIVE',
        variants: [
          { sku: null, unit: 'kg', sizeLabel: null, isActive: false, offers: [offer('o1', 500000, 0, vendor('x', 'SUSPENDED'), 'PAUSED')] },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ isDiscontinued: true, price: null, offerId: null });
  });

  it('marks inactive products as discontinued and not purchasable', async () => {
    prisma.product.findFirst.mockResolvedValue(
      productRow({
        status: 'INACTIVE',
        variants: [
          { sku: null, unit: 'kg', sizeLabel: null, isActive: false, offers: [offer('o1', 1850000, 0, vendor('a'), 'OUT_OF_STOCK')] },
        ],
      }),
    );

    const result = await service.findByIdOrSlug('p1');

    expect(result).toMatchObject({ isDiscontinued: true, inStock: false, stock: 0, offerId: null, price: 1850000 });
  });

  it('summarises published reviews from the database', async () => {
    prisma.product.findFirst.mockResolvedValue(productRow());
    prisma.review.groupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 3 } },
      { rating: 4, _count: { _all: 1 } },
    ]);
    prisma.review.findMany.mockResolvedValue([
      {
        id: 'r1',
        rating: 5,
        content: 'Tôm còn sống khoẻ',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        isAnonymous: false,
        user: { fullName: 'Nguyễn A' },
        images: [{ imageUrl: 'https://res.cloudinary.com/x/a.jpg' }],
      },
      {
        id: 'r2',
        rating: 4,
        content: 'Giao nhanh',
        createdAt: new Date('2026-09-30T00:00:00Z'),
        isAnonymous: true,
        user: { fullName: 'Trần Minh Quân' },
        images: [],
      },
    ]);

    const { reviewsSummary } = await service.findByIdOrSlug('p1');

    expect(reviewsSummary).toEqual({
      ratingAverage: 4.8,
      reviewCount: 4,
      ratingBreakdown: { 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 },
      reviews: [
        {
          id: 'r1',
          authorName: 'Nguyễn A',
          rating: 5,
          content: 'Tôm còn sống khoẻ',
          imageUrls: ['https://res.cloudinary.com/x/a.jpg'],
          createdAt: '2026-10-01T00:00:00.000Z',
        },
        // Anonymous reviews never expose the reviewer's name.
        {
          id: 'r2',
          authorName: 't***n',
          rating: 4,
          content: 'Giao nhanh',
          imageUrls: [],
          createdAt: '2026-09-30T00:00:00.000Z',
        },
      ],
    });
    expect(prisma.review.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: 'p1', status: 'PUBLISHED' } }),
    );
  });
});
