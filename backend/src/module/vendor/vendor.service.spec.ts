import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VendorService } from './vendor.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';

const vendorRow = (status: string) => ({
  id: 'vendor-1',
  name: 'Vựa Thủy Sản Phú Quốc Xanh',
  slug: 'vua-thuy-san-phu-quoc-xanh',
  description: 'Mô tả vựa',
  logoUrl: null,
  coverUrl: null,
  phone: '0908123456',
  email: 'vua@phuquocxanh.vn',
  province: 'Kiên Giang',
  district: 'Phú Quốc',
  ward: null,
  streetAddress: '12 Bến Cảng',
  status,
  ratingAverage: { toString: () => '4.90' },
  ratingCount: 342,
  createdAt: new Date('2023-11-01T00:00:00.000Z'),
});

const offerRow = (
  productId: string,
  price: number,
  stock: number,
  categorySlug: string,
  id = `offer-${productId}-${price}`,
) => ({
  id,
  price,
  stock,
  variant: {
    unit: 'kg',
    product: {
      id: productId,
      name: `Product ${productId}`,
      slug: `product-${productId}`,
      isFeatured: false,
      species: { commonName: 'Tôm sú' },
      images: [
        { imageUrl: 'https://img/secondary.jpg', isPrimary: false },
        { imageUrl: 'https://img/primary.jpg', isPrimary: true },
      ],
      categories: [
        {
          category: {
            id: `cat-${categorySlug}`,
            name: categorySlug,
            slug: categorySlug,
            isActive: true,
          },
        },
      ],
    },
  },
});

