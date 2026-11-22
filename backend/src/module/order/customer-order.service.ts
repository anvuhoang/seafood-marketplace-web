import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import {
  CUSTOMER_ORDER_DEFAULT_PAGE_SIZE,
  type CustomerOrderDetailDto,
  type CustomerOrderListDto,
  type CustomerOrderQueryDto,
  type CustomerOrderSummaryDto,
  type ReorderResultDto,
} from './dto/customer-order.dto.js';
import {
  ORDER_NOT_FOUND,
  OrderLifecycleService,
} from './order-lifecycle.service.js';
import {
  orderItemSelect,
  paymentSelect,
  shipmentSelect,
  toOrderItemDto,
  toPaymentDto,
  toShipmentDto,
} from './order-mapping.js';
import { ORDER_STATUSES, canCustomerCancel } from './order-status.js';

export const ORDER_NOTHING_TO_BUY = 'Đơn hàng này không có sản phẩm để mua lại.';

const summarySelect = {
  orderNumber: true,
  createdAt: true,
  status: true,
  grandTotal: true,
  payment: { select: paymentSelect },
  vendorOrders: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      subtotal: true,
      shippingFee: true,
      grandTotal: true,
      vendorNote: true,
      vendor: { select: { name: true, slug: true } },
      shipment: { select: shipmentSelect },
      items: {
        orderBy: { productNameSnapshot: 'asc' },
        select: { ...orderItemSelect, review: { select: { id: true } } },
      },
    },
  },
} satisfies Prisma.OrderSelect;

const detailSelect = {
  ...summarySelect,
  subtotal: true,
  shippingTotal: true,
  recipientName: true,
  recipientPhone: true,
  shippingAddress: true,
  shippingWard: true,
  shippingDistrict: true,
  shippingProvince: true,
  customerNote: true,
} satisfies Prisma.OrderSelect;

type SummaryRow = Prisma.OrderGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;

function toSummary(row: SummaryRow): CustomerOrderSummaryDto {
  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    grandTotal: row.grandTotal.toFixed(2),
    payment: toPaymentDto(row.payment),
    canCancel: canCustomerCancel(row.vendorOrders.map((vo) => vo.status)),
    vendorOrders: row.vendorOrders.map((vo) => ({
      id: vo.id,
      vendor: { name: vo.vendor.name, slug: vo.vendor.slug },
      status: vo.status,
      subtotal: vo.subtotal.toFixed(2),
      shippingFee: vo.shippingFee.toFixed(2),
      grandTotal: vo.grandTotal.toFixed(2),
      vendorNote: vo.vendorNote,
      shipment: toShipmentDto(vo.shipment),
      items: vo.items.map((item) => ({
        ...toOrderItemDto(item),
        reviewed: item.review !== null,
      })),
    })),
  };
}

function toDetail(row: DetailRow): CustomerOrderDetailDto {
  return {
    ...toSummary(row),
    recipient: {
      name: row.recipientName,
      phone: row.recipientPhone,
      address: row.shippingAddress,
      ward: row.shippingWard,
      district: row.shippingDistrict,
      province: row.shippingProvince,
    },
    customerNote: row.customerNote,
    subtotal: row.subtotal.toFixed(2),
    shippingTotal: row.shippingTotal.toFixed(2),
  };
}

/** The signed-in customer's own orders. Every query is scoped by the token's user id. */
@Injectable()
export class CustomerOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly cart: CartService,
  ) {}

  async listOrders(
    userId: string,
    query: CustomerOrderQueryDto,
  ): Promise<CustomerOrderListDto> {
    const search = query.q?.trim();
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status?.length && { status: { in: query.status } }),
      ...(query.paymentStatus && { payment: { status: query.paymentStatus } }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          {
            vendorOrders: {
              some: {
                items: {
                  some: { productNameSnapshot: { contains: search, mode: 'insensitive' } },
                },
              },
            },
          },
        ],
      }),
    };
    const pageSize = query.pageSize ?? CUSTOMER_ORDER_DEFAULT_PAGE_SIZE;
    const totalItems = await this.prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, query.page ?? 1), totalPages);

    const rows = await this.prisma.order.findMany({
      where,
      select: summarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: rows.map(toSummary),
      pagination: { page, limit: pageSize, totalItems, totalPages },
      statusCounts: await this.countByStatus(userId),
    };
  }

  /** The customer's orders per status, whatever the filters of the list are. */
  private async countByStatus(userId: string): Promise<Record<OrderStatus, number>> {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }

  /**
   * "Buy again": puts the lines of one of my orders into my cart. Lines that are no longer sold are left
   * out and quantities above the stock are lowered, and each is reported. 404 for someone else's order.
   */
  async reorder(userId: string, orderNumber: string): Promise<ReorderResultDto> {
    const row = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      select: { vendorOrders: { select: { items: { select: { offerId: true, quantity: true } } } } },
    });
    if (!row) throw new NotFoundException(ORDER_NOT_FOUND);
    const lines = row.vendorOrders.flatMap((part) =>
      part.items.map((item) => ({ offerId: item.offerId, quantity: item.quantity.toNumber() })),
    );
    if (lines.length === 0) throw new BadRequestException(ORDER_NOTHING_TO_BUY);

    const { cart, notices } = await this.cart.merge(userId, { items: lines });
    const added = new Set(lines.filter((line) => cart.items.some((item) => item.offerId === line.offerId)).map((line) => line.offerId)).size;
    return { added, skipped: new Set(lines.map((line) => line.offerId)).size - added, notices };
  }

  /** 404 for someone else's order too, so order numbers reveal nothing. */
  async getOrder(
    userId: string,
    orderNumber: string,
  ): Promise<CustomerOrderDetailDto> {
    const row = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      select: detailSelect,
    });
    if (!row) throw new NotFoundException(ORDER_NOT_FOUND);
    return toDetail(row);
  }

  async cancelOrder(
    userId: string,
    orderNumber: string,
  ): Promise<CustomerOrderDetailDto> {
    await this.lifecycle.cancelOrderByCustomer(userId, orderNumber);
    return this.getOrder(userId, orderNumber);
  }
}
