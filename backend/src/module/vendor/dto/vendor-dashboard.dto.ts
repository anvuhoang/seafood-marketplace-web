import { ApiProperty } from '@nestjs/swagger';
import { VendorOrderStatus } from '@prisma/client';

export class VendorDashboardVendorDto {
  name: string;
  slug: string;
}

export class VendorDashboardSummaryDto {
  productCount: number;
  orderCount: number;
  ordersNeedingActionCount: number;
  /** Decimal string, fixed to two decimal places. */
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

  @ApiProperty({ type: VendorDashboardOrderDto, isArray: true })
  ordersNeedingAction: VendorDashboardOrderDto[];

  @ApiProperty({ type: VendorDashboardLowStockOfferDto, isArray: true })
  lowStockOffers: VendorDashboardLowStockOfferDto[];
}
