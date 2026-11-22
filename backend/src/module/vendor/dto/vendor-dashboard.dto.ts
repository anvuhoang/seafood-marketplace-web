import { ApiProperty } from '@nestjs/swagger';
import { VendorOrderStatus } from '@prisma/client';

export class VendorDashboardVendorDto {
  name: string;
  slug: string;
}

export class VendorDashboardSummaryDto {
  productCount: number;
  orderCount: number;
  /** Every PENDING or ACCEPTED order, even when `ordersNeedingAction` lists only the first few. */
  ordersNeedingActionCount: number;
  /** Every ACTIVE offer at or below `lowStockThreshold`, even when `lowStockOffers` lists only the first few. */
  lowStockCount: number;
  /** @example 5 */
  lowStockThreshold: number;
  /** Subtotal of COMPLETED orders, shipping fees excluded. Decimal string, fixed to two decimal places. */
  revenue: string;
}

export class VendorDashboardStatusCountDto {
  @ApiProperty({ enum: VendorOrderStatus })
  status: VendorOrderStatus;
  count: number;
}

export class VendorDashboardOrderItemDto {
  productName: string;
  variantName: string;
  quantity: string;
  unit: string;
  /** Decimal string, fixed to two decimal places. */
  lineTotal: string;
}

export class VendorDashboardOrderDto {
  id: string;
  orderNumber: string;

  @ApiProperty({ enum: VendorOrderStatus })
  status: VendorOrderStatus;

  createdAt: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  /** VendorOrder subtotal as a decimal string, excluding shipping fees. */
  subtotal: string;

  @ApiProperty({ type: VendorDashboardOrderItemDto, isArray: true })
  items: VendorDashboardOrderItemDto[];
}

export class VendorDashboardLowStockOfferDto {
  id: string;
  productName: string;
  variantName: string;
  /** Decimal string to preserve the database scale. */
  stock: string;
  unit: string;
}

export class VendorDashboardDto {
  vendor: VendorDashboardVendorDto;
  summary: VendorDashboardSummaryDto;

  @ApiProperty({ type: VendorDashboardStatusCountDto, isArray: true })
  ordersByStatus: VendorDashboardStatusCountDto[];

  /** At most 5: PENDING before ACCEPTED, then the oldest first. */
  @ApiProperty({ type: VendorDashboardOrderDto, isArray: true })
  ordersNeedingAction: VendorDashboardOrderDto[];

  /** At most 8, lowest stock first. */
  @ApiProperty({ type: VendorDashboardLowStockOfferDto, isArray: true })
  lowStockOffers: VendorDashboardLowStockOfferDto[];
}
