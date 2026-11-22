import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdminVendorService } from './admin-vendor.service.js';
import {
  AdminVendorDetailDto,
  AdminVendorListDto,
  AdminVendorListQueryDto,
  VendorDecisionReasonDto,
} from './dto/admin-vendor.dto.js';

const vendorIdParam = { name: 'id', description: 'Vendor id', format: 'uuid' } as const;

@ApiTags('Admin - Vendors')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/vendors')
export class AdminVendorController {
  constructor(private readonly adminVendorService: AdminVendorService) {}

  @Get()
  @ApiOperation({
    summary: 'List vendors by status',
    description: 'Paginated; `counts` holds the size of every status tab regardless of the status filter.',
  })
  @ApiResponse({ status: 200, description: 'Vendors retrieved', type: AdminVendorListDto })
  list(@Query() query: AdminVendorListQueryDto): Promise<AdminVendorListDto> {
    return this.adminVendorService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor details with owner and decision history' })
  @ApiParam(vendorIdParam)
  @ApiResponse({ status: 200, description: 'Vendor retrieved', type: AdminVendorDetailDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  getDetail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminVendorDetailDto> {
    return this.adminVendorService.getDetail(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Approve a pending vendor',
    description: 'Sets the store to ACTIVE and the owner role to VENDOR in one transaction.',
  })
  @ApiParam(vendorIdParam)
  @ApiResponse({ status: 200, description: 'Vendor approved', type: AdminVendorDetailDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'The vendor is not PENDING' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') adminId: string) {
    return this.adminVendorService.approve(id, adminId);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a pending vendor with a reason' })
  @ApiParam(vendorIdParam)
  @ApiResponse({ status: 200, description: 'Vendor rejected', type: AdminVendorDetailDto })
  @ApiResponse({ status: 400, description: 'Reason missing or too short' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'The vendor is not PENDING' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: VendorDecisionReasonDto,
  ) {
    return this.adminVendorService.reject(id, adminId, dto.reason);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Suspend an active vendor',
    description: 'Sets the store to SUSPENDED and returns the owner to the CUSTOMER role in one transaction.',
  })
  @ApiParam(vendorIdParam)
  @ApiResponse({ status: 200, description: 'Vendor suspended', type: AdminVendorDetailDto })
  @ApiResponse({ status: 400, description: 'Reason missing or too short' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'The vendor is not ACTIVE' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: VendorDecisionReasonDto,
  ) {
    return this.adminVendorService.suspend(id, adminId, dto.reason);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reactivate a suspended vendor',
    description: 'Sets the store back to ACTIVE and the owner role back to VENDOR in one transaction.',
  })
  @ApiParam(vendorIdParam)
  @ApiResponse({ status: 200, description: 'Vendor reactivated', type: AdminVendorDetailDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'The vendor is not SUSPENDED' })
  reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') adminId: string) {
    return this.adminVendorService.reactivate(id, adminId);
  }
}
