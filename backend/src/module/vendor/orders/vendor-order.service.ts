import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DAY_MS, vietnamDayStart } from '../../../common/utils/vietnam-date.js';
import {
  OrderLifecycleService,
  VENDOR_ORDER_NOT_FOUND,
} from '../../order/order-lifecycle.service.js';
import {
  orderItemSelect,
  paymentSelect,
  shipmentSelect,
  toOrderItemDto,
  toPaymentDto,
  toShipmentDto,
} from '../../order/order-mapping.js';
import {
  acceptBlockedReason,
  allowedVendorActions,
  VENDOR_ORDER_STATUSES,
} from '../../order/order-status.js';
import { searchTokens } from '../../product/product-listing.service.js';
import { VENDOR_LIST_DEFAULT_PAGE_SIZE } from '../offers/dto/vendor-offer.dto.js';
import type {
  UpdateVendorOrderStatusDto,
  VendorOrderDetailDto,
  VendorOrderListDto,
  VendorOrderListItemDto,
  VendorOrderQueryDto,
  VendorOrderSummaryDto,
} from './dto/vendor-order.dto.js';
import {
  canVendorWrite,
  findOwnVendor,
  findWritableVendor,
  pageWindow,
} from '../shared/vendor-access.js';
import { matchesKeywords } from '../offers/vendor-offer.service.js';

export const INVALID_DATE_RANGE = 'Khoảng ngày không hợp lệ.';

const listSelect = {
  id: true,
  status: true,
  grandTotal: true,
  createdAt: true,
  order: {
    select: {
      orderNumber: true,
      recipientName: true,
      recipientPhone: true,
      payment: { select: paymentSelect },
    },
  },
  items: {
    orderBy: { productNameSnapshot: 'asc' },
    select: {
      productNameSnapshot: true,
      variantNameSnapshot: true,
      quantity: true,
      unitSnapshot: true,
    },
  },
} satisfies Prisma.VendorOrderSelect;

/** Only this vendor order: the customer order's other vendor orders are never selected. */
const detailSelect = {
  id: true,
  status: true,
  subtotal: true,
  shippingFee: true,
  grandTotal: true,
  vendorNote: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      orderNumber: true,
      customerNote: true,
      recipientName: true,
      recipientPhone: true,
      shippingAddress: true,
      shippingWard: true,
      shippingDistrict: true,
      shippingProvince: true,
      payment: { select: paymentSelect },
    },
  },
  items: { orderBy: { productNameSnapshot: 'asc' }, select: orderItemSelect },
  shipment: { select: shipmentSelect },
} satisfies Prisma.VendorOrderSelect;

type ListRow = Prisma.VendorOrderGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.VendorOrderGetPayload<{ select: typeof detailSelect }>;

function toListItem(row: ListRow): VendorOrderListItemDto {
  const first = row.items[0];
  return {
    id: row.id,
    orderNumber: row.order.orderNumber,
    createdAt: row.createdAt.toISOString(),
    recipientName: row.order.recipientName,
    recipientPhone: row.order.recipientPhone,
    itemCount: row.items.length,
    firstItem: first
      ? {
          productName: first.productNameSnapshot,
          variantName: first.variantNameSnapshot,
          quantity: first.quantity.toString(),
          unit: first.unitSnapshot,
        }
      : null,
    grandTotal: row.grandTotal.toFixed(2),
    status: row.status,
    payment: toPaymentDto(row.order.payment),
  };
}

function toDetail(row: DetailRow, writable: boolean): VendorOrderDetailDto {
  const payment = row.order.payment;
  return {
    id: row.id,
    orderNumber: row.order.orderNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status,
    customerNote: row.order.customerNote,
    vendorNote: row.vendorNote,
    recipient: {
      name: row.order.recipientName,
      phone: row.order.recipientPhone,
      address: row.order.shippingAddress,
      ward: row.order.shippingWard,
      district: row.order.shippingDistrict,
      province: row.order.shippingProvince,
    },
    items: row.items.map(toOrderItemDto),
    subtotal: row.subtotal.toFixed(2),
    shippingFee: row.shippingFee.toFixed(2),
    grandTotal: row.grandTotal.toFixed(2),
    payment: toPaymentDto(payment),
    shipment: toShipmentDto(row.shipment),
    allowedActions: writable ? allowedVendorActions(row.status, payment) : [],
    acceptBlockedReason:
      row.status === 'PENDING' ? acceptBlockedReason(payment) : null,
  };
}

/**
 * The signed-in vendor's own orders (its VendorOrder rows, never the whole
 * customer order). The store is always found from the token's owner.
 */
