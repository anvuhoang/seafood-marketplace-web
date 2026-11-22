import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CategoryService, MAX_PAGE_SIZE } from './category.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const category = (id: string, slug: string, parentId: string | null = null) => ({
  id,
  name: slug,
  slug,
  imageUrl: `https://img/${slug}.jpg`,
  parentId,
});

const productRow = (id: string, offers: Array<{ price: number; stock: number; vendor: string }>) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  isFeatured: false,
  species: { commonName: 'Tôm sú' },
  images: [
    { imageUrl: 'https://img/second.jpg', isPrimary: false },
    { imageUrl: 'https://img/primary.jpg', isPrimary: true },
  ],
  variants: [
    {
      unit: 'kg',
      offers: offers.map((o) => ({
        price: o.price,
        stock: o.stock,
        vendor: { name: o.vendor, slug: o.vendor },
      })),
    },
  ],
});

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: { findMany: vi.fn() },
      product: { findMany: vi.fn(), count: vi.fn() },
    };
    service = new CategoryService(prisma as PrismaService);
  });

  it('only queries active categories and hides children of inactive parents', async () => {
    // "orphan" belongs to a parent that is not in the active list.
    prisma.category.findMany.mockResolvedValue([
      category('c1', 'tom-song'),
      category('c2', 'orphan', 'inactive-parent'),
    ]);
    prisma.product.findMany.mockResolvedValue([]);

    const result = await service.listCategories();

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(result.map((c) => c.slug)).toEqual(['tom-song']);
  });

  it('counts sellable products including direct subcategories', async () => {
    prisma.category.findMany.mockResolvedValue([
      category('parent', 'hai-san'),
      category('child', 'tom-hum', 'parent'),
      category('empty', 'ngheu-so-oc'),
    ]);
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', categories: [{ categoryId: 'parent' }] },
      { id: 'p2', categories: [{ categoryId: 'child' }] },
      { id: 'p3', categories: [{ categoryId: 'parent' }, { categoryId: 'child' }] },
    ]);

    const result = await service.listCategories();
    const counts = Object.fromEntries(result.map((c) => [c.slug, c.productCount]));

    expect(counts).toEqual({ 'hai-san': 3, 'tom-hum': 2, 'ngheu-so-oc': 0 });
  });

  it('lists up to three distinct species names as examples', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.findMany.mockResolvedValue(
      ['Tôm sú', 'Tôm sú', 'Tôm hùm', 'Tôm càng', 'Tôm thẻ'].map((name, i) => ({
        id: `p${i}`,
        species: { commonName: name },
        categories: [{ categoryId: 'c1' }],
      })),
    );

    const [result] = await service.listCategories();

    expect(result.examples).toEqual(['Tôm sú', 'Tôm hùm', 'Tôm càng']);
    expect(result.productCount).toBe(5);
  });

  it('falls back to the product name when no species is linked', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'cua-ghe')]);
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Cua Gạch Son', species: null, categories: [{ categoryId: 'c1' }] },
    ]);

    const [result] = await service.listCategories();

    expect(result.examples).toEqual(['Cua Gạch Son']);
  });

  it('only counts products with an active offer from an ACTIVE vendor', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.findMany.mockResolvedValue([]);

    await service.listCategories();

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ACTIVE',
          variants: {
            some: {
              isActive: true,
              offers: { some: { status: 'ACTIVE', vendor: { status: 'ACTIVE' } } },
            },
          },
        },
      }),
    );
  });

  it('throws NotFound for an unknown or inactive category', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);

    await expect(service.getCategoryListing('inactive-or-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('lists products with the cheapest offer, primary image and pagination', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([
      productRow('p1', [
        { price: 500000, stock: 0, vendor: 'vua-a' },
        { price: 420000, stock: 5, vendor: 'vua-b' },
      ]),
    ]);

    const result = await service.getCategoryListing('tom-song');

    expect(result.category).toMatchObject({ slug: 'tom-song', productCount: 1 });
    expect(result.products).toEqual([
      expect.objectContaining({
        id: 'p1',
        price: 420000,
        unit: 'kg',
        inStock: true,
        imageUrl: 'https://img/primary.jpg',
        vendor: { name: 'vua-b', slug: 'vua-b' },
      }),
    ]);
    expect(result.pagination).toEqual({ page: 1, limit: 12, totalItems: 1, totalPages: 1 });
  });

  it('clamps page and limit to valid ranges', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.count.mockResolvedValue(30);
    prisma.product.findMany.mockResolvedValue([]);

    const result = await service.getCategoryListing('tom-song', 99, 1000);

    expect(result.pagination).toEqual({
      page: 1,
      limit: MAX_PAGE_SIZE,
      totalItems: 30,
      totalPages: 1,
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: MAX_PAGE_SIZE }),
    );
  });

  it('falls back to defaults for non-numeric page and limit', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.count.mockResolvedValue(30);
    prisma.product.findMany.mockResolvedValue([]);

    const result = await service.getCategoryListing('tom-song', Number.NaN, Number.NaN);

    expect(result.pagination).toMatchObject({ page: 1, limit: 12 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 12 }),
    );
  });

  it('skips a product whose offers disappeared between count and query', async () => {
    prisma.category.findMany.mockResolvedValue([category('c1', 'tom-song')]);
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([productRow('p1', [])]);

    const result = await service.getCategoryListing('tom-song');

    expect(result.products).toEqual([]);
  });
});
