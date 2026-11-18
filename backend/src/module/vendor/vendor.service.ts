import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VendorOrderStatus } from '@prisma/client';
import type { Vendor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CLOUDINARY_FOLDER_ROOT, CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { LOW_STOCK_THRESHOLD } from './vendor-offer.service.js';
import type { UpdateVendorStoreDto, VendorStoreDto, VendorStoreUploadSignatureDto } from './dto/vendor-store.dto.js';
import type {
  FollowStateDto,
  VendorStorefrontCategoryDto,
  VendorStorefrontDto,
  VendorStorefrontProductDto,
  VendorStorefrontStatus,
  VendorSummaryDto,
} from './dto/vendor-storefront.dto.js';
import type {
  VendorDashboardDto,
  VendorDashboardOrderDto,
  VendorDashboardStatusCountDto,
} from './dto/vendor-dashboard.dto.js';

const SELLABLE_OFFER_WHERE = {
  status: 'ACTIVE',
  variant: {
    isActive: true,
    product: { status: 'ACTIVE' },
  },
} as const;

export const VENDOR_STORE_NOT_FOUND = 'Tài khoản của bạn chưa có gian hàng.';
export const VENDOR_STORE_SUSPENDED = 'Gian hàng đang bị tạm ngưng nên không thể chỉnh sửa hồ sơ.';
export const VENDOR_STORE_INVALID_IMAGE = 'Ảnh không hợp lệ. Vui lòng tải ảnh lên lại.';

/** Folder that one vendor's store images are uploaded into. */
export const vendorUploadFolder = (vendorId: string) => `${CLOUDINARY_FOLDER_ROOT}/vendors/${vendorId}`;

const vendorStoreSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  phone: true,
  email: true,
  province: true,
  district: true,
  ward: true,
  streetAddress: true,
  status: true,
  updatedAt: true,
} as const;

type VendorStoreRow = Pick<Vendor, keyof typeof vendorStoreSelect>;

/** Store fields a vendor may change themselves; slug and status are not among them. */
const EDITABLE_STORE_FIELDS = [
  'name',
  'description',
  'logoUrl',
  'coverUrl',
  'phone',
  'email',
  'province',
  'district',
  'ward',
  'streetAddress',
] as const satisfies ReadonlyArray<keyof UpdateVendorStoreDto>;

const ACTIONABLE_ORDER_STATUSES = [
  VendorOrderStatus.PENDING,
  VendorOrderStatus.ACCEPTED,
] as const;

