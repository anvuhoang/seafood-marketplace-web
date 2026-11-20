import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  normalizeSearchText,
  searchTokens,
} from '../product/product-listing.service.js';
import {
  VENDOR_LIST_DEFAULT_PAGE_SIZE,
  type CreateVendorOfferDto,
  type UpdateVendorOfferDto,
  type UpdateVendorOfferStatusDto,
  type VendorCatalogListDto,
  type VendorCatalogQueryDto,
  type VendorOfferDto,
  type VendorOfferListDto,
  type VendorOfferQueryDto,
  type VendorOfferStatus,
  type VendorOfferSummaryDto,
  type VendorProductStatus,
} from './dto/vendor-offer.dto.js';
import {
  findOwnVendor,
  findWritableVendor,
  pageWindow,
} from './vendor-access.js';

/** An ACTIVE offer at or below this stock counts as running low (same rule as the dashboard). */
export const LOW_STOCK_THRESHOLD = 5;

export const OFFER_NOT_FOUND =
  'Không tìm thấy sản phẩm này trong gian hàng của bạn.';
export const OFFER_DISCONTINUED =
  'Sản phẩm này đã ngừng bán nên không thể thay đổi giá, tồn kho hay trạng thái.';
export const OFFER_ALREADY_EXISTS =
  'Gian hàng đã bán biến thể này. Hãy sửa giá và tồn kho ngay trong danh sách sản phẩm.';
export const OFFER_ONCE_DISCONTINUED =
  'Gian hàng đã ngừng bán biến thể này trước đây. Biến thể đã ngừng bán không thể mở bán lại.';
export const VARIANT_NOT_FOUND =
  'Không tìm thấy biến thể sản phẩm, hoặc biến thể này không còn được bán.';

/** Products a vendor may sell: published ones, plus drafts they proposed themselves. */
export function offerableProductWhere(
  vendorId: string,
): Prisma.ProductWhereInput {
  return {
    OR: [
      { status: 'ACTIVE' },
      { status: 'DRAFT', createdByVendorId: vendorId },
    ],
  };
}

/** Exact decimal from a validated JSON number, without float arithmetic. */
export const toDecimal = (value: number) => new Prisma.Decimal(String(value));

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdByVendorId: true,
  images: {
    select: { imageUrl: true, isPrimary: true },
    orderBy: { sortOrder: 'asc' },
  },
  categories: { select: { category: { select: { id: true, name: true } } } },
} satisfies Prisma.ProductSelect;

const offerSelect = {
  id: true,
  price: true,
  stock: true,
  status: true,
  updatedAt: true,
  variant: {
    select: {
      id: true,
      name: true,
      unit: true,
      sizeLabel: true,
      product: { select: productCardSelect },
    },
  },
} satisfies Prisma.VendorOfferSelect;

type OfferRow = Prisma.VendorOfferGetPayload<{ select: typeof offerSelect }>;
type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

function productCard(product: ProductCardRow, vendorId: string) {
  const primary =
    product.images.find((image) => image.isPrimary) ?? product.images[0];
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status as VendorProductStatus,
    isOwnProduct: product.createdByVendorId === vendorId,
    imageUrl: primary?.imageUrl ?? null,
    categories: product.categories.map(({ category }) => ({
      id: category.id,
      name: category.name,
    })),
  };
}

