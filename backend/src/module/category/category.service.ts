import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CategoryListingDto,
  CategoryProductDto,
  CategorySummaryDto,
} from './dto/category.dto.js';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/** Offers customers can buy: active, from an approved (ACTIVE) vendor. */
export const SELLABLE_OFFER_WHERE = {
  status: 'ACTIVE',
  vendor: { status: 'ACTIVE' },
} as const;

/** Products customers can see: active, with at least one sellable offer. */
export const SELLABLE_PRODUCT_WHERE = {
  status: 'ACTIVE',
  variants: {
    some: { isActive: true, offers: { some: SELLABLE_OFFER_WHERE } },
  },
} as const;

/** Clamp to an integer in [min, max]; NaN and other non-finite input fall back. */
function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(min, Math.floor(value)), max);
}

export interface ActiveCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
}

/** How many species names to show as examples on a category card. */
const CATEGORY_EXAMPLE_LIMIT = 3;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active categories visible to customers, with the number of products
   * currently for sale (including products in their direct subcategories).
   */
  async listCategories(): Promise<CategorySummaryDto[]> {
    const categories = await this.findVisibleCategories();

    const products = await this.prisma.product.findMany({
      where: SELLABLE_PRODUCT_WHERE,
      select: {
        id: true,
        name: true,
        species: { select: { commonName: true } },
        categories: { select: { categoryId: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return categories.map((category) => {
      const categoryIds = this.withChildIds(category, categories);
      const categoryProducts = products.filter((product) =>
        product.categories.some((pc) => categoryIds.includes(pc.categoryId)),
      );
      // Examples come from products actually for sale in the category: the
      // species name, or the product name when no species is linked.
      const examples = [
        ...new Set(
          categoryProducts.map((product) => product.species?.commonName ?? product.name),
        ),
      ].slice(0, CATEGORY_EXAMPLE_LIMIT);

      return this.toSummary(category, categoryProducts.length, examples);
    });
  }

  /**
   * Products for sale in one active category, newest featured first.
   * Unknown or inactive categories are reported as not found.
   */
  async getCategoryListing(
    slug: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<CategoryListingDto> {
    const categories = await this.findVisibleCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại hoặc đã ngừng hiển thị.');
    }

    const safeLimit = clampInt(limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const where = {
      ...SELLABLE_PRODUCT_WHERE,
      categories: {
        some: { categoryId: { in: this.withChildIds(category, categories) } },
      },
    };

    const totalItems = await this.prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
    const safePage = clampInt(page, 1, totalPages, 1);

    const products = await this.prisma.product.findMany({
      where,
      include: {
        species: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          include: {
            offers: {
              where: SELLABLE_OFFER_WHERE,
              include: { vendor: { select: { name: true, slug: true } } },
            },
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      category: this.toSummary(category, totalItems),
      products: products
        .map((product) => this.toProduct(product))
        .filter((product): product is CategoryProductDto => product !== null),
      pagination: { page: safePage, limit: safeLimit, totalItems, totalPages },
    };
  }

  /**
   * Active categories whose parent (if any) is also active, in display order.
   */
  async findVisibleCategories(): Promise<ActiveCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const activeIds = new Set(categories.map((c) => c.id));
    return categories.filter((c) => !c.parentId || activeIds.has(c.parentId));
  }

  withChildIds(category: ActiveCategory, all: ActiveCategory[]): string[] {
    return [category.id, ...all.filter((c) => c.parentId === category.id).map((c) => c.id)];
  }

  private toSummary(
    category: ActiveCategory,
    productCount: number,
    examples: string[] = [],
  ): CategorySummaryDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      productCount,
      examples,
    };
  }

  private toProduct(product: {
    id: string;
    name: string;
    slug: string;
    isFeatured: boolean;
    species: { commonName: string } | null;
    images: Array<{ imageUrl: string; isPrimary: boolean }>;
    variants: Array<{
      unit: string;
      offers: Array<{ price: unknown; stock: unknown; vendor: { name: string; slug: string } }>;
    }>;
  }): CategoryProductDto | null {
    const offers = product.variants.flatMap((variant) =>
      variant.offers.map((offer) => ({ ...offer, unit: variant.unit })),
    );

    // An offer may be deactivated between the count and this query.
    if (offers.length === 0) {
      return null;
    }

    // The listing shows the cheapest sellable offer.
    const cheapest = offers.reduce((best, offer) =>
      Number(offer.price) < Number(best.price) ? offer : best,
    );
    const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      unit: cheapest.unit,
      price: Number(cheapest.price),
      inStock: offers.some((offer) => Number(offer.stock) > 0),
      isFeatured: product.isFeatured,
      speciesName: product.species?.commonName ?? null,
      imageUrl: primaryImage?.imageUrl ?? null,
      vendor: cheapest.vendor,
    };
  }
}