describe('VendorService', () => {
  let vendorService: VendorService;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      vendor: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      vendorOffer: {
        findMany: vi.fn(),
      },
      vendorFollow: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    vendorService = new VendorService(prismaService as PrismaService, {} as CloudinaryService);
  });

  it('lists only ACTIVE vendors with distinct product counts', async () => {
    prismaService.vendor.findMany.mockResolvedValue([
      vendorRow('ACTIVE'),
      { ...vendorRow('ACTIVE'), id: 'vendor-2', slug: 'vendor-2' },
    ]);
    prismaService.vendorOffer.findMany.mockResolvedValue([
      { vendorId: 'vendor-1', variant: { productId: 'p1' } },
      { vendorId: 'vendor-1', variant: { productId: 'p1' } },
      { vendorId: 'vendor-1', variant: { productId: 'p2' } },
    ]);

    const result = await vendorService.listActiveVendors();

    expect(prismaService.vendor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE' } }),
    );
    expect(result.map((v) => [v.slug, v.productCount])).toEqual([
      ['vua-thuy-san-phu-quoc-xanh', 2],
      ['vendor-2', 0],
    ]);
    expect(result[0].location).toBe('Phú Quốc, Kiên Giang');
  });

  it('throws NotFound when the slug does not match a vendor', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(null);

    await expect(vendorService.getStorefront('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])(
    'answers 404 for a %s vendor, exactly like an unknown slug',
    async (status) => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow(status));

      await expect(vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaService.vendorOffer.findMany).not.toHaveBeenCalled();
      expect(prismaService.vendorFollow.count).not.toHaveBeenCalled();
    },
  );

  it('builds the storefront from ACTIVE offers on active variants of published products only', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
    prismaService.vendorOffer.findMany.mockResolvedValue([]);

    await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh');

    // PAUSED, OUT_OF_STOCK and DISCONTINUED offers and DRAFT products never reach the storefront.
    expect(prismaService.vendorOffer.findMany.mock.calls[0][0].where).toEqual({
      vendorId: 'vendor-1',
      status: 'ACTIVE',
      variant: { isActive: true, product: { status: 'ACTIVE' } },
    });
  });

  it('includes the ward in the public address when the vendor has one', async () => {
    prismaService.vendor.findUnique.mockResolvedValue({ ...vendorRow('ACTIVE'), ward: 'Dương Đông' });
    prismaService.vendorOffer.findMany.mockResolvedValue([]);
    const result = await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh');
    expect(result.vendor.address).toBe('12 Bến Cảng, Dương Đông, Phú Quốc, Kiên Giang');
  });

  it('returns the public profile without the email address', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
    prismaService.vendorOffer.findMany.mockResolvedValue([]);

    const result = await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh');

    expect(result.vendor.ratingAverage).toBe(4.9);
    expect(result.vendor.address).toBe('12 Bến Cảng, Phú Quốc, Kiên Giang');
    expect(result.vendor.joinedAt).toBe('2023-11-01T00:00:00.000Z');
    expect(result.vendor).not.toHaveProperty('email');
  });

  it('queries only active offers of this vendor, on active products', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
    prismaService.vendorOffer.findMany.mockResolvedValue([]);

    await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh');

    expect(prismaService.vendorOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          vendorId: 'vendor-1',
          status: 'ACTIVE',
          variant: { isActive: true, product: { status: 'ACTIVE' } },
        },
      }),
    );
  });

  it('groups offers per product at the lowest price and sums stock', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
    prismaService.vendorOffer.findMany.mockResolvedValue([
      offerRow('p1', 500000, 4, 'tom'),
      offerRow('p1', 420000, 10, 'tom'),
      offerRow('p2', 300000, 0, 'cua'),
    ]);

    const result = await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh');

    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toMatchObject({
      id: 'p1',
      slug: 'product-p1',
      price: 420000,
      stock: 14,
      inStock: true,
      imageUrl: 'https://img/primary.jpg',
      speciesName: 'Tôm sú',
    });
    expect(result.products[1]).toMatchObject({ id: 'p2', inStock: false });
  });

  describe('the offer behind a card (what the cart adds)', () => {
    const storefront = async (...offers: ReturnType<typeof offerRow>[]) => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
      prismaService.vendorOffer.findMany.mockResolvedValue(offers);
      return (await vendorService.getStorefront('vua-thuy-san-phu-quoc-xanh')).products;
    };

    it('is the cheapest offer that is in stock, with its own price', async () => {
      const [card] = await storefront(
        offerRow('p1', 500000, 4, 'tom', 'dear'),
        offerRow('p1', 420000, 10, 'tom', 'cheap'),
      );
      expect(card).toMatchObject({ offerId: 'cheap', price: 420000 });
    });

    it('is not a cheaper offer that is sold out', async () => {
      const [card] = await storefront(
        offerRow('p1', 500000, 4, 'tom', 'in-stock'),
        offerRow('p1', 300000, 0, 'tom', 'sold-out'),
      );
      expect(card).toMatchObject({ offerId: 'in-stock', price: 500000, inStock: true });
    });

    it('moves to the first offer in stock when the first one is sold out', async () => {
      const [card] = await storefront(
        offerRow('p1', 300000, 0, 'tom', 'sold-out'),
        offerRow('p1', 500000, 4, 'tom', 'in-stock'),
      );
      expect(card).toMatchObject({ offerId: 'in-stock', price: 500000, inStock: true });
    });

    it('is the cheapest one when everything is sold out', async () => {
      const [card] = await storefront(
        offerRow('p1', 500000, 0, 'tom', 'a'),
        offerRow('p1', 300000, 0, 'tom', 'b'),
      );
      expect(card).toMatchObject({ price: 300000, inStock: false });
      expect(card.offerId).toBeDefined();
    });
  });

  it('builds categories with product counts and filters by category slug', async () => {
    prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
    prismaService.vendorOffer.findMany.mockResolvedValue([
      offerRow('p1', 420000, 10, 'tom'),
      offerRow('p2', 300000, 5, 'cua'),
      offerRow('p3', 100000, 5, 'tom'),
    ]);

    const result = await vendorService.getStorefront(
      'vua-thuy-san-phu-quoc-xanh',
      'tom',
    );

    expect(result.categories).toEqual([
      { id: 'cat-tom', name: 'tom', slug: 'tom', productCount: 2 },
      { id: 'cat-cua', name: 'cua', slug: 'cua', productCount: 1 },
    ]);
    expect(result.products.map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(result.productCount).toBe(3);
  });

  describe('following', () => {
    it('reports follow state and follower count', async () => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
      prismaService.vendorFollow.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaService.vendorFollow.count.mockResolvedValue(7);

      await expect(vendorService.getFollowState('vua-thuy-san-phu-quoc-xanh', 'u1')).resolves.toEqual({
        isFollowing: true,
        followerCount: 7,
      });
    });

    it('follows an active vendor with an upsert, so repeating it is harmless', async () => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
      prismaService.vendorFollow.findUnique.mockResolvedValue(null);

      const result = await vendorService.follow('vua-thuy-san-phu-quoc-xanh', 'u1');

      expect(prismaService.vendorFollow.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: { userId: 'u1', vendorId: 'vendor-1' } }),
      );
      expect(result.isFollowing).toBe(false);
    });

    it('refuses to follow a vendor that is not open yet', async () => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow('PENDING'));

      await expect(vendorService.follow('vua-thuy-san-phu-quoc-xanh', 'u1')).rejects.toThrow(BadRequestException);
      expect(prismaService.vendorFollow.upsert).not.toHaveBeenCalled();
    });

    it('unfollows without failing when the customer was not following', async () => {
      prismaService.vendor.findUnique.mockResolvedValue(vendorRow('ACTIVE'));
      prismaService.vendorFollow.deleteMany.mockResolvedValue({ count: 0 });

      await expect(vendorService.unfollow('vua-thuy-san-phu-quoc-xanh', 'u1')).resolves.toMatchObject({ isFollowing: false });
      expect(prismaService.vendorFollow.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', vendorId: 'vendor-1' } });
    });

    it('lists followed vendors with the same card data as the directory', async () => {
      prismaService.vendorFollow.findMany.mockResolvedValue([{ vendor: vendorRow('ACTIVE') }]);
      prismaService.vendorOffer.findMany.mockResolvedValue([{ vendorId: 'vendor-1', variant: { productId: 'p1' } }]);

      const result = await vendorService.listFollowedVendors('u1');

      expect(result.map((v) => [v.slug, v.productCount])).toEqual([['vua-thuy-san-phu-quoc-xanh', 1]]);
    });
  });
});
