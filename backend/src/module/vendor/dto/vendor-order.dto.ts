import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VendorOrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import {
  OrderItemDto,
  OrderPaymentDto,
  OrderShipmentDto,
} from '../../order/dto/order-common.dto.js';
import {
  VENDOR_ORDER_STATUSES,
  VENDOR_ORDER_TARGETS,
  type VendorOrderTarget,
} from '../../order/order-status.js';
import { PageQueryDto, trimOrUndefined } from './vendor-offer.dto.js';

export const VENDOR_NOTE_MAX_LENGTH = 500;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Filters for the vendor's own order list. `search` matches order number, recipient name or phone. */
export class VendorOrderQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: VENDOR_ORDER_STATUSES })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsIn(VENDOR_ORDER_STATUSES, { message: 'Trạng thái đơn hàng không hợp lệ.' })
  status?: VendorOrderStatus;

  /** First day included, Vietnam time (YYYY-MM-DD). */
  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @Matches(DATE_PATTERN, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD.' })
  from?: string;

  /** Last day included, Vietnam time (YYYY-MM-DD). */
  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @Matches(DATE_PATTERN, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD.' })
  to?: string;
}

export class VendorOrderFirstItemDto {
  /** @example "Tôm sú biển tươi sống" */
  productName: string;
  /** @example "Loại 1" */
  variantName: string;
  /** @example "2" */
  quantity: string;
  /** @example "kg" */
  unit: string;
}

/** One row of the vendor's order list. */
export class VendorOrderListItemDto {
  /** The vendor order id, used in /vendors/me/orders/:id. @example "4d5e6f70-8192-4abc-8def-0a1b2c3d4e5f" */
  id: string;
  /** @example "HSE-90001" */
  orderNumber: string;
  /** ISO 8601. @example "2026-11-17T08:30:00.000Z" */
  createdAt: string;
  /** @example "Phạm Thu Hà" */
  recipientName: string;
  /** @example "0901000003" */
  recipientPhone: string;
  /** Number of lines. @example 2 */
  itemCount: number;
  firstItem: VendorOrderFirstItemDto | null;
  /** This vendor's total only, VND. @example "840000.00" */
  grandTotal: string;
  @ApiProperty({ enum: VENDOR_ORDER_STATUSES, example: 'PENDING' })
  status: VendorOrderStatus;
  payment: OrderPaymentDto | null;
}

/** Counts over every order of the store, whatever the filters. */
export class VendorOrderSummaryDto {
  /** @example 12 */
  total: number;
  /** @example 1 */
  PENDING: number;
  /** @example 1 */
  ACCEPTED: number;
  /** @example 0 */
  PREPARING: number;
  /** @example 1 */
  SHIPPING: number;
  /** @example 7 */
  COMPLETED: number;
  /** @example 2 */
  CANCELLED: number;
}

export class VendorOrderListDto {
  @ApiProperty({ type: VendorOrderListItemDto, isArray: true })
  items: VendorOrderListItemDto[];
  summary: VendorOrderSummaryDto;
  pagination: PaginationDto;
}

export class VendorOrderRecipientDto {
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

/**
 * One of the vendor's orders. Only this vendor's part: other vendors in the
 * same customer order and the order's overall total are never included.
 */
export class VendorOrderDetailDto {
  /** @example "4d5e6f70-8192-4abc-8def-0a1b2c3d4e5f" */
  id: string;
  /** @example "HSE-90001" */
  orderNumber: string;
  /** ISO 8601. @example "2026-11-17T08:30:00.000Z" */
  createdAt: string;
  /** ISO 8601, last change. @example "2026-11-17T09:00:00.000Z" */
  updatedAt: string;
  @ApiProperty({ enum: VENDOR_ORDER_STATUSES, example: 'PENDING' })
  status: VendorOrderStatus;
  /** @example "Giao giờ hành chính" */
  customerNote: string | null;
  /** @example null */
  vendorNote: string | null;
  recipient: VendorOrderRecipientDto;
  @ApiProperty({ type: OrderItemDto, isArray: true })
  items: OrderItemDto[];
  /** @example "840000.00" */
  subtotal: string;
  /** @example "0.00" */
  shippingFee: string;
  /** This vendor's total only. @example "840000.00" */
  grandTotal: string;
  payment: OrderPaymentDto | null;
  shipment: OrderShipmentDto | null;
  /** Next statuses the vendor may set now; empty when finished or the store is read-only. */
  @ApiProperty({ enum: VENDOR_ORDER_TARGETS, isArray: true, example: ['ACCEPTED', 'CANCELLED'] })
  allowedActions: VendorOrderTarget[];
  /** Why "accept" is not offered while the order is PENDING (unpaid, failed or refunded payment). @example null */
  acceptBlockedReason: string | null;
}

/** Move the order one step. Payment is never set here. */
export class UpdateVendorOrderStatusDto {
  @ApiProperty({ enum: VENDOR_ORDER_TARGETS, example: 'ACCEPTED' })
  @IsIn(VENDOR_ORDER_TARGETS, {
    message:
      'Trạng thái chỉ có thể là nhận đơn, đang chuẩn bị, đang giao, đã giao hoặc hủy.',
  })
  status: VendorOrderTarget;

  /** Saved as the vendor note, e.g. the reason for cancelling. Shown to the customer. */
  @ApiPropertyOptional({ maxLength: VENDOR_NOTE_MAX_LENGTH, example: 'Hết hàng tươi trong ngày' })
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString({ message: 'Ghi chú không hợp lệ.' })
  @MaxLength(VENDOR_NOTE_MAX_LENGTH, { message: 'Ghi chú tối đa 500 ký tự.' })
  note?: string;
}
