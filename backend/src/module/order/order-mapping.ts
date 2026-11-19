import type { Prisma } from '@prisma/client';
import type {
  OrderItemDto,
  OrderPaymentDto,
  OrderShipmentDto,
} from './dto/order-common.dto.js';

/** Order lines with their snapshot, plus the product's current image and slug. */
export const orderItemSelect = {
  id: true,
  productNameSnapshot: true,
  variantNameSnapshot: true,
  unitSnapshot: true,
  unitPrice: true,
  quantity: true,
  lineTotal: true,
  offer: {
    select: {
      variant: {
        select: {
          product: {
            select: {
              slug: true,
              images: {
                select: { imageUrl: true, isPrimary: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderItemSelect;

export const paymentSelect = {
  method: true,
  status: true,
  paidAt: true,
} satisfies Prisma.PaymentSelect;

export const shipmentSelect = {
  status: true,
  carrier: true,
  trackingNumber: true,
  shippedAt: true,
  deliveredAt: true,
} satisfies Prisma.ShipmentSelect;

type ItemRow = Prisma.OrderItemGetPayload<{ select: typeof orderItemSelect }>;
type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type ShipmentRow = Prisma.ShipmentGetPayload<{ select: typeof shipmentSelect }>;

export function toOrderItemDto(item: ItemRow): OrderItemDto {
  const { product } = item.offer.variant;
  const image =
    product.images.find((row) => row.isPrimary) ?? product.images[0];
  return {
    id: item.id,
    productName: item.productNameSnapshot,
    variantName: item.variantNameSnapshot,
    unit: item.unitSnapshot,
    imageUrl: image?.imageUrl ?? null,
    productSlug: product.slug,
    unitPrice: item.unitPrice.toFixed(2),
    quantity: item.quantity.toString(),
    lineTotal: item.lineTotal.toFixed(2),
  };
}

export function toPaymentDto(row: PaymentRow | null): OrderPaymentDto | null {
  return row
    ? {
        method: row.method,
        status: row.status,
        paidAt: row.paidAt?.toISOString() ?? null,
      }
    : null;
}

export function toShipmentDto(row: ShipmentRow | null): OrderShipmentDto | null {
  return row
    ? {
        status: row.status,
        carrier: row.carrier,
        trackingNumber: row.trackingNumber,
        shippedAt: row.shippedAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
      }
    : null;
}
