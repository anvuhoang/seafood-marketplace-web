import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { AdminStatsService } from './admin-stats.service.js';
import {
  AdminOverviewDto,
  OrderStatsDto,
  ProductStatsDto,
  RevenueStatsDto,
  UserStatsDto,
  VendorStatsDto,
} from './dto/admin-stats.dto.js';

@ApiTags('Admin - Statistics')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'All dashboard statistics in one call',
    description: 'Users, vendors, products, orders and revenue, calculated from the database at request time.',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved', type: AdminOverviewDto })
  getOverview(): Promise<AdminOverviewDto> {
    return this.adminStatsService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Total user count, by role and by status' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved', type: UserStatsDto })
  getUsers(): Promise<UserStatsDto> {
    return this.adminStatsService.getUsers();
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Vendor count by approval status' })
  @ApiResponse({ status: 200, description: 'Vendor statistics retrieved', type: VendorStatsDto })
  getVendors(): Promise<VendorStatsDto> {
    return this.adminStatsService.getVendors();
  }

  @Get('products')
  @ApiOperation({ summary: 'Product count, in total and by status' })
  @ApiResponse({ status: 200, description: 'Product statistics retrieved', type: ProductStatsDto })
  getProducts(): Promise<ProductStatsDto> {
    return this.adminStatsService.getProducts();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Order count by status, plus orders placed in the last 30 days' })
  @ApiResponse({ status: 200, description: 'Order statistics retrieved', type: OrderStatsDto })
  getOrders(): Promise<OrderStatsDto> {
    return this.adminStatsService.getOrders();
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Revenue summary',
    description:
      'Revenue is the sum of paid payments minus refunded payments, with a monthly breakdown for the last 6 months.',
  })
  @ApiResponse({ status: 200, description: 'Revenue summary retrieved', type: RevenueStatsDto })
  getRevenue(): Promise<RevenueStatsDto> {
    return this.adminStatsService.getRevenue();
  }
}
