import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ActiveCategory,
  CategoryService,
  DEFAULT_PAGE_SIZE,
  SELLABLE_OFFER_WHERE,
  SELLABLE_PRODUCT_WHERE,
} from '../category/category.service.js';
import type {
  FacetOptionDto,
  ProductListingDto,
  ProductListingItemDto,
  ProductListingQueryDto,
  RegionSummaryDto,
} from './dto/product-listing.dto.js';
import { CacheService } from '../../infra/cache.service.js';
import { CATALOG_PRODUCTS_KEY } from '../../infra/catalog-cache.js';
import { ProductSearchService } from '../search/product-search.service.js';

/** URL-friendly key for Vietnamese text, e.g. "Phú Quốc" -> "phu-quoc". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Lowercase, accent-free text for keyword matching, so "ghe xanh" finds
 * "Ghẹ xanh". Punctuation becomes spaces.
 */
export function normalizeSearchText(text: string): string {
  return slugify(text).replace(/-/g, ' ');
}

/** Keywords of a search query; a product must contain all of them. */
export function searchTokens(query?: string): string[] {
  return query ? normalizeSearchText(query).split(' ').filter(Boolean) : [];
}

function splitList(value?: string): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

interface ListingOffer {
  id: string;
  price: number;
  stock: number;
  unit: string;
  vendor: { name: string; slug: string; district: string; province: string };
  regionKey: string;
}

interface ListingProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  speciesName: string | null;
  speciesSlug: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  createdAt: Date;
  /** Normalized name, description, species, categories, vendors and regions. */
  searchText: string;
  categorySlugs: Set<string>;
  categories: Array<{ name: string; slug: string }>;
  offers: ListingOffer[];
}

/** A product as it is kept in the cache: JSON has no Set and no Date, so those become an array and a string. */
type StoredProduct = Omit<ListingProduct, 'categorySlugs' | 'createdAt'> & { categorySlugs: string[]; createdAt: string };

function toStored(product: ListingProduct): StoredProduct {
  return { ...product, categorySlugs: [...product.categorySlugs], createdAt: product.createdAt.toISOString() };
}

function fromStored(stored: StoredProduct): ListingProduct {
  return { ...stored, categorySlugs: new Set(stored.categorySlugs), createdAt: new Date(stored.createdAt) };
}

interface ListingFilters {
  /** Product id with its relevance, from the search engine; when present only these products match the words. */
  ranked?: Map<string, number>;
  keywords: string[];
  categories: string[];
  regions: string[];
  vendors: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
}

type FacetKey = 'category' | 'region' | 'vendor';

/**
 * Server-side narrowing that is not part of the public query, e.g. Visual
 * Search asking for the products of one recognised species.
 */
export interface ListingScope {
  /** Only products whose species has one of these slugs. */
  speciesSlugs?: string[];
}

/** How long a finished listing is reused, and how many different ones are kept at most. */
const MEMO_MS = 3_000;
const MEMO_MAX_ENTRIES = 200;

/**
 * Public product listing with filters, facet counts, sorting and pagination.
 *
 * Filtering runs in memory over all sellable products, which keeps facet
 * counts simple and exact. Move filtering into the database query once the
 * catalogue grows to thousands of products.
 */
