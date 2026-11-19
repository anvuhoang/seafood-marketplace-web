import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CUSTOMER_ORDER_DEFAULT_PAGE_SIZE,
  type CustomerOrderDetailDto,
  type CustomerOrderListDto,
  type CustomerOrderQueryDto,
  type CustomerOrderSummaryDto,
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
import { canCustomerCancel } from './order-status.js';

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
  ) {}

  async listOrders(
    userId: string,
    query: CustomerOrderQueryDto,
  ): Promise<CustomerOrderListDto> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status && { status: query.status }),
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
    };
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
