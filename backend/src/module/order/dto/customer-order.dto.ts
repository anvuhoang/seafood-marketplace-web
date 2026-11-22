import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OrderStatus, PaymentStatus, VendorOrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { ORDER_STATUSES, VENDOR_ORDER_STATUSES } from '../order-status.js';
import {
  OrderItemDto,
  OrderPaymentDto,
  OrderShipmentDto,
  PAYMENT_STATUSES,
} from './order-common.dto.js';

export const CUSTOMER_ORDER_DEFAULT_PAGE_SIZE = 10;
export const CUSTOMER_ORDER_MAX_PAGE_SIZE = 50;

const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/** "CONFIRMED,PROCESSING" becomes ["CONFIRMED", "PROCESSING"]; empty becomes undefined. */
const toList = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const list = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return list.length === 0 ? undefined : list;
};

export const CUSTOMER_ORDER_SEARCH_MAX = 100;

export class CustomerOrderQueryDto {
  /** The order's overall status. Several can be given, separated by commas (an order matches any of them). */
  @ApiPropertyOptional({ enum: ORDER_STATUSES, isArray: true, example: 'CONFIRMED,PROCESSING' })
  @IsOptional()
  @Transform(toList)
  @ArrayMaxSize(ORDER_STATUSES.length, { message: 'Trạng thái đơn hàng không hợp lệ.' })
  @IsIn(ORDER_STATUSES, { each: true, message: 'Trạng thái đơn hàng không hợp lệ.' })
  status?: OrderStatus[];

  /** Finds orders by their order number or by the name of a product in them. */
  @ApiPropertyOptional({ maxLength: CUSTOMER_ORDER_SEARCH_MAX, example: 'tôm sú' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString({ message: 'Từ khóa tìm kiếm không hợp lệ.' })
  @MaxLength(CUSTOMER_ORDER_SEARCH_MAX, { message: `Từ khóa tìm kiếm tối đa ${CUSTOMER_ORDER_SEARCH_MAX} ký tự.` })
  q?: string;

  /** The payment's status, which is kept apart from the order's status. */
  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsIn(PAYMENT_STATUSES, { message: 'Trạng thái thanh toán không hợp lệ.' })
  paymentStatus?: PaymentStatus;

  /** @example 1 */
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số trang phải là số nguyên.' })
  @Min(1, { message: 'Số trang phải từ 1 trở lên.' })
  page?: number;

  /** @example 10 */
  @ApiPropertyOptional({
    minimum: 1,
    maximum: CUSTOMER_ORDER_MAX_PAGE_SIZE,
    default: CUSTOMER_ORDER_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số đơn mỗi trang phải là số nguyên.' })
  @Min(1, { message: 'Số đơn mỗi trang phải từ 1 trở lên.' })
  @Max(CUSTOMER_ORDER_MAX_PAGE_SIZE, { message: 'Số đơn mỗi trang tối đa 50.' })
  pageSize?: number;
}

export class CustomerOrderVendorRefDto {
  /** @example "Vựa Thủy Sản Phú Quốc Xanh" */
  name: string;
  /** @example "vua-thuy-san-phu-quoc-xanh" */
  slug: string;
}

export class CustomerOrderItemDto extends OrderItemDto {
  /** The customer already reviewed this line. @example false */
  reviewed: boolean;
}

/** One vendor's part of the customer's order. */
export class CustomerVendorOrderDto {
  /** @example "4d5e6f70-8192-4abc-8def-0a1b2c3d4e5f" */
  id: string;
  vendor: CustomerOrderVendorRefDto;
  @ApiProperty({ enum: VENDOR_ORDER_STATUSES, example: 'PENDING' })
  status: VendorOrderStatus;
  /** VND, two decimals. @example "840000.00" */
  subtotal: string;
  /** @example "0.00" */
  shippingFee: string;
  /** @example "840000.00" */
  grandTotal: string;
  /** Note from the vendor, e.g. why it cancelled. @example null */
  vendorNote: string | null;
  shipment: OrderShipmentDto | null;
  @ApiProperty({ type: CustomerOrderItemDto, isArray: true })
  items: CustomerOrderItemDto[];
}

export class CustomerOrderSummaryDto {
  /** @example "HSE-90001" */
  orderNumber: string;
  /** ISO 8601. @example "2026-11-17T08:30:00.000Z" */
  createdAt: string;
  @ApiProperty({ enum: ORDER_STATUSES, example: 'PENDING' })
  status: OrderStatus;
  /** VND, two decimals. @example "840000.00" */
  grandTotal: string;
  payment: OrderPaymentDto | null;
  /** True while every vendor part still running is waiting for confirmation. @example true */
  canCancel: boolean;
  @ApiProperty({ type: CustomerVendorOrderDto, isArray: true })
  vendorOrders: CustomerVendorOrderDto[];
}

export class CustomerOrderListDto {
  @ApiProperty({ type: CustomerOrderSummaryDto, isArray: true })
  items: CustomerOrderSummaryDto[];
  pagination: PaginationDto;
  /**
   * How many orders the customer has in each status, ignoring the filters of this request (for the tab
   * counters). Every status is present, with 0 when there is none.
   */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { PENDING: 1, CONFIRMED: 0, PROCESSING: 0, SHIPPING: 1, COMPLETED: 3, CANCELLED: 1 },
  })
  statusCounts: Record<OrderStatus, number>;
}

/** The answer of "buy again": what went into the cart and what had to be left out or lowered. */
export class ReorderResultDto {
  /** Lines of the order that are now in the cart. @example 2 */
  added: number;
  /** Lines that could not be added (no longer sold, out of stock). @example 1 */
  skipped: number;
  /** Short Vietnamese notes about what was left out or lowered. */
  notices: string[];
}

export class CustomerOrderRecipientDto {
  /** @example "Phạm Thu Hà" */
  name: string;
  /** @example "0901000003" */
  phone: string;
  /** @example "42 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh" */
  address: string;
  /** @example "Phường Bến Thành" */
  ward: string | null;
  /** @example "Quận 1" */
  district: string;
  /** @example "TP. Hồ Chí Minh" */
  province: string;
}

export class CustomerOrderDetailDto extends CustomerOrderSummaryDto {
  recipient: CustomerOrderRecipientDto;
  /** @example "Giao giờ hành chính" */
  customerNote: string | null;
  /** @example "840000.00" */
  subtotal: string;
  /** @example "0.00" */
  shippingTotal: string;
}
