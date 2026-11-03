import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateReviewDto,
  PendingReviewItemDto,
  ReviewCenterDto,
  ReviewProductDto,
  ReviewUploadSignatureDto,
  SubmittedReviewDto,
} from './dto/review.dto.js';

const UPLOAD_FOLDER_ROOT = 'haisan-express/reviews';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** "Nguyễn Văn An" -> "n***n"; shown instead of the name on anonymous reviews. */
export function anonymizeName(fullName: string): string {
  const name = fullName.trim();
  if (!name) return '***';
  return `${name[0]!.toLowerCase()}***${name[name.length - 1]!.toLowerCase()}`;
}

/**
 * Cloudinary API signature: SHA-1 of the sorted `key=value` pairs joined by
 * `&`, followed by the API secret.
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + apiSecret).digest('hex');
}

const productSelect = {
  id: true,
  name: true,
  slug: true,
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { imageUrl: true } },
};

type ProductRow = { id: string; name: string; slug: string; images: Array<{ imageUrl: string }> };

const reviewInclude = {
  product: { select: productSelect },
  images: { orderBy: { sortOrder: 'asc' as const }, select: { imageUrl: true } },
  orderItem: {
    select: {
      vendorNameSnapshot: true,
      vendorOrder: { select: { order: { select: { orderNumber: true } } } },
    },
  },
};

type ReviewRow = {
  id: string;
  rating: number;
  content: string | null;
  highlights: string[];
  isAnonymous: boolean;
  status: string;
  createdAt: Date;
  product: ProductRow;
  images: Array<{ imageUrl: string }>;
  orderItem: { vendorNameSnapshot: string; vendorOrder: { order: { orderNumber: string } } } | null;
};

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Items waiting for a review, the customer's own reviews and their totals. */
  async getReviewCenter(userId: string): Promise<ReviewCenterDto> {
    const [user, pendingRows, reviewRows] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
      this.prisma.orderItem.findMany({
        where: {
          review: { is: null },
          vendorOrder: { status: 'COMPLETED', order: { userId } },
        },
        include: {
          vendorOrder: {
            select: {
              updatedAt: true,
              order: { select: { orderNumber: true } },
              shipment: { select: { deliveredAt: true } },
            },
          },
          offer: { select: { variant: { select: { product: { select: productSelect } } } } },
        },
      }),
      this.prisma.review.findMany({
        where: { userId },
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại.');
    }

    const pending: PendingReviewItemDto[] = pendingRows.map((item) => ({
      orderItemId: item.id,
      orderNumber: item.vendorOrder.order.orderNumber,
      vendorName: item.vendorNameSnapshot,
      deliveredAt: (item.vendorOrder.shipment?.deliveredAt ?? item.vendorOrder.updatedAt).toISOString(),
      product: this.toProduct(item.offer.variant.product),
      variantName: item.variantNameSnapshot,
      unit: item.unitSnapshot,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      lineTotal: Number(item.lineTotal),
    }));
    // Most recently delivered first; the delivery date can come from the shipment,
    // so this is sorted here rather than in the query.
    pending.sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
    const submitted = reviewRows.map((row) => this.toSubmitted(row as ReviewRow));
    const ratingTotal = submitted.reduce((sum, review) => sum + review.rating, 0);

    return {
      stats: {
        pendingCount: pending.length,
        submittedCount: submitted.length,
        averageRating: submitted.length > 0 ? Math.round((ratingTotal / submitted.length) * 10) / 10 : 0,
      },
      anonymousName: anonymizeName(user.fullName),
      imageUploadEnabled: this.cloudinary() !== null,
      pending,
      submitted,
    };
  }

  /** Review one delivered order item. Each item can be reviewed once. */
  async createReview(userId: string, dto: CreateReviewDto): Promise<SubmittedReviewDto> {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: dto.orderItemId, vendorOrder: { order: { userId } } },
      include: {
        review: { select: { id: true } },
        vendorOrder: { select: { status: true } },
        offer: { select: { variant: { select: { productId: true } } } },
      },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy sản phẩm này trong đơn hàng của bạn.');
    }
    if (item.vendorOrder.status !== 'COMPLETED') {
      throw new BadRequestException('Chỉ có thể đánh giá sau khi đơn hàng đã giao thành công.');
    }
    if (item.review) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi.');
    }

    const imageUrls = dto.imageUrls ?? [];
    if (imageUrls.some((url) => !this.isOwnUploadedImage(url, userId))) {
      throw new BadRequestException('Ảnh đánh giá không hợp lệ. Vui lòng tải ảnh lên lại.');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          productId: item.offer.variant.productId,
          orderItemId: item.id,
          rating: dto.rating,
          content: dto.content,
          highlights: dto.highlights ?? [],
          isAnonymous: dto.isAnonymous ?? false,
          images: { create: imageUrls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder })) },
        },
        include: reviewInclude,
      });
      return this.toSubmitted(review as ReviewRow);
    } catch (error) {
      // Two submissions for the same item at once: the unique order_item_id wins.
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi.');
      }
      throw error;
    }
  }

  /** Signature for one direct browser upload into this customer's folder. */
  createUploadSignature(userId: string): ReviewUploadSignatureDto {
    const cloudinary = this.cloudinary();
    if (!cloudinary) {
      throw new ServiceUnavailableException('Chức năng tải ảnh chưa được cấu hình.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${UPLOAD_FOLDER_ROOT}/${userId}`;
    const signature = signCloudinaryParams(
      { allowed_formats: ALLOWED_FORMATS, folder, timestamp },
      cloudinary.apiSecret,
    );

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
      apiKey: cloudinary.apiKey,
      timestamp,
      signature,
      folder,
      allowedFormats: ALLOWED_FORMATS,
      maxFileSizeBytes: REVIEW_IMAGE_MAX_BYTES,
    };
  }

  /** Only images uploaded into this customer's own folder on our cloud are accepted. */
  private isOwnUploadedImage(url: string, userId: string): boolean {
    const cloudinary = this.cloudinary();
    if (!cloudinary) return false;
    const prefix = `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/`;
    if (!url.startsWith(prefix)) return false;
    // Optional version segment, then the folder, then a single file name.
    const rest = url.slice(prefix.length).replace(/^v\d+\//, '');
    const folder = `${UPLOAD_FOLDER_ROOT}/${userId}/`;
    return rest.startsWith(folder) && /^[\w-]+\.(jpe?g|png|webp)$/i.test(rest.slice(folder.length));
  }

  private cloudinary(): { cloudName: string; apiKey: string; apiSecret: string } | null {
    const settings = this.config.get<{ cloudName: string; apiKey: string; apiSecret: string }>('cloudinary');
    return settings?.cloudName && settings.apiKey && settings.apiSecret ? settings : null;
  }

  private toProduct(product: ProductRow): ReviewProductDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images[0]?.imageUrl ?? null,
    };
  }

  private toSubmitted(row: ReviewRow): SubmittedReviewDto {
    return {
      id: row.id,
      rating: row.rating,
      content: row.content,
      highlights: row.highlights,
      isAnonymous: row.isAnonymous,
      isHidden: row.status === 'HIDDEN',
      imageUrls: row.images.map((image) => image.imageUrl),
      createdAt: row.createdAt.toISOString(),
      orderNumber: row.orderItem?.vendorOrder.order.orderNumber ?? null,
      vendorName: row.orderItem?.vendorNameSnapshot ?? null,
      product: this.toProduct(row.product),
    };
  }
}