/** Orders listed on the dashboard; `ordersNeedingActionCount` still counts all of them. */
export const DASHBOARD_ORDER_LIMIT = 5;
/** Low stock offers listed on the dashboard; `lowStockCount` still counts all of them. */
export const DASHBOARD_LOW_STOCK_LIMIT = 8;

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** The signed-in user's own store. Always looked up by owner, never by an id from the client. */
  async getMyStore(userId: string): Promise<VendorStoreDto> {
    return this.toStoreDto(await this.findOwnStore(userId));
  }

  /**
   * Partial update of the signed-in user's store. Suspended stores are read-only;
   * pending, active and rejected stores can be edited. New images must come from
   * this store's own upload folder on our Cloudinary account.
   */
  async updateMyStore(userId: string, dto: UpdateVendorStoreDto): Promise<VendorStoreDto> {
    const current = await this.findOwnStore(userId);
    if (current.status === 'SUSPENDED') {
      throw new ForbiddenException(VENDOR_STORE_SUSPENDED);
    }

    const folder = vendorUploadFolder(current.id);
    for (const field of ['logoUrl', 'coverUrl'] as const) {
      const url = dto[field];
      // null clears the image; resending the stored URL is a no-op.
      if (url == null || url === current[field]) continue;
      if (!this.cloudinary.isUploadedImageInFolder(url, folder)) {
        throw new BadRequestException(VENDOR_STORE_INVALID_IMAGE);
      }
    }

    // Copy only the editable fields that were sent, whatever else the object holds.
    // The DTO already rejects null for the required columns (name, region, address).
    const data: Record<string, string | null> = {};
    for (const field of EDITABLE_STORE_FIELDS) {
      if (dto[field] !== undefined) data[field] = dto[field];
    }

    const updated = await this.prisma.vendor.update({
      where: { ownerId: userId },
      data: data as Prisma.VendorUpdateInput,
      select: vendorStoreSelect,
    });
    return this.toStoreDto(updated);
  }

  /** Signature for one direct upload into the signed-in vendor's store folder. */
  async createStoreUploadSignature(userId: string): Promise<VendorStoreUploadSignatureDto> {
    const store = await this.findOwnStore(userId);
    return this.cloudinary.createUploadSignature(vendorUploadFolder(store.id));
  }

  private async findOwnStore(userId: string): Promise<VendorStoreRow> {
    const store = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: vendorStoreSelect,
    });
    if (!store) {
      throw new NotFoundException(VENDOR_STORE_NOT_FOUND);
    }
    return store;
  }

  private toStoreDto(store: VendorStoreRow): VendorStoreDto {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      logoUrl: store.logoUrl,
      coverUrl: store.coverUrl,
      phone: store.phone,
      email: store.email,
      province: store.province,
      district: store.district,
      ward: store.ward,
      streetAddress: store.streetAddress,
      status: store.status as VendorStorefrontStatus,
      updatedAt: store.updatedAt.toISOString(),
      imageUploadEnabled: this.cloudinary.isEnabled(),
    };
  }

  async getDashboard(userId: string): Promise<VendorDashboardDto> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true },
    });

    if (!vendor) {
      throw new NotFoundException('Tài khoản này chưa được liên kết với gian hàng.');
    }

    const vendorId = vendor.id;
    const [
      productCount,
      orderCount,
      ordersNeedingActionCount,
      lowStockCount,
      revenue,
      groupedOrders,
      actionableOrders,
      lowStockOffers,
    ] = await Promise.all([
      this.prisma.vendorOffer.count({
        where: { vendorId, status: 'ACTIVE' },
      }),
      this.prisma.vendorOrder.count({ where: { vendorId } }),
      this.prisma.vendorOrder.count({
        where: { vendorId, status: { in: [...ACTIONABLE_ORDER_STATUSES] } },
      }),
      this.prisma.vendorOffer.count({
        where: { vendorId, status: 'ACTIVE', stock: { lte: LOW_STOCK_THRESHOLD } },
      }),
      this.prisma.vendorOrder.aggregate({
        where: { vendorId, status: VendorOrderStatus.COMPLETED },
        _sum: { subtotal: true },
      }),
      this.prisma.vendorOrder.groupBy({
        by: ['status'],
        where: { vendorId },
        _count: { _all: true },
      }),
      this.prisma.vendorOrder.findMany({
        where: { vendorId, status: { in: [...ACTIONABLE_ORDER_STATUSES] } },
        // The most urgent first: waiting for confirmation before already accepted
        // (Postgres sorts an enum in declaration order, PENDING < ACCEPTED), then
        // the order that has waited longest.
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        take: DASHBOARD_ORDER_LIMIT,
        select: {
          id: true,
          status: true,
          subtotal: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
              recipientName: true,
              recipientPhone: true,
              shippingAddress: true,
            },
          },
          items: {
            select: {
              productNameSnapshot: true,
              variantNameSnapshot: true,
              unitSnapshot: true,
              quantity: true,
              lineTotal: true,
            },
          },
        },
      }),
      this.prisma.vendorOffer.findMany({
        where: { vendorId, status: 'ACTIVE', stock: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: [{ stock: 'asc' }, { createdAt: 'desc' }],
        take: DASHBOARD_LOW_STOCK_LIMIT,
        select: {
          id: true,
          stock: true,
          variant: {
            select: {
              name: true,
              unit: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const countsByStatus = new Map<VendorOrderStatus, number>(
      Object.values(VendorOrderStatus).map((status) => [status, 0]),
    );
    for (const row of groupedOrders) {
      countsByStatus.set(row.status, row._count._all);
    }

    const ordersByStatus: VendorDashboardStatusCountDto[] = [...countsByStatus].map(
      ([status, count]) => ({ status, count }),
    );
    const ordersNeedingAction: VendorDashboardOrderDto[] = actionableOrders.map((order) => ({
      id: order.id,
      orderNumber: order.order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      customerName: order.order.recipientName,
      customerPhone: order.order.recipientPhone,
      shippingAddress: order.order.shippingAddress,
      subtotal: order.subtotal.toFixed(2),
      items: order.items.map((item) => ({
        productName: item.productNameSnapshot,
        variantName: item.variantNameSnapshot,
        quantity: item.quantity.toString(),
        unit: item.unitSnapshot,
        lineTotal: item.lineTotal.toFixed(2),
      })),
    }));

    return {
      vendor: { name: vendor.name, slug: vendor.slug },
      summary: {
        productCount,
        orderCount,
        ordersNeedingActionCount,
        lowStockCount,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        revenue: revenue._sum.subtotal?.toFixed(2) ?? '0.00',
      },
      ordersByStatus,
      ordersNeedingAction,
      lowStockOffers: lowStockOffers.map((offer) => ({
        id: offer.id,
        productName: offer.variant.product.name,
        variantName: offer.variant.name,
        stock: offer.stock.toString(),
        unit: offer.variant.unit,
      })),
    };
  }

  /**
   * Approved vendors for public discovery, highest rated first.
   */
  async listActiveVendors(): Promise<VendorSummaryDto[]> {
    const vendors = await this.prisma.vendor.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }],
    });

    return this.summarize(vendors);
  }

  /** Vendors the signed-in customer follows, most recently followed first. */
  async listFollowedVendors(userId: string): Promise<VendorSummaryDto[]> {
    const follows = await this.prisma.vendorFollow.findMany({
      where: { userId, vendor: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      include: { vendor: true },
    });

    return this.summarize(follows.map((follow) => follow.vendor));
  }

  /** Whether the customer follows the vendor, and how many customers follow it. */
  async getFollowState(slug: string, userId: string): Promise<FollowStateDto> {
    const vendor = await this.findActiveVendorBySlug(slug);
    return this.followState(vendor.id, userId);
  }

  /** Follow an active vendor. Following again is a no-op. */
  async follow(slug: string, userId: string): Promise<FollowStateDto> {
    const vendor = await this.findActiveVendorBySlug(slug);

    await this.prisma.vendorFollow.upsert({
      where: { userId_vendorId: { userId, vendorId: vendor.id } },
      update: {},
      create: { userId, vendorId: vendor.id },
    });

    return this.followState(vendor.id, userId);
  }

  /** Stop following. Unfollowing when not following is a no-op. */
  async unfollow(slug: string, userId: string): Promise<FollowStateDto> {
    const vendor = await this.prisma.vendor.findUnique({ where: { slug } });
    if (!vendor) {
      throw new NotFoundException('Gian hàng không tồn tại');
    }

    await this.prisma.vendorFollow.deleteMany({ where: { userId, vendorId: vendor.id } });
    return this.followState(vendor.id, userId);
  }

  private async findActiveVendorBySlug(slug: string): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findUnique({ where: { slug } });
    if (!vendor) {
      throw new NotFoundException('Gian hàng không tồn tại');
    }
    if (vendor.status !== 'ACTIVE') {
      throw new BadRequestException('Gian hàng này chưa mở bán nên chưa thể theo dõi.');
    }
    return vendor;
  }

  private async followState(vendorId: string, userId: string): Promise<FollowStateDto> {
    const [follow, followerCount] = await Promise.all([
      this.prisma.vendorFollow.findUnique({
        where: { userId_vendorId: { userId, vendorId } },
        select: { userId: true },
      }),
      this.prisma.vendorFollow.count({ where: { vendorId } }),
    ]);
    return { isFollowing: Boolean(follow), followerCount };
  }

  /** Card data for a list of vendors: location and the number of products each sells. */
  private async summarize(vendors: Vendor[]): Promise<VendorSummaryDto[]> {
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
   * Public storefront for a vendor. Only ACTIVE vendors have one: a pending,
   * rejected or suspended store is answered exactly like a missing one (404),
   * so its details are not public before an admin approves it.
   */
  async getStorefront(
    slug: string,
    categorySlug?: string,
  ): Promise<VendorStorefrontDto> {
    const vendor = await this.prisma.vendor.findUnique({ where: { slug } });

    if (!vendor || vendor.status !== 'ACTIVE') {
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
        address: [vendor.streetAddress, vendor.ward, vendor.district, vendor.province].filter(Boolean).join(', '),
        province: vendor.province,
        district: vendor.district,
        ratingAverage: Number(vendor.ratingAverage),
        ratingCount: vendor.ratingCount,
        joinedAt: vendor.createdAt.toISOString(),
        followerCount: await this.prisma.vendorFollow.count({ where: { vendorId: vendor.id } }),
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
