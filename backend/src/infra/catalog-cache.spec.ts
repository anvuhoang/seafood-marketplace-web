import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real package cannot be loaded in this test pool; the cache only needs its name here.
vi.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import type { ConfigService } from '@nestjs/config';
import { CategoryService } from '../module/category/category.service.js';
import { ProductListingService } from '../module/product/product-listing.service.js';
import { AdminCategoryService } from '../module/admin/admin-category.service.js';
import { CacheService } from './cache.service.js';
import { CATALOG_PREFIX, InvalidatesCatalog } from './catalog-cache.js';
import { MemoryKeyValueStore } from './kv-store.js';

const categories = [
  { id: 'c-tom', name: 'Tôm', slug: 'tom-song', description: null, imageUrl: null, parentId: null },
  { id: 'c-cua', name: 'Cua', slug: 'cua-ghe', description: null, imageUrl: null, parentId: null },
];
const vendor = { name: 'Vựa Phú Quốc', slug: 'vua-pq', district: 'Phú Quốc', province: 'Kiên Giang' };
const product = (id: string, categoryId: string, price: number, createdAt: string) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: null,
  isFeatured: false,
  createdAt: new Date(createdAt),
  species: { commonName: `Species ${id}` },
  images: [{ imageUrl: `https://img/${id}.jpg`, isPrimary: true }],
  categories: [{ categoryId }],
  variants: [{ unit: 'kg', offers: [{ id: `o-${id}`, price, stock: 5, vendor }] }],
});

const cacheOf = (store = new MemoryKeyValueStore()) =>
  new CacheService(store, { get: () => ({ enabled: true, catalogTtlSeconds: 30 }) } as unknown as ConfigService);

describe('the catalogue cache', () => {
  let prisma: { category: { findMany: ReturnType<typeof vi.fn> }; product: { findMany: ReturnType<typeof vi.fn> } };
  let cache: CacheService;
  let service: ProductListingService;

  beforeEach(() => {
    prisma = {
      category: { findMany: vi.fn().mockResolvedValue(categories) },
      product: {
        findMany: vi.fn().mockResolvedValue([product('tom', 'c-tom', 420000, '2026-01-01'), product('cua', 'c-cua', 600000, '2026-03-01')]),
      },
    };
    cache = cacheOf();
    service = new ProductListingService(prisma as never, new CategoryService(prisma as never, cache), cache);
  });

  it('asks the database once for many listings', async () => {
    await service.listProducts({});
    await service.listProducts({ category: 'tom-song' });
    await service.listProducts({ sort: 'price-desc' });
    await service.listRegions();

    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(cache.stats().hits).toBeGreaterThan(0);
  });

  it('answers the same from the cache as from the database (dates and category sets survive)', async () => {
    const fresh = await service.listProducts({ category: 'cua-ghe', sort: 'newest' });
    const cached = await service.listProducts({ category: 'cua-ghe', sort: 'newest' });
    const withoutCache = await new ProductListingService(prisma as never, new CategoryService(prisma as never)).listProducts({
      category: 'cua-ghe',
      sort: 'newest',
    });

    expect(cached).toEqual(fresh);
    expect(cached).toEqual(withoutCache);
    expect(cached.items.map((item) => item.id)).toEqual(['cua']);

    const newest = await service.listProducts({ sort: 'newest' });
    expect(newest.items.map((item) => item.id)).toEqual(['cua', 'tom']);
  });

  it('reads the database again after the catalogue changes', async () => {
    await service.listProducts({});
    prisma.product.findMany.mockResolvedValue([product('tom', 'c-tom', 999000, '2026-01-01')]);

    expect((await service.listProducts({})).totalProducts).toBe(2);
    await cache.invalidate(CATALOG_PREFIX);
    const after = await service.listProducts({});
    expect(after.totalProducts).toBe(1);
    expect(after.items[0].price).toBe(999000);
  });

  it('shares the cache between two API processes through the store', async () => {
    const store = new MemoryKeyValueStore();
    const first = cacheOf(store);
    const second = cacheOf(store);
    const one = new ProductListingService(prisma as never, new CategoryService(prisma as never, first), first);
    const two = new ProductListingService(prisma as never, new CategoryService(prisma as never, second), second);

    await one.listProducts({});
    await two.listProducts({});
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);

    await first.invalidate(CATALOG_PREFIX);
    await two.listProducts({});
    expect(prisma.product.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('@InvalidatesCatalog', () => {
  class Sample {
    constructor(readonly cache?: { invalidate: (prefix: string) => Promise<void> }) {}

    @InvalidatesCatalog()
    async save(value: number): Promise<number> {
      return value * 2;
    }

    @InvalidatesCatalog()
    async fail(): Promise<void> {
      throw new Error('could not save');
    }

    @InvalidatesCatalog()
    plain(): Promise<string> {
      return Promise.resolve('done');
    }
  }

  it('forgets the catalogue after the method succeeds, and returns what the method returned', async () => {
    const invalidate = vi.fn(async () => undefined);
    const sample = new Sample({ invalidate });

    expect(await sample.save(21)).toBe(42);
    expect(await sample.plain()).toBe('done');
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(CATALOG_PREFIX);
  });

  it('keeps the cache when the method fails, so nothing is thrown away for a change that did not happen', async () => {
    const invalidate = vi.fn(async () => undefined);
    await expect(new Sample({ invalidate }).fail()).rejects.toThrow('could not save');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('works without a cache', async () => {
    expect(await new Sample().save(2)).toBe(4);
  });

  it('is on the methods that change what the listing shows', () => {
    // A guard against someone adding a write method and forgetting the decorator: these must be wrapped.
    const wrapped = (method: unknown) => String(method).includes('invalidate');
    expect(wrapped(AdminCategoryService.prototype.create)).toBe(true);
    expect(wrapped(AdminCategoryService.prototype.update)).toBe(true);
    expect(wrapped(AdminCategoryService.prototype.remove)).toBe(true);
  });
});