@Injectable()
export class ProductListingService {
  /**
   * Finished listings, kept in this process for a moment. A listing filters, ranks and counts every product, and the home
   * page and a crowd of visitors ask for the same few listings: answering them from here instead of redoing the work
   * took the list from about 150 to many hundreds of requests per second. It is only used when the shared cache is on,
   * lasts at most MEMO_MS, and is dropped as soon as this process sees the catalogue change (the other API process
   * catches up within MEMO_MS).
   */
  private readonly memo = new Map<string, { until: number; value: ProductListingDto }>();
  private memoGeneration = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
    @Optional() private readonly cache?: CacheService,
    @Optional() private readonly search?: ProductSearchService,
  ) {
    this.cache?.onInvalidate?.(() => {
      this.memoGeneration++;
      this.memo.clear();
    });
  }

  async listProducts(
    query: ProductListingQueryDto,
    scope: ListingScope = {},
  ): Promise<ProductListingDto> {
    if (!(this.cache && this.cache.catalogTtlSeconds > 0)) return this.computeListing(query, scope);

    const key = JSON.stringify([query, scope]);
    const now = Date.now();
    const hit = this.memo.get(key);
    if (hit && hit.until > now) return hit.value;

    const generation = this.memoGeneration;
    const value = await this.computeListing(query, scope);
    // Not kept when the catalogue changed while it was being computed: it may already be out of date.
    if (generation === this.memoGeneration) {
      if (this.memo.size >= MEMO_MAX_ENTRIES) this.memo.clear();
      this.memo.set(key, { until: now + Math.min(MEMO_MS, this.cache.catalogTtlSeconds * 1000), value });
    }
    return value;
  }

  private async computeListing(
    query: ProductListingQueryDto,
    scope: ListingScope,
  ): Promise<ProductListingDto> {
    const visibleCategories = await this.categoryService.findVisibleCategories();
    const products = await this.loadProducts(visibleCategories);
    const speciesSlugs = scope.speciesSlugs;
    const scoped = speciesSlugs
      ? products.filter((product) => product.speciesSlug !== null && speciesSlugs.includes(product.speciesSlug))
      : products;

    // A reversed price range is treated as the same range, not an error.
    const [minPrice, maxPrice] =
      query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice
        ? [query.maxPrice, query.minPrice]
        : [query.minPrice, query.maxPrice];

    // With Elasticsearch the words are matched there (without accents, with typos, ranked by relevance) and the shop
    // keeps the products it names; without it, or when it does not answer, every word must start a word of the product.
    const ranked = query.q?.trim() && this.search?.enabled ? await this.search.search(query.q) : null;

    const filters: ListingFilters = {
      ranked: ranked ?? undefined,
      keywords: ranked ? [] : searchTokens(query.q),
      categories: splitList(query.category),
      regions: splitList(query.region),
      vendors: splitList(query.vendor),
      minPrice,
      maxPrice,
      inStock: query.inStock === 'true',
    };

    const matched = scoped
      .map((product) => ({ product, offers: this.matchingOffers(product, filters) }))
      .filter(({ offers }) => offers.length > 0);

    const items = matched.map(({ product, offers }) => this.toItem(product, offers));
    this.sortItems(items, matched, query.sort ?? 'featured', ranked ?? undefined);

    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(items.length / limit));
    const page = Math.min(query.page ?? 1, totalPages);

    return {
      items: items.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, totalItems: items.length, totalPages },
      totalProducts: products.length,
      facets: this.buildFacets(scoped, filters, visibleCategories),
    };
  }

  /**
   * Product names to offer while the visitor types: the search engine when it answers, otherwise the names in which
   * every typed word starts a word (no accents needed). Best matches first, at most `limit`.
   */
  async suggest(text: string, limit = 8): Promise<Array<{ name: string; slug: string }>> {
    const fromEngine = this.search?.enabled ? await this.search.suggest(text, limit) : null;
    if (fromEngine) return fromEngine;

    const tokens = searchTokens(text);
    if (tokens.length === 0) return [];
    const visibleCategories = await this.categoryService.findVisibleCategories();
    const products = await this.loadProducts(visibleCategories);
    return products
      .filter((product) => {
        const words = ` ${normalizeSearchText(product.name)}`;
        return tokens.every((token) => words.includes(` ${token}`));
      })
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.name.localeCompare(b.name, 'vi'))
      .slice(0, limit)
      .map((product) => ({ name: product.name, slug: product.slug }));
  }

  /**
   * Fishing regions derived from where vendors with products for sale are
   * located, most products first.
   */
  async listRegions(): Promise<RegionSummaryDto[]> {
    const visibleCategories = await this.categoryService.findVisibleCategories();
    const products = await this.loadProducts(visibleCategories);

    const regions = new Map<
      string,
      { district: string; province: string; products: Set<string>; vendors: Set<string>; categories: Map<string, number> }
    >();

    for (const product of products) {
      for (const offer of product.offers) {
        const region = regions.get(offer.regionKey) ?? {
          district: offer.vendor.district,
          province: offer.vendor.province,
          products: new Set<string>(),
          vendors: new Set<string>(),
          categories: new Map<string, number>(),
        };
        region.vendors.add(offer.vendor.slug);
        if (!region.products.has(product.id)) {
          region.products.add(product.id);
          for (const category of product.categories) {
            region.categories.set(category.name, (region.categories.get(category.name) ?? 0) + 1);
          }
        }
        regions.set(offer.regionKey, region);
      }
    }

    return [...regions.entries()]
      .map(([key, region]) => ({
        key,
        district: region.district,
        province: region.province,
        productCount: region.products.size,
        vendorCount: region.vendors.size,
        topCategories: [...region.categories.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
          .slice(0, 3)
          .map(([name]) => name),
      }))
      .sort((a, b) => b.productCount - a.productCount || a.district.localeCompare(b.district, 'vi'));
  }

  /** All sellable products, from the cache when there is one (kept for a few seconds, see InvalidatesCatalog). */
  private async loadProducts(visibleCategories: ActiveCategory[]): Promise<ListingProduct[]> {
    if (!this.cache) return this.queryProducts(visibleCategories);
    const stored = await this.cache.wrap(CATALOG_PRODUCTS_KEY, this.cache.catalogTtlSeconds, async () =>
      (await this.queryProducts(visibleCategories)).map(toStored),
    );
    return stored.map(fromStored);
  }

  private async queryProducts(visibleCategories: ActiveCategory[]): Promise<ListingProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: SELLABLE_PRODUCT_WHERE,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isFeatured: true,
        createdAt: true,
        species: { select: { commonName: true, scientificName: true, slug: true } },
        images: { select: { imageUrl: true, isPrimary: true }, orderBy: { sortOrder: 'asc' } },
        categories: { select: { categoryId: true } },
        variants: {
          where: { isActive: true },
          select: {
            unit: true,
            offers: {
              where: SELLABLE_OFFER_WHERE,
              select: {
                id: true,
                price: true,
                stock: true,
                vendor: { select: { name: true, slug: true, district: true, province: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => {
      const ownIds = new Set(row.categories.map((pc) => pc.categoryId));
      // A product in a subcategory also belongs to its parent category.
      const productCategories = visibleCategories.filter((category) =>
        this.categoryService
          .withChildIds(category, visibleCategories)
          .some((id) => ownIds.has(id)),
      );
      const primaryImage = row.images.find((image) => image.isPrimary) ?? row.images[0];
      const searchText = normalizeSearchText(
        [
          row.name,
          row.description,
          row.species?.commonName,
          row.species?.scientificName,
          ...productCategories.map((c) => c.name),
          ...row.variants.flatMap((variant) =>
            variant.offers.flatMap((offer) => [offer.vendor.name, offer.vendor.district, offer.vendor.province]),
          ),
        ]
          .filter(Boolean)
          .join(' '),
      );

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        speciesName: row.species?.commonName ?? null,
        speciesSlug: row.species?.slug ?? null,
        imageUrl: primaryImage?.imageUrl ?? null,
        isFeatured: row.isFeatured,
        createdAt: row.createdAt,
        searchText,
        categorySlugs: new Set(productCategories.map((c) => c.slug)),
        categories: productCategories
          .filter((c) => ownIds.has(c.id))
          .map((c) => ({ name: c.name, slug: c.slug })),
        offers: row.variants.flatMap((variant) =>
          variant.offers.map((offer) => ({
            id: offer.id,
            price: Number(offer.price),
            stock: Number(offer.stock),
            unit: variant.unit,
            vendor: offer.vendor,
            regionKey: slugify(offer.vendor.district),
          })),
        ),
      };
    });
  }

  /**
   * Offers of a product that satisfy the filters. `skip` ignores one facet so
   * its own option counts reflect the other active filters only.
   */
  private matchingOffers(
    product: ListingProduct,
    filters: ListingFilters,
    skip?: FacetKey,
  ): ListingOffer[] {
    // The words apply to every facet. Ranked by the search engine: the product must be one of its matches.
    if (filters.ranked && !filters.ranked.has(product.id)) return [];

    // Without the engine each keyword must appear as a word prefix.
    const words = ` ${product.searchText}`;
    if (filters.keywords.some((keyword) => !words.includes(` ${keyword}`))) {
      return [];
    }

    if (
      skip !== 'category' &&
      filters.categories.length > 0 &&
      !filters.categories.some((slug) => product.categorySlugs.has(slug))
    ) {
      return [];
    }

    return product.offers.filter(
      (offer) =>
        (skip === 'region' ||
          filters.regions.length === 0 ||
          filters.regions.includes(offer.regionKey)) &&
        (skip === 'vendor' ||
          filters.vendors.length === 0 ||
          filters.vendors.includes(offer.vendor.slug)) &&
        (filters.minPrice === undefined || offer.price >= filters.minPrice) &&
        (filters.maxPrice === undefined || offer.price <= filters.maxPrice) &&
        (!filters.inStock || offer.stock > 0),
    );
  }

  private buildFacets(
    products: ListingProduct[],
    filters: ListingFilters,
    visibleCategories: ActiveCategory[],
  ): ProductListingDto['facets'] {
    const countBy = (skip: FacetKey, keysOf: (offers: ListingOffer[], p: ListingProduct) => string[]) => {
      const counts = new Map<string, number>();
      for (const product of products) {
        const offers = this.matchingOffers(product, filters, skip);
        if (offers.length === 0) continue;
        for (const key of new Set(keysOf(offers, product))) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return counts;
    };

    const categoryCounts = countBy('category', (_offers, product) => [...product.categorySlugs]);
    const regionCounts = countBy('region', (offers) => offers.map((o) => o.regionKey));
    const vendorCounts = countBy('vendor', (offers) => offers.map((o) => o.vendor.slug));

    // Labels come from every sellable offer so selected options never disappear.
    const regionLabels = new Map<string, string>();
    const vendorLabels = new Map<string, string>();
    for (const offer of products.flatMap((p) => p.offers)) {
      regionLabels.set(offer.regionKey, `${offer.vendor.district} (${offer.vendor.province})`);
      vendorLabels.set(offer.vendor.slug, offer.vendor.name);
    }

    const toOptions = (labels: Map<string, string>, counts: Map<string, number>): FacetOptionDto[] =>
      [...labels.entries()]
        .map(([value, label]) => ({ value, label, count: counts.get(value) ?? 0 }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));

    return {
      categories: visibleCategories.map((category) => ({
        value: category.slug,
        label: category.name,
        count: categoryCounts.get(category.slug) ?? 0,
      })),
      regions: toOptions(regionLabels, regionCounts),
      vendors: toOptions(vendorLabels, vendorCounts),
    };
  }

  private toItem(product: ListingProduct, offers: ListingOffer[]): ProductListingItemDto {
    // Show the cheapest matching offer, preferring offers that are in stock so
    // price, availability and vendor on the card all describe the same offer.
    const inStockOffers = offers.filter((offer) => offer.stock > 0);
    const candidates = inStockOffers.length > 0 ? inStockOffers : offers;
    const best = candidates.reduce((a, b) => (b.price < a.price ? b : a));

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      speciesName: product.speciesName,
      imageUrl: product.imageUrl,
      isFeatured: product.isFeatured,
      offerId: best.id,
      inStock: best.stock > 0,
      stock: best.stock,
      price: best.price,
      unit: best.unit,
      vendor: best.vendor,
      categories: product.categories,
    };
  }

  private sortItems(
    items: ProductListingItemDto[],
    matched: Array<{ product: ListingProduct }>,
    sort: NonNullable<ProductListingQueryDto['sort']>,
    ranked?: Map<string, number>,
  ): void {
    const createdAt = new Map(matched.map(({ product }) => [product.id, product.createdAt.getTime()]));
    const newest = (a: ProductListingItemDto, b: ProductListingItemDto) =>
      (createdAt.get(b.id) ?? 0) - (createdAt.get(a.id) ?? 0);

    items.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price || newest(a, b);
        case 'price-desc':
          return b.price - a.price || newest(a, b);
        case 'newest':
          return newest(a, b);
        default:
          // A search without a chosen order lists the best match first.
          if (ranked) return (ranked.get(b.id) ?? 0) - (ranked.get(a.id) ?? 0) || newest(a, b);
          return Number(b.isFeatured) - Number(a.isFeatured) || newest(a, b);
      }
    });
  }
}
