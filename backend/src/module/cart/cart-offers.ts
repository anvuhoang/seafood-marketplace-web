import { Prisma } from '@prisma/client';

/**
 * What the cart and checkout both need to know about an offer: how to read it in one query, why it
 * cannot be bought, and the messages for each reason. Kept in one place so a cart line and a checkout
 * line are judged by exactly the same rules.
 */

export const VENDOR_NOT_SELLING_MESSAGE =
  'Gian hàng bán sản phẩm này hiện chưa mở bán hoặc đang tạm ngưng.';
export const OFFER_NOT_FOUND = 'Không tìm thấy mặt hàng yêu cầu.';
export const OFFER_UNAVAILABLE =
  'Sản phẩm hiện không khả dụng hoặc đã ngừng kinh doanh.';
export const OUT_OF_STOCK = 'Sản phẩm hiện đã hết hàng.';
export const CART_ITEM_NOT_FOUND =
  'Không tìm thấy mặt hàng trong giỏ hàng của bạn.';

export const exceedsStock = (requested: number, stock: number) =>
  `Số lượng yêu cầu (${requested}) vượt quá số lượng còn lại trong kho (${stock}).`;
export const totalExceedsStock = (total: number, stock: number) =>
  `Tổng số lượng trong giỏ (${total}) vượt quá số lượng còn trong kho (${stock}).`;

/** Everything the cart screen needs about an offer, in one read. */
export const offerInclude = {
  vendor: { select: { id: true, name: true, slug: true, district: true, province: true, status: true } },
  variant: {
    select: {
      name: true,
      unit: true,
      sizeLabel: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          images: {
            select: { imageUrl: true, isPrimary: true },
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
    },
  },
} satisfies Prisma.VendorOfferInclude;

export type OfferRow = Prisma.VendorOfferGetPayload<{ include: typeof offerInclude }>;

export interface Line {
  /** The cart line on the server; null for a guest cart that is only being priced. */
  id: string | null;
  offer: OfferRow;
  quantity: Prisma.Decimal;
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Why an offer cannot be bought at all (whatever the quantity), or null. */
export function offerProblem(offer: OfferRow): string | null {
  if (offer.vendor.status !== 'ACTIVE') return VENDOR_NOT_SELLING_MESSAGE;
  if (
    offer.status !== 'ACTIVE' ||
    !offer.variant.isActive ||
    offer.variant.product.status !== 'ACTIVE'
  ) {
    return OFFER_UNAVAILABLE;
  }
  if (offer.stock.lte(0)) return OUT_OF_STOCK;
  return null;
}

/** Why a line cannot be bought with this quantity, or null. */
export function lineProblem(offer: OfferRow, quantity: Prisma.Decimal): string | null {
  const problem = offerProblem(offer);
  if (problem) return problem;
  if (quantity.gt(offer.stock)) {
    return `Chỉ còn ${offer.stock.toString()} ${offer.variant.unit} trong kho, vui lòng giảm số lượng.`;
  }
  return null;
}
