import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  VendorStorefrontCategoryDto,
  VendorStorefrontDto,
  VendorStorefrontProductDto,
  VendorStorefrontStatus,
  VendorSummaryDto,
} from './dto/vendor-storefront.dto.js';

const SELLABLE_OFFER_WHERE = {
  status: 'ACTIVE',
  variant: {
    isActive: true,
    product: { status: 'ACTIVE' },
  },
} as const;

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Approved vendors for public discovery, highest rated first.
   */
  async listActiveVendors(): Promise<VendorSummaryDto[]> {
    const vendors = await this.prisma.vendor.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }],
    });

    if (vendors.length === 0) {
      return [];
    }

    const offers = await this.prisma.vendorOffer.findMany({
      where: {
        ...SELLABLE_OFFER_WHERE,
        vendorId: { in: vendors.map((vendor) => vendor.id) },
      },
      select: { vendorId: true, variant: { select: { productId: true } } },
    });

    const productIdsByVendor = new Map<string, Set<string>>();
    for (const offer of offers) {
      const productIds = productIdsByVendor.get(offer.vendorId) ?? new Set<string>();
      productIds.add(offer.variant.productId);
      productIdsByVendor.set(offer.vendorId, productIds);
    }

    return vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      logoUrl: vendor.logoUrl,
      coverUrl: vendor.coverUrl,
      location: `${vendor.district}, ${vendor.province}`,
      ratingAverage: Number(vendor.ratingAverage),
      ratingCount: vendor.ratingCount,
      productCount: productIdsByVendor.get(vendor.id)?.size ?? 0,
    }));
  }

  /**
   * Public storefront for a vendor. Only ACTIVE vendors expose their products;
   * other statuses return the profile with an empty catalogue so the UI can
   * explain why the storefront is unavailable.
   */
  async getStorefront(
    slug: string,
    categorySlug?: string,
  ): Promise<VendorStorefrontDto> {
    const vendor = await this.prisma.vendor.findUnique({ where: { slug } });

    if (!vendor) {
      throw new NotFoundException('Gian hàng không tồn tại');
    }

    const status = vendor.status as VendorStorefrontStatus;
    const isActive = status === 'ACTIVE';

    const storefront: VendorStorefrontDto = {
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        description: vendor.description,
        logoUrl: vendor.logoUrl,
        coverUrl: vendor.coverUrl,
        phone: vendor.phone,
        address: `${vendor.streetAddress}, ${vendor.district}, ${vendor.province}`,
        province: vendor.province,
        district: vendor.district,
        ratingAverage: Number(vendor.ratingAverage),
        ratingCount: vendor.ratingCount,
        joinedAt: vendor.createdAt.toISOString(),
      },
      status,
      isActive,
      productCount: 0,
      categories: [],
      products: [],
    };

    if (!isActive) {
      return storefront;
    }

    const products = await this.findActiveProducts(vendor.id);
    storefront.productCount = products.length;
    storefront.categories = this.buildCategories(products);
    storefront.products = categorySlug
      ? products.filter((product) =>
          product.categories.some((category) => category.slug === categorySlug),
        )
      : products;

    return storefront;
  }

  /**
   * Products the vendor currently sells: active offers on active variants of
   * active products. One entry per product, priced at the lowest active offer.
   */
  private async findActiveProducts(
    vendorId: string,
  ): Promise<VendorStorefrontProductDto[]> {
    const offers = await this.prisma.vendorOffer.findMany({
      where: { vendorId, ...SELLABLE_OFFER_WHERE },
      include: {
        variant: {
          include: {
            product: {
              include: {
                species: true,
                categories: {
                  include: { category: true },
                  orderBy: { category: { sortOrder: 'asc' } },
                },
                images: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byProductId = new Map<string, VendorStorefrontProductDto>();

    for (const offer of offers) {
      const { product, unit } = offer.variant;
      const price = Number(offer.price);
      const stock = Number(offer.stock);
      const existing = byProductId.get(product.id);

      if (existing) {
        existing.price = Math.min(existing.price, price);
        existing.stock += stock;
        existing.inStock = existing.stock > 0;
        continue;
      }

      const primaryImage =
        product.images.find((image) => image.isPrimary) ?? product.images[0];

      byProductId.set(product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        unit,
        price,
        stock,
        inStock: stock > 0,
        isFeatured: product.isFeatured,
        speciesName: product.species?.commonName ?? null,
        imageUrl: primaryImage?.imageUrl ?? null,
        categories: product.categories
          .filter((productCategory) => productCategory.category.isActive)
          .map((productCategory) => ({
            id: productCategory.category.id,
            name: productCategory.category.name,
            slug: productCategory.category.slug,
          })),
      });
    }

    return [...byProductId.values()];
  }

  private buildCategories(
    products: VendorStorefrontProductDto[],
  ): VendorStorefrontCategoryDto[] {
    const counts = new Map<string, VendorStorefrontCategoryDto>();

    for (const product of products) {
      for (const category of product.categories) {
        const existing = counts.get(category.slug);

        if (existing) {
          existing.productCount += 1;
        } else {
          counts.set(category.slug, { ...category, productCount: 1 });
        }
      }
    }

    return [...counts.values()];
  }
}