function toOfferDto(row: OfferRow, vendorId: string): VendorOfferDto {
  return {
    id: row.id,
    product: productCard(row.variant.product, vendorId),
    variant: {
      id: row.variant.id,
      name: row.variant.name,
      unit: row.variant.unit,
      sizeLabel: row.variant.sizeLabel,
    },
    price: row.price.toFixed(2),
    stock: row.stock.toString(),
    status: row.status as VendorOfferStatus,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Every keyword must start a word of the text, like the customer search. */
export function matchesKeywords(
  parts: Array<string | null | undefined>,
  keywords: string[],
): boolean {
  if (keywords.length === 0) return true;
  const words = ` ${normalizeSearchText(parts.filter(Boolean).join(' '))}`;
  return keywords.every((keyword) => words.includes(` ${keyword}`));
}

@Injectable()
export class VendorOfferService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The signed-in vendor's offers, newest change first. Discontinued offers are
   * hidden unless that status is asked for. A vendor has at most a few hundred
   * offers, so the accent-insensitive search runs in memory, as on the shop pages.
   */
  async listOffers(
    userId: string,
    query: VendorOfferQueryDto,
  ): Promise<VendorOfferListDto> {
    const vendor = await findOwnVendor(this.prisma, userId);
    const where: Prisma.VendorOfferWhereInput = {
      vendorId: vendor.id,
      status: query.status ?? { not: 'DISCONTINUED' },
    };
    if (query.categoryId) {
      const children = await this.prisma.category.findMany({
        where: { parentId: query.categoryId },
        select: { id: true },
      });
      const categoryIds = [
        query.categoryId,
        ...children.map((child) => child.id),
      ];
      where.variant = {
        product: { categories: { some: { categoryId: { in: categoryIds } } } },
      };
    }

    const [rows, summary] = await Promise.all([
      this.prisma.vendorOffer.findMany({
        where,
        select: offerSelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.summarize(vendor.id),
    ]);

    const keywords = searchTokens(query.search);
    const matched = rows.filter((row) =>
      matchesKeywords(
        [
          row.variant.product.name,
          row.variant.name,
          row.variant.sizeLabel,
          ...row.variant.product.categories.map(
            ({ category }) => category.name,
          ),
        ],
        keywords,
      ),
    );

    const pageSize = query.pageSize ?? VENDOR_LIST_DEFAULT_PAGE_SIZE;
    const { skip, pagination } = pageWindow(
      matched.length,
      query.page,
      pageSize,
    );
    return {
      items: matched
        .slice(skip, skip + pageSize)
        .map((row) => toOfferDto(row, vendor.id)),
      summary,
      pagination,
    };
  }

  /** Counts over all of the vendor's offers, regardless of list filters. */
  private async summarize(vendorId: string): Promise<VendorOfferSummaryDto> {
    const [byStatus, lowStock, pendingApproval] = await Promise.all([
      this.prisma.vendorOffer.groupBy({
        by: ['status'],
        where: { vendorId },
        _count: { _all: true },
      }),
      this.prisma.vendorOffer.count({
        where: {
          vendorId,
          status: 'ACTIVE',
          stock: { lte: LOW_STOCK_THRESHOLD },
        },
      }),
      this.prisma.vendorOffer.count({
        where: {
          vendorId,
          status: { not: 'DISCONTINUED' },
          variant: { product: { status: 'DRAFT' } },
        },
      }),
    ]);
    const count = (status: VendorOfferStatus) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      total: byStatus.reduce((sum, row) => sum + row._count._all, 0),
      active: count('ACTIVE'),
      paused: count('PAUSED'),
      lowStock,
      discontinued: count('DISCONTINUED'),
      pendingApproval,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    };
  }

  /**
   * Products the vendor can add an offer to: published products and their own
   * drafts, each with its active variants and whether the vendor already sells them.
   */
  async searchCatalog(
    userId: string,
    query: VendorCatalogQueryDto,
  ): Promise<VendorCatalogListDto> {
    const vendor = await findOwnVendor(this.prisma, userId);
    const where: Prisma.ProductWhereInput = {
      ...offerableProductWhere(vendor.id),
      variants: { some: { isActive: true } },
    };

    // First the searchable text of every candidate, then full details for one page only.
    const candidates = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        species: { select: { commonName: true } },
        categories: { select: { category: { select: { name: true } } } },
      },
    });
    const keywords = searchTokens(query.search);
    const matched = candidates
      .filter((product) =>
        matchesKeywords(
          [
            product.name,
            product.species?.commonName,
            ...product.categories.map(({ category }) => category.name),
          ],
          keywords,
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    const pageSize = query.pageSize ?? VENDOR_LIST_DEFAULT_PAGE_SIZE;
    const { skip, pagination } = pageWindow(
      matched.length,
      query.page,
      pageSize,
    );
    const pageIds = matched
      .slice(skip, skip + pageSize)
      .map((product) => product.id);

    const rows = pageIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: pageIds } },
          select: {
            ...productCardSelect,
            variants: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true,
                unit: true,
                sizeLabel: true,
                offers: {
                  where: { vendorId: vendor.id },
                  select: { id: true },
                },
              },
            },
          },
        })
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));

    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((row) => row !== undefined)
        .map((row) => ({
          ...productCard(row, vendor.id),
          variants: row.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            unit: variant.unit,
            sizeLabel: variant.sizeLabel,
            alreadyOffered: variant.offers.length > 0,
          })),
        })),
      pagination,
    };
  }

  /** Start selling one active variant of a published product, or of the vendor's own draft. */
  async createOffer(
    userId: string,
    dto: CreateVendorOfferDto,
  ): Promise<VendorOfferDto> {
    const vendor = await findWritableVendor(this.prisma, userId);

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        isActive: true,
        product: offerableProductWhere(vendor.id),
      },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException(VARIANT_NOT_FOUND);

    const existing = await this.prisma.vendorOffer.findUnique({
      where: {
        vendorId_variantId: { vendorId: vendor.id, variantId: variant.id },
      },
      select: { status: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === 'DISCONTINUED'
          ? OFFER_ONCE_DISCONTINUED
          : OFFER_ALREADY_EXISTS,
      );
    }

    try {
      const created = await this.prisma.vendorOffer.create({
        data: {
          vendorId: vendor.id,
          variantId: variant.id,
          price: toDecimal(dto.price),
          stock: toDecimal(dto.stock),
          status: dto.status ?? 'ACTIVE',
        },
        select: offerSelect,
      });
      return toOfferDto(created, vendor.id);
    } catch (error) {
      // Two tabs adding the same variant at once: the unique key catches the second.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(OFFER_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  /** Change price and/or stock of one of the vendor's own offers. */
  async updateOffer(
    userId: string,
    offerId: string,
    dto: UpdateVendorOfferDto,
  ): Promise<VendorOfferDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    const current = await this.findOwnOffer(vendor.id, offerId);
    if (current.status === 'DISCONTINUED')
      throw new ConflictException(OFFER_DISCONTINUED);

    const data: Prisma.VendorOfferUpdateInput = {};
    if (dto.price !== undefined) data.price = toDecimal(dto.price);
    if (dto.stock !== undefined) data.stock = toDecimal(dto.stock);

    const updated = await this.prisma.vendorOffer.update({
      // Guarded again here, in case it was discontinued in another tab meanwhile.
      where: {
        id: offerId,
        vendorId: vendor.id,
        status: { not: 'DISCONTINUED' },
      },
      data,
      select: offerSelect,
    });
    return toOfferDto(updated, vendor.id);
  }

  /**
   * Pause, resume or discontinue one offer. Discontinuing is final and changes the
   * offer's status only: orders, payments and carts are left as they are, and
   * checkout must re-check each offer itself.
   */
  async changeStatus(
    userId: string,
    offerId: string,
    dto: UpdateVendorOfferStatusDto,
  ): Promise<VendorOfferDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    const current = await this.findOwnOffer(vendor.id, offerId);
    if (current.status === 'DISCONTINUED')
      throw new ConflictException(OFFER_DISCONTINUED);

    const row =
      current.status === dto.status
        ? await this.prisma.vendorOffer.findFirstOrThrow({
            where: { id: offerId, vendorId: vendor.id },
            select: offerSelect,
          })
        : await this.prisma.vendorOffer.update({
            where: { id: offerId, vendorId: vendor.id, status: current.status },
            data: { status: dto.status },
            select: offerSelect,
          });
    return toOfferDto(row, vendor.id);
  }

  /** 404 for another vendor's offer too, so ids of other stores reveal nothing. */
  private async findOwnOffer(vendorId: string, offerId: string) {
    const offer = await this.prisma.vendorOffer.findFirst({
      where: { id: offerId, vendorId },
      select: { id: true, status: true },
    });
    if (!offer) throw new NotFoundException(OFFER_NOT_FOUND);
    return offer;
  }
}
