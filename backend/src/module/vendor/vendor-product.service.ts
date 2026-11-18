import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { slugify } from '../product/product-listing.service.js';
import type {
  VendorOfferStatus,
  VendorProductStatus,
} from './dto/vendor-offer.dto.js';
import type {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  VendorProductDto,
  VendorProductImageInputDto,
  VendorProductVariantInputDto,
} from './dto/vendor-product.dto.js';
import type { VendorStoreUploadSignatureDto } from './dto/vendor-store.dto.js';
import {
  canVendorWrite,
  findOwnVendor,
  findWritableVendor,
  vendorProductUploadFolder,
  type OwnVendor,
} from './vendor-access.js';
import { toDecimal } from './vendor-offer.service.js';

export const PRODUCT_NOT_FOUND =
  'Không tìm thấy sản phẩm nháp này trong gian hàng của bạn.';
export const PRODUCT_PUBLISHED =
  'Sản phẩm đã được duyệt nên không thể chỉnh sửa tại đây. Vui lòng liên hệ admin nếu cần thay đổi.';
export const PRODUCT_INVALID_IMAGE =
  'Ảnh sản phẩm không hợp lệ. Vui lòng tải ảnh lên lại.';
export const PRODUCT_INVALID_CATEGORY =
  'Danh mục không tồn tại hoặc đã ngừng hiển thị.';
export const PRODUCT_DUPLICATE_VARIANT =
  'Có biến thể bị trùng cả tên và kích cỡ.';
export const PRODUCT_UNKNOWN_VARIANT = 'Biến thể không thuộc sản phẩm này.';
export const PRODUCT_OFFER_ON_EXISTING_VARIANT =
  'Giá và tồn kho của biến thể đã có được sửa trong danh sách sản phẩm, không sửa tại đây.';
export const productVariantInUse = (name: string) =>
  `Biến thể "${name}" đã có trong giỏ hàng hoặc đơn hàng nên không thể xóa.`;

/** Room under the 250-character slug column for a "-12" style suffix. */
const SLUG_BASE_MAX_LENGTH = 240;
const FALLBACK_SLUG = 'san-pham';
const MAX_SLUG_ATTEMPTS = 3;

const draftSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  categories: { select: { category: { select: { id: true, name: true } } } },
  images: {
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      imageUrl: true,
      altText: true,
      isPrimary: true,
      sortOrder: true,
    },
  },
  variants: {
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      unit: true,
      sizeLabel: true,
      offers: {
        select: {
          id: true,
          vendorId: true,
          price: true,
          stock: true,
          status: true,
          _count: { select: { cartItems: true, orderItems: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type DraftRow = Prisma.ProductGetPayload<{ select: typeof draftSelect }>;
type DraftVariantRow = DraftRow['variants'][number];

/** A variant can be removed while no cart or order points at any of its offers. */
const isRemovable = (variant: DraftVariantRow) =>
  variant.offers.every(
    (offer) => offer._count.cartItems === 0 && offer._count.orderItems === 0,
  );

const variantKey = (variant: { name: string; sizeLabel?: string | null }) =>
  `${slugify(variant.name)}|${slugify(variant.sizeLabel ?? '')}`;

const isSlugTaken = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

/**
 * Products a vendor proposes. They are saved as drafts (hidden from customers)
 * until an admin publishes them; after that the vendor can no longer edit them,
 * since the published product is part of the shared catalogue.
 */
@Injectable()
export class VendorProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getProduct(
    userId: string,
    productId: string,
  ): Promise<VendorProductDto> {
    const vendor = await findOwnVendor(this.prisma, userId);
    return this.toDto(await this.findOwnDraft(vendor.id, productId), vendor);
  }

  /** Product, variants and optional offers are created together in one transaction. */
  async createProduct(
    userId: string,
    dto: CreateVendorProductDto,
  ): Promise<VendorProductDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    await this.assertActiveCategories(dto.categoryIds);
    this.assertUploadedImages(dto.images, vendor.id, []);
    this.assertDistinctVariants(dto.variants);

    for (let attempt = 1; ; attempt++) {
      try {
        const productId = await this.prisma.$transaction(async (tx) => {
          const slug = await this.uniqueSlug(tx, dto.name);
          const product = await tx.product.create({
            data: {
              name: dto.name,
              slug,
              description: dto.description ?? null,
              status: 'DRAFT',
              createdByVendorId: vendor.id,
              categories: {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              },
              images: { create: this.imageRows(dto.images) },
            },
            select: { id: true },
          });
          for (const variant of dto.variants) {
            await tx.productVariant.create({
              data: this.variantCreateData(product.id, variant, vendor.id),
            });
          }
          return product.id;
        });
        return this.getProduct(userId, productId);
      } catch (error) {
        // Two drafts with the same name at once can pick the same slug; retry with the next free one.
        if (!isSlugTaken(error) || attempt >= MAX_SLUG_ATTEMPTS) throw error;
      }
    }
  }

  /**
   * Edit one of the vendor's drafts. Lists that are sent replace the old ones.
   * The slug is kept when the name changes. Variants already in a cart or an
   * order cannot be removed.
   */
  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateVendorProductDto,
  ): Promise<VendorProductDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    const current = await this.findOwnDraft(vendor.id, productId);

    if (dto.categoryIds) await this.assertActiveCategories(dto.categoryIds);
    if (dto.images) {
      this.assertUploadedImages(
        dto.images,
        vendor.id,
        current.images.map((image) => image.imageUrl),
      );
    }

    const existing = new Map(
      current.variants.map((variant) => [variant.id, variant]),
    );
    let removed: DraftVariantRow[] = [];
    if (dto.variants) {
      for (const variant of dto.variants) {
        if (variant.id && !existing.has(variant.id))
          throw new BadRequestException(PRODUCT_UNKNOWN_VARIANT);
        if (variant.id && variant.offer)
          throw new BadRequestException(PRODUCT_OFFER_ON_EXISTING_VARIANT);
      }
      this.assertDistinctVariants(dto.variants);
      const kept = new Set(
        dto.variants.map((variant) => variant.id).filter(Boolean),
      );
      removed = current.variants.filter((variant) => !kept.has(variant.id));
      const inUse = removed.find((variant) => !isRemovable(variant));
      if (inUse) throw new ConflictException(productVariantInUse(inUse.name));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        // Guarded again here, in case an admin published it meanwhile (then 404).
        where: { id: productId, createdByVendorId: vendor.id, status: 'DRAFT' },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.categoryIds && {
            categories: {
              deleteMany: {},
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            },
          }),
          ...(dto.images && {
            images: { deleteMany: {}, create: this.imageRows(dto.images) },
          }),
        },
        select: { id: true },
      });

      if (!dto.variants) return;
      if (removed.length > 0) {
        // Removing a variant also removes this vendor's unused offer on it.
        await tx.productVariant.deleteMany({
          where: {
            id: { in: removed.map((variant) => variant.id) },
            productId,
          },
        });
      }
      for (const variant of dto.variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id, productId },
            data: {
              name: variant.name,
              unit: variant.unit,
              sizeLabel: variant.sizeLabel ?? null,
            },
          });
        } else {
          await tx.productVariant.create({
            data: this.variantCreateData(productId, variant, vendor.id),
          });
        }
      }
    });

    return this.getProduct(userId, productId);
  }

  /** Signature for one direct upload into this vendor's product image folder. */
  async createUploadSignature(
    userId: string,
  ): Promise<VendorStoreUploadSignatureDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    return this.cloudinary.createUploadSignature(
      vendorProductUploadFolder(vendor.id),
    );
  }

  /** 404 when it is not this vendor's draft; 409 once an admin has published it. */
  private async findOwnDraft(
    vendorId: string,
    productId: string,
  ): Promise<DraftRow> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, createdByVendorId: vendorId },
      select: draftSelect,
    });
    if (!product) throw new NotFoundException(PRODUCT_NOT_FOUND);
    if (product.status !== 'DRAFT')
      throw new ConflictException(PRODUCT_PUBLISHED);
    return product;
  }

  /** Every category must exist and be visible (active, and its parent too). */
  private async assertActiveCategories(categoryIds: string[]): Promise<void> {
    const found = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, isActive: true },
      select: { id: true, parent: { select: { isActive: true } } },
    });
    const visible = found.filter(
      (category) => category.parent?.isActive ?? true,
    );
    if (visible.length !== new Set(categoryIds).size)
      throw new BadRequestException(PRODUCT_INVALID_CATEGORY);
  }

  /** New images must be uploaded into this vendor's product folder; images already on the draft may stay. */
  private assertUploadedImages(
    images: VendorProductImageInputDto[],
    vendorId: string,
    keep: string[],
  ): void {
    const folder = vendorProductUploadFolder(vendorId);
    for (const image of images) {
      if (keep.includes(image.imageUrl)) continue;
      if (!this.cloudinary.isUploadedImageInFolder(image.imageUrl, folder)) {
        throw new BadRequestException(PRODUCT_INVALID_IMAGE);
      }
    }
  }

  private assertDistinctVariants(
    variants: Array<{ name: string; sizeLabel?: string | null }>,
  ): void {
    if (new Set(variants.map(variantKey)).size !== variants.length) {
      throw new BadRequestException(PRODUCT_DUPLICATE_VARIANT);
    }
  }

  private imageRows(images: VendorProductImageInputDto[]) {
    return images.map((image, index) => ({
      imageUrl: image.imageUrl,
      altText: image.altText ?? null,
      isPrimary: image.isPrimary,
      sortOrder: index,
    }));
  }

  private variantCreateData(
    productId: string,
    variant: VendorProductVariantInputDto,
    vendorId: string,
  ): Prisma.ProductVariantUncheckedCreateInput {
    return {
      productId,
      name: variant.name,
      unit: variant.unit,
      sizeLabel: variant.sizeLabel ?? null,
      isActive: true,
      ...(variant.offer && {
        offers: {
          create: {
            vendorId,
            price: toDecimal(variant.offer.price),
            stock: toDecimal(variant.offer.stock),
            status: 'ACTIVE',
          },
        },
      }),
    };
  }

  /** "tom-hum", or "tom-hum-2", "tom-hum-3" when that is taken. */
  private async uniqueSlug(
    tx: Prisma.TransactionClient,
    name: string,
  ): Promise<string> {
    const base =
      slugify(name).slice(0, SLUG_BASE_MAX_LENGTH).replace(/-$/, '') ||
      FALLBACK_SLUG;
    const taken = new Set(
      (
        await tx.product.findMany({
          where: { slug: { startsWith: base } },
          select: { slug: true },
        })
      ).map((row) => row.slug),
    );
    if (!taken.has(base)) return base;
    for (let suffix = 2; ; suffix++) {
      const candidate = `${base}-${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  private toDto(product: DraftRow, vendor: OwnVendor): VendorProductDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      status: product.status as VendorProductStatus,
      categories: product.categories.map(({ category }) => ({
        id: category.id,
        name: category.name,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
      variants: product.variants.map((variant) => {
        const offer = variant.offers.find((row) => row.vendorId === vendor.id);
        return {
          id: variant.id,
          name: variant.name,
          unit: variant.unit,
          sizeLabel: variant.sizeLabel,
          offer: offer
            ? {
                id: offer.id,
                price: offer.price.toFixed(2),
                stock: offer.stock.toString(),
                status: offer.status as VendorOfferStatus,
              }
            : null,
          removable: isRemovable(variant),
        };
      }),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      editable: canVendorWrite(vendor.status),
      imageUploadEnabled: this.cloudinary.isEnabled(),
    };
  }
}
