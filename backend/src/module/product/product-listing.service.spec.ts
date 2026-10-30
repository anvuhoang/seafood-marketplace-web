import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductListingService, slugify } from './product-listing.service.js';
import { CategoryService } from '../category/category.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const categories = [
  { id: 'c-tom', name: 'Tôm', slug: 'tom-song', description: null, imageUrl: null, parentId: null },
  { id: 'c-cua', name: 'Cua', slug: 'cua-ghe', description: null, imageUrl: null, parentId: null },
];

const vendors = {
  pq: { name: 'Vựa Phú Quốc', slug: 'vua-pq', district: 'Phú Quốc', province: 'Kiên Giang' },
  cm: { name: 'Vựa Cà Mau', slug: 'vua-cm', district: 'Năm Căn', province: 'Cà Mau' },
};

const product = (
  id: string,
  categoryId: string,
  offers: Array<{ price: number; stock: number; vendor: (typeof vendors)['pq'] }>,
  extra: Partial<{ isFeatured: boolean; createdAt: Date }> = {},
) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: null,
  isFeatured: extra.isFeatured ?? false,
  createdAt: extra.createdAt ?? new Date('2026-01-01'),
  species: { commonName: `Species ${id}` },
  images: [{ imageUrl: `https://img/${id}.jpg`, isPrimary: true }],
  categories: [{ categoryId }],
  variants: [{ unit: 'kg', offers }],
});

const PRODUCTS = [
  product('tom-pq', 'c-tom', [{ price: 420000, stock: 10, vendor: vendors.pq }], {
    isFeatured: true,
  }),
  product('tom-cm', 'c-tom', [{ price: 300000, stock: 0, vendor: vendors.cm }], {
    createdAt: new Date('2026-03-01'),
  }),
  product('cua-both', 'c-cua', [
    { price: 600000, stock: 5, vendor: vendors.pq },
    { price: 550000, stock: 5, vendor: vendors.cm },
  ]),
];

describe('ProductListingService', () => {
  let service: ProductListingService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      product: { findMany: vi.fn().mockResolvedValue(PRODUCTS) },
    };
    service = new ProductListingService(
      prisma as PrismaService,
      new CategoryService(prisma as PrismaService),
    );
  });

  it('slugifies Vietnamese district names', () => {
    expect(slugify('Phú Quốc')).toBe('phu-quoc');
    expect(slugify('Đồng Tháp')).toBe('dong-thap');
  });

  it('lists every sellable product with totals and featured first', async () => {
    const result = await service.listProducts({});

    expect(result.totalProducts).toBe(3);
    expect(result.pagination).toEqual({ page: 1, limit: 12, totalItems: 3, totalPages: 1 });
    expect(result.items[0].id).toBe('tom-pq');
  });

  it('filters by category and computes category facets without their own filter', async () => {
    const result = await service.listProducts({ category: 'tom-song' });

    expect(result.items.map((i) => i.id).sort()).toEqual(['tom-cm', 'tom-pq']);
    // Facet counts ignore the category filter itself, so other options stay usable.
    expect(result.facets.categories).toEqual([
      { value: 'tom-song', label: 'Tôm', count: 2 },
      { value: 'cua-ghe', label: 'Cua', count: 1 },
    ]);
  });

  it('filters by region and shows the price of the matching offer', async () => {
    const result = await service.listProducts({ region: 'phu-quoc' });

    expect(result.items.map((i) => [i.id, i.price])).toEqual([
      ['tom-pq', 420000],
      ['cua-both', 600000],
    ]);
    expect(result.items[1].vendor.slug).toBe('vua-pq');
  });

  it('applies vendor, price range and stock filters together', async () => {
    const result = await service.listProducts({
      vendor: 'vua-cm',
      minPrice: 200000,
      maxPrice: 400000,
      inStock: 'true',
    });

    // tom-cm matches vendor and price but is out of stock.
    expect(result.items).toEqual([]);
  });

  it('counts region and vendor facets with the other filters applied', async () => {
    const result = await service.listProducts({ category: 'cua-ghe' });

    expect(result.facets.regions).toEqual([
      { value: 'nam-can', label: 'Năm Căn (Cà Mau)', count: 1 },
      { value: 'phu-quoc', label: 'Phú Quốc (Kiên Giang)', count: 1 },
    ]);
    expect(result.facets.vendors.map((v) => [v.value, v.count])).toEqual([
      ['vua-cm', 1],
      ['vua-pq', 1],
    ]);
  });

  it('prefers the cheapest in-stock offer over a cheaper sold-out one', async () => {
    prisma.product.findMany.mockResolvedValue([
      product('mixed', 'c-tom', [
        { price: 300000, stock: 0, vendor: vendors.cm },
        { price: 450000, stock: 8, vendor: vendors.pq },
      ]),
    ]);

    const [item] = (await service.listProducts({})).items;

    expect(item).toMatchObject({ price: 450000, stock: 8, inStock: true });
    expect(item.vendor.slug).toBe('vua-pq');
  });

  it('sorts by price and newest', async () => {
    const asc = await service.listProducts({ sort: 'price-asc' });
    expect(asc.items.map((i) => i.price)).toEqual([300000, 420000, 550000]);

    const newest = await service.listProducts({ sort: 'newest' });
    expect(newest.items[0].id).toBe('tom-cm');
  });

  it('paginates and clamps a page past the end', async () => {
    const result = await service.listProducts({ limit: 2, page: 9 });

    expect(result.pagination).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    expect(result.items).toHaveLength(1);
  });

  it('summarises regions by products, vendors and top categories', async () => {
    const regions = await service.listRegions();

    expect(regions).toEqual([
      {
        key: 'nam-can',
        district: 'Năm Căn',
        province: 'Cà Mau',
        productCount: 2,
        vendorCount: 1,
        topCategories: ['Cua', 'Tôm'],
      },
      {
        key: 'phu-quoc',
        district: 'Phú Quốc',
        province: 'Kiên Giang',
        productCount: 2,
        vendorCount: 1,
        topCategories: ['Cua', 'Tôm'],
      },
    ]);
  });
});