@Injectable()
export class VendorOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async listOrders(
    userId: string,
    query: VendorOrderQueryDto,
  ): Promise<VendorOrderListDto> {
    const vendor = await findOwnVendor(this.prisma, userId);
    const where: Prisma.VendorOrderWhereInput = {
      vendorId: vendor.id,
      ...(query.status && { status: query.status }),
    };
    const createdAt = this.dateRange(query.from, query.to);
    if (createdAt) where.createdAt = createdAt;

    const pageSize = query.pageSize ?? VENDOR_LIST_DEFAULT_PAGE_SIZE;
    const orderBy: Prisma.VendorOrderOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'asc' },
    ];
    const keywords = searchTokens(query.search);

    let pageIds: string[];
    let pagination: VendorOrderListDto['pagination'];
    if (keywords.length === 0) {
      const totalItems = await this.prisma.vendorOrder.count({ where });
      const window = pageWindow(totalItems, query.page, pageSize);
      pagination = window.pagination;
      const ids = await this.prisma.vendorOrder.findMany({
        where,
        orderBy,
        skip: window.skip,
        take: pageSize,
        select: { id: true },
      });
      pageIds = ids.map((row) => row.id);
    } else {
      // Accent-insensitive search, in memory like the offer list: first the searchable text, then one page.
      const candidates = await this.prisma.vendorOrder.findMany({
        where,
        orderBy,
        select: {
          id: true,
          order: {
            select: {
              orderNumber: true,
              recipientName: true,
              recipientPhone: true,
            },
          },
        },
      });
      const matched = candidates.filter(({ order }) =>
        matchesKeywords(
          [order.orderNumber, order.recipientName, order.recipientPhone],
          keywords,
        ),
      );
      const window = pageWindow(matched.length, query.page, pageSize);
      pagination = window.pagination;
      pageIds = matched
        .slice(window.skip, window.skip + pageSize)
        .map((row) => row.id);
    }

    const [rows, summary] = await Promise.all([
      pageIds.length
        ? this.prisma.vendorOrder.findMany({
            where: { id: { in: pageIds }, vendorId: vendor.id },
            select: listSelect,
          })
        : Promise.resolve([] as ListRow[]),
      this.summarize(vendor.id),
    ]);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((row) => row !== undefined)
        .map(toListItem),
      summary,
      pagination,
    };
  }

  /** Read-only stores can still look at their orders; they just get no actions. */
  async getOrder(userId: string, id: string): Promise<VendorOrderDetailDto> {
    const vendor = await findOwnVendor(this.prisma, userId);
    const row = await this.prisma.vendorOrder.findFirst({
      where: { id, vendorId: vendor.id },
      select: detailSelect,
    });
    if (!row) throw new NotFoundException(VENDOR_ORDER_NOT_FOUND);
    return toDetail(row, canVendorWrite(vendor.status));
  }

  /** 403 for a suspended or rejected store, 404 for another store's order, 409 when the rules refuse. */
  async changeStatus(
    userId: string,
    id: string,
    dto: UpdateVendorOrderStatusDto,
  ): Promise<VendorOrderDetailDto> {
    const vendor = await findWritableVendor(this.prisma, userId);
    await this.lifecycle.changeVendorOrderStatus({
      vendorOrderId: id,
      vendorId: vendor.id,
      to: dto.status,
      note: dto.note,
    });
    return this.getOrder(userId, id);
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | null {
    if (!from && !to) return null;
    const start = from ? vietnamDayStart(from) : undefined;
    const endDay = to ? vietnamDayStart(to) : undefined;
    if (start === null || endDay === null) {
      throw new BadRequestException(INVALID_DATE_RANGE);
    }
    const end = endDay ? new Date(endDay.getTime() + DAY_MS) : undefined;
    if (start && end && start >= end) {
      throw new BadRequestException(INVALID_DATE_RANGE);
    }
    return { ...(start && { gte: start }), ...(end && { lt: end }) };
  }

  /** Counts per status over every order of the store, whatever the filters. */
  private async summarize(vendorId: string): Promise<VendorOrderSummaryDto> {
    const grouped = await this.prisma.vendorOrder.groupBy({
      by: ['status'],
      where: { vendorId },
      _count: { _all: true },
    });
    const summary = Object.fromEntries(
      VENDOR_ORDER_STATUSES.map((status) => [
        status,
        grouped.find((row) => row.status === status)?._count._all ?? 0,
      ]),
    ) as Omit<VendorOrderSummaryDto, 'total'>;
    return {
      total: grouped.reduce((sum, row) => sum + row._count._all, 0),
      ...summary,
    };
  }
}
