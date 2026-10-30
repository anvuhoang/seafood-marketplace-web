import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VendorService } from './vendor.service.js';
import type { VendorStorefrontDto, VendorSummaryDto } from './dto/vendor-storefront.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved (ACTIVE) vendors for public discovery' })
  @ApiResponse({ status: 200, description: 'Active vendors retrieved' })
  async listVendors(): Promise<VendorSummaryDto[]> {
    return this.vendorService.listActiveVendors();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Retrieve a public vendor storefront by slug',
    description:
      'Returns vendor profile, categories and products. Products are only returned for ACTIVE vendors.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Vendor slug',
    example: 'vua-thuy-san-phu-quoc-xanh',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter products by category slug',
  })
  @ApiResponse({ status: 200, description: 'Storefront retrieved' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getStorefront(
    @Param('slug') slug: string,
    @Query('category') category?: string,
  ): Promise<VendorStorefrontDto> {
    return this.vendorService.getStorefront(slug, category);
  }
}
