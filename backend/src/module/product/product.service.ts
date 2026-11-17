import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ProductDetailDto } from './dto/product-detail.dto.js';
import { anonymizeName } from '../review/review.service.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How many recent reviews the detail page shows. */
const RECENT_REVIEW_LIMIT = 5;

/**
 * Preparation choices offered at checkout. They are the same for every
 * product until vendors can configure their own.
 */
const PREPARATION_OPTIONS: ProductDetailDto['preparationOptions'] = [
  { id: 'prep-live', label: 'Bơi sống (bao oxy)', description: 'Miễn phí đóng oxy', isDefault: true },
  { id: 'prep-ice', label: 'Ướp đá giữ lạnh', description: 'Lấy đá bảo quản', isDefault: false },
  { id: 'prep-vacuum', label: 'Hút chân không', description: 'Cấp đông -18°C', isDefault: false },
];

interface OfferRow {
  id: string;
  price: unknown;
  stock: unknown;
  status: string;
  vendor: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    streetAddress: string;
    district: string;
    province: string;
    status: string;
    ratingAverage: unknown;
    ratingCount: number;
  };
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Product detail by UUID or slug. Draft products and unknown identifiers
   * are not found; inactive products are returned as discontinued.
   */
  async findByIdOrSlug(identifier: string): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: {
        // Only query the UUID column with UUID values; a slug on `id` makes Prisma throw.
        ...(UUID_PATTERN.test(identifier) ? { id: identifier } : { slug: identifier }),
        status: { not: 'DRAFT' },
      },
      include: {
        species: true,
        categories: { include: { category: { include: { parent: { select: { isActive: true } } } } } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          include: {
            offers: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    logoUrl: true,
                    coverUrl: true,
                    streetAddress: true,
                    district: true,
                    province: true,
                    status: true,
                    ratingAverage: true,
                    ratingCount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc chưa được mở bán.');
    }

    const isDiscontinued = product.status !== 'ACTIVE';
    const offers = product.variants.flatMap((variant) =>
      variant.offers.map((offer) => ({ offer: offer as OfferRow, variant })),
    );
    const sellable = offers.filter(
      ({ offer, variant }) =>
        !isDiscontinued &&
        variant.isActive &&
        offer.status === 'ACTIVE' &&
        offer.vendor.status === 'ACTIVE',
    );
    const inStock = sellable.filter(({ offer }) => Number(offer.stock) > 0);

    // Offers of pending, rejected or suspended vendors are never public, not even their price.
    const fromActiveVendors = offers.filter(({ offer }) => offer.vendor.status === 'ACTIVE');

    // Same rule as the listing: cheapest in-stock sellable offer, then any
    // sellable offer, then any offer of an active vendor (for discontinued products).
    const pool = inStock.length > 0 ? inStock : sellable.length > 0 ? sellable : fromActiveVendors;
    const chosen = pool.reduce<(typeof offers)[number] | undefined>(
      (best, entry) =>
        !best || Number(entry.offer.price) < Number(best.offer.price) ? entry : best,
      undefined,
    );

    // Pending, rejected or suspended vendors are never presented as the seller.
    const vendor = chosen?.offer.vendor.status === 'ACTIVE' ? chosen.offer.vendor : undefined;
    const stock = inStock.length > 0 && chosen ? Number(chosen.offer.stock) : 0;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      status: product.status,
      isFeatured: product.isFeatured,
      sku: chosen?.variant.sku ?? null,
      unit: chosen?.variant.unit ?? 'kg',
      sizeLabel: chosen?.variant.sizeLabel ?? null,
      // null, never 0: no approved vendor offers it, so there is no price.
      price: chosen ? Number(chosen.offer.price) : null,
      originalPrice: null,
      discountPercent: null,
      stock,
      inStock: stock > 0,
      isDiscontinued,
      offerId: sellable.length > 0 && chosen ? chosen.offer.id : null,
      species: product.species
        ? {
            id: product.species.id,
            commonName: product.species.commonName,
            scientificName: product.species.scientificName,
            slug: product.species.slug,
            description: product.species.description,
          }
        : null,
      categories: product.categories
        // A category is hidden from customers when it, or its parent, is inactive.
        .filter((pc) => pc.category.isActive && (pc.category.parent?.isActive ?? true))
        .map((pc) => ({ id: pc.category.id, name: pc.category.name, slug: pc.category.slug })),
      images: product.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
      vendor: vendor
        ? {
            id: vendor.id,
            name: vendor.name,
            slug: vendor.slug,
            description: vendor.description,
            logoUrl: vendor.logoUrl,
            coverUrl: vendor.coverUrl,
            address: `${vendor.streetAddress}, ${vendor.district}, ${vendor.province}`,
            province: vendor.province,
            district: vendor.district,
            ratingAverage: Number(vendor.ratingAverage),
            ratingCount: vendor.ratingCount,
            verified: vendor.status === 'ACTIVE',
          }
        : null,
      specifications: {
        commonName: product.species?.commonName ?? null,
        scientificName: product.species?.scientificName ?? null,
        origin: vendor ? `${vendor.district}, ${vendor.province}` : null,
      },
      reviewsSummary: await this.summarizeReviews(product.id),
      preparationOptions: PREPARATION_OPTIONS,
    };
  }

  private async summarizeReviews(productId: string): Promise<ProductDetailDto['reviewsSummary']> {
    const where = { productId, status: 'PUBLISHED' as const };

    const [grouped, recent] = await Promise.all([
      this.prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { fullName: true } },
          images: { orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_REVIEW_LIMIT,
      }),
    ]);

    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let reviewCount = 0;
    let ratingTotal = 0;
    for (const row of grouped) {
      ratingBreakdown[row.rating] = row._count._all;
      reviewCount += row._count._all;
      ratingTotal += row.rating * row._count._all;
    }

    return {
      ratingAverage: reviewCount > 0 ? Math.round((ratingTotal / reviewCount) * 10) / 10 : 0,
      reviewCount,
      ratingBreakdown,
      reviews: recent.map((review) => ({
        id: review.id,
        authorName: review.isAnonymous ? anonymizeName(review.user.fullName) : review.user.fullName,
        rating: review.rating,
        content: review.content,
        imageUrls: review.images.map((image) => image.imageUrl),
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }
}
