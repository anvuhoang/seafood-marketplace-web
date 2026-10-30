import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './product.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ProductService', () => {
  let productService: ProductService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      product: {
        findFirst: vi.fn(),
      },
    };
    productService = new ProductService(prismaService as PrismaService);
  });

  it('should be defined', () => {
    expect(productService).toBeDefined();
  });

  it('should return product detail for prod-1 fallback', async () => {
    prismaService.product.findFirst.mockResolvedValue(null);

    const result = await productService.findByIdOrSlug('prod-1');
    expect(result).toBeDefined();
    expect(result.id).toBe('prod-1');
    expect(result.name).toContain('Tôm Sú Biển Tươi Sống');
    expect(result.price).toBe(420000);
    expect(result.stock).toBe(14);
    expect(result.inStock).toBe(true);
    expect(result.vendor.name).toBe('Vựa Thủy Sản Phú Quốc Xanh');
  });

  it('should identify discontinued product correctly', async () => {
    prismaService.product.findFirst.mockResolvedValue(null);

    const result = await productService.findByIdOrSlug('discontinued-sample');
    expect(result).toBeDefined();
    expect(result.isDiscontinued).toBe(true);
    expect(result.inStock).toBe(false);
    expect(result.stock).toBe(0);
  });
});
