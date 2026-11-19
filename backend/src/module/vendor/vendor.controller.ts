import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VendorService } from './vendor.service.js';
import { FollowStateDto, VendorStorefrontDto, VendorSummaryDto } from './dto/vendor-storefront.dto.js';
import { VendorDashboardDto } from './dto/vendor-dashboard.dto.js';
import { UpdateVendorStoreDto, VendorStoreDto, VendorStoreUploadSignatureDto } from './dto/vendor-store.dto.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get('me/dashboard')
  @Roles('VENDOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated Vendor's dashboard statistics" })
  @ApiResponse({ status: 200, description: 'Vendor dashboard retrieved', type: VendorDashboardDto })
  @ApiResponse({ status: 403, description: 'Only Vendor accounts can access this dashboard' })
  @ApiResponse({ status: 404, description: 'No Vendor is linked to this account' })
  async getDashboard(
    @CurrentUser('sub') userId: string,
  ): Promise<VendorDashboardDto> {
    return this.vendorService.getDashboard(userId);
  }

  @Get('me/store')
  @Roles('VENDOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the signed-in vendor's own store profile",
    description: 'The store is looked up by the owner in the token; no store id is accepted from the client.',
  })
  @ApiResponse({ status: 200, description: 'Store profile retrieved', type: VendorStoreDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Only Vendor accounts can access this', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'This account has no store yet', type: ErrorResponseDto })
  async getMyStore(@CurrentUser('sub') userId: string): Promise<VendorStoreDto> {
    return this.vendorService.getMyStore(userId);
  }

  @Patch('me/store')
  @Roles('VENDOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update the signed-in vendor's own store profile",
    description:
      'Partial update. Omitted fields are kept and null clears optional fields. Slug and status cannot be changed. ' +
      'Logo and cover must be uploaded with POST /vendors/me/store/upload-signature. Suspended stores are read-only.',
  })
  @ApiResponse({ status: 200, description: 'Store profile updated', type: VendorStoreDto })
  @ApiResponse({ status: 400, description: 'Invalid fields, unknown fields (slug, status) or foreign image URL', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not a Vendor account, or the store is suspended', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'This account has no store yet', type: ErrorResponseDto })
  async updateMyStore(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateVendorStoreDto,
  ): Promise<VendorStoreDto> {
    return this.vendorService.updateMyStore(userId, dto);
  }

  @Post('me/store/upload-signature')
  @HttpCode(HttpStatus.OK)
  @Roles('VENDOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Signature for uploading one store logo or cover directly to Cloudinary" })
  @ApiResponse({ status: 200, description: 'Upload signature created', type: VendorStoreUploadSignatureDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Only Vendor accounts can access this', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'This account has no store yet', type: ErrorResponseDto })
  @ApiResponse({ status: 503, description: 'Image upload is not configured', type: ErrorResponseDto })
  async createStoreUploadSignature(@CurrentUser('sub') userId: string): Promise<VendorStoreUploadSignatureDto> {
    return this.vendorService.createStoreUploadSignature(userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved (ACTIVE) vendors for public discovery' })
  @ApiResponse({ status: 200, description: 'Active vendors retrieved', type: [VendorSummaryDto] })
  async listVendors(): Promise<VendorSummaryDto[]> {
    return this.vendorService.listActiveVendors();
  }

  @Get('followed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the vendors the signed-in customer follows' })
  @ApiResponse({ status: 200, description: 'Followed vendors retrieved', type: [VendorSummaryDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  async listFollowed(@CurrentUser('sub') userId: string): Promise<VendorSummaryDto[]> {
    return this.vendorService.listFollowedVendors(userId);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Retrieve a public vendor storefront by slug',
    description:
      'Returns vendor profile, categories and products. Only ACTIVE vendors have a public storefront; ' +
      'PENDING, REJECTED and SUSPENDED vendors return 404 like an unknown slug.',
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
  @ApiResponse({ status: 200, description: 'Storefront retrieved', type: VendorStorefrontDto })
  @ApiResponse({ status: 404, description: 'Vendor not found or not ACTIVE' })
  async getStorefront(
    @Param('slug') slug: string,
    @Query('category') category?: string,
  ): Promise<VendorStorefrontDto> {
    return this.vendorService.getStorefront(slug, category);
  }

  @Get(':slug/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whether the signed-in customer follows a vendor' })
  @ApiParam({ name: 'slug', description: 'Vendor slug', example: 'vua-thuy-san-phu-quoc-xanh' })
  @ApiResponse({ status: 200, description: 'Follow state retrieved', type: FollowStateDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async getFollowState(@Param('slug') slug: string, @CurrentUser('sub') userId: string): Promise<FollowStateDto> {
    return this.vendorService.getFollowState(slug, userId);
  }

  @Put(':slug/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a vendor (no-op if already following)' })
  @ApiParam({ name: 'slug', description: 'Vendor slug', example: 'vua-thuy-san-phu-quoc-xanh' })
  @ApiResponse({ status: 200, description: 'Now following', type: FollowStateDto })
  @ApiResponse({ status: 400, description: 'Vendor is not open for business yet' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async follow(@Param('slug') slug: string, @CurrentUser('sub') userId: string): Promise<FollowStateDto> {
    return this.vendorService.follow(slug, userId);
  }

  @Delete(':slug/follow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop following a vendor (no-op if not following)' })
  @ApiParam({ name: 'slug', description: 'Vendor slug', example: 'vua-thuy-san-phu-quoc-xanh' })
  @ApiResponse({ status: 200, description: 'No longer following', type: FollowStateDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async unfollow(@Param('slug') slug: string, @CurrentUser('sub') userId: string): Promise<FollowStateDto> {
    return this.vendorService.unfollow(slug, userId);
  }
}
