import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  CreateVendorOfferDto,
  UpdateVendorOfferDto,
  UpdateVendorOfferStatusDto,
  VendorCatalogListDto,
  VendorCatalogQueryDto,
  VendorOfferDto,
  VendorOfferListDto,
  VendorOfferQueryDto,
} from './dto/vendor-offer.dto.js';
import {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  VendorProductDto,
} from './dto/vendor-product.dto.js';
import { VendorStoreUploadSignatureDto } from './dto/vendor-store.dto.js';
import { OFFER_NOT_FOUND, VendorOfferService } from './vendor-offer.service.js';
import {
  PRODUCT_NOT_FOUND,
  VendorProductService,
} from './vendor-product.service.js';

/** A malformed id is answered like someone else's id: not found. */
const offerIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(OFFER_NOT_FOUND),
});
const productIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(PRODUCT_NOT_FOUND),
});

const ApiNoToken = () =>
  ApiResponse({
    status: 401,
    description: 'Missing or invalid token',
    type: ErrorResponseDto,
  });
const ApiNotVendor = () =>
  ApiResponse({
    status: 403,
    description: 'Not a Vendor account',
    type: ErrorResponseDto,
  });
const ApiReadOnly = () =>
  ApiResponse({
    status: 403,
    description:
      'Not a Vendor account, or the store is suspended or rejected (read-only)',
    type: ErrorResponseDto,
  });

/**
 * The signed-in vendor's products, prices and stock. Every route finds the
 * store from the token's owner; no store id is ever accepted from the client.
 */
@ApiTags('Vendor products')
@ApiBearerAuth()
@Roles('VENDOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors/me')
export class VendorOfferController {
  constructor(
    private readonly offers: VendorOfferService,
    private readonly products: VendorProductService,
  ) {}

  @Get('offers')
  @ApiOperation({
    summary: "List the signed-in vendor's offers",
    description:
      'Accent-insensitive search on product, variant and category names. Discontinued offers are hidden ' +
      'unless status=DISCONTINUED. `summary` counts every offer of the store, whatever the filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Offers retrieved',
    type: VendorOfferListDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiNotVendor()
  @ApiResponse({
    status: 404,
    description: 'This account has no store yet',
    type: ErrorResponseDto,
  })
  async listOffers(
    @CurrentUser('sub') userId: string,
    @Query() query: VendorOfferQueryDto,
  ): Promise<VendorOfferListDto> {
    return this.offers.listOffers(userId, query);
  }

  @Post('offers')
  @ApiOperation({
    summary: 'Start selling one variant',
    description:
      'The variant must be active, on a published product.',
  })
  @ApiResponse({
    status: 201,
    description: 'Offer created',
    type: VendorOfferDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid price, stock or status',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'No store, or the variant cannot be offered',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'The vendor already has an offer on this variant (maybe discontinued)',
    type: ErrorResponseDto,
  })
  async createOffer(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVendorOfferDto,
  ): Promise<VendorOfferDto> {
    return this.offers.createOffer(userId, dto);
  }

  @Patch('offers/:id')
  @ApiOperation({ summary: 'Change the price and/or stock of one own offer' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Offer updated',
    type: VendorOfferDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid price or stock',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'No such offer in this store',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'The offer is discontinued',
    type: ErrorResponseDto,
  })
  async updateOffer(
    @CurrentUser('sub') userId: string,
    @Param('id', offerIdPipe) id: string,
    @Body() dto: UpdateVendorOfferDto,
  ): Promise<VendorOfferDto> {
    return this.offers.updateOffer(userId, id, dto);
  }

  @Patch('offers/:id/status')
  @ApiOperation({
    summary: 'Pause, resume or discontinue one own offer',
    description:
      'DISCONTINUED is final. It changes the offer only: orders, payments and carts are not touched.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Status changed',
    type: VendorOfferDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'No such offer in this store',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'The offer is already discontinued',
    type: ErrorResponseDto,
  })
  async changeOfferStatus(
    @CurrentUser('sub') userId: string,
    @Param('id', offerIdPipe) id: string,
    @Body() dto: UpdateVendorOfferStatusDto,
  ): Promise<VendorOfferDto> {
    return this.offers.changeStatus(userId, id, dto);
  }

  @Get('catalog/products')
  @ApiOperation({
    summary: 'Search products the vendor can add an offer to',
    description:
      'Published products, with active variants and `alreadyOffered`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Catalog page retrieved',
    type: VendorCatalogListDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiNotVendor()
  @ApiResponse({
    status: 404,
    description: 'This account has no store yet',
    type: ErrorResponseDto,
  })
  async searchCatalog(
    @CurrentUser('sub') userId: string,
    @Query() query: VendorCatalogQueryDto,
  ): Promise<VendorCatalogListDto> {
    return this.offers.searchCatalog(userId, query);
  }

  @Post('products/upload-signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Signature for uploading one product image directly to Cloudinary',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload signature created',
    type: VendorStoreUploadSignatureDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'This account has no store yet',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Image upload is not configured',
    type: ErrorResponseDto,
  })
  async createProductUploadSignature(
    @CurrentUser('sub') userId: string,
  ): Promise<VendorStoreUploadSignatureDto> {
    return this.products.createUploadSignature(userId);
  }

  @Post('products')
  @ApiOperation({
    summary: 'Add a new product (published as soon as it is saved)',
    description:
      'Creates the product as ACTIVE (no admin approval) with its variants and, per variant, an optional offer, in one transaction. ' +
      'Images must come from POST /vendors/me/products/upload-signature.',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft created',
    type: VendorProductDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid fields, inactive category, foreign image URL or duplicate variant',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'This account has no store yet',
    type: ErrorResponseDto,
  })
  async createProduct(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVendorProductDto,
  ): Promise<VendorProductDto> {
    return this.products.createProduct(userId, dto);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one product this vendor created' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Draft retrieved',
    type: VendorProductDto,
  })
  @ApiNoToken()
  @ApiNotVendor()
  @ApiResponse({
    status: 404,
    description: 'Not a product of this vendor',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Already published by an admin; contact the admin',
    type: ErrorResponseDto,
  })
  async getProduct(
    @CurrentUser('sub') userId: string,
    @Param('id', productIdPipe) id: string,
  ): Promise<VendorProductDto> {
    return this.products.getProduct(userId, id);
  }

  @Patch('products/:id')
  @ApiOperation({
    summary: 'Edit one product this vendor created',
    description:
      'Omitted fields are kept; categoryIds, images and variants replace the whole list when sent. ' +
      'A variant left out is removed, unless it is in a cart or an order (409).',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Draft updated',
    type: VendorProductDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid fields, inactive category, foreign image URL or unknown variant',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiReadOnly()
  @ApiResponse({
    status: 404,
    description: 'Not a product of this vendor',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Already published, or a removed variant is in use',
    type: ErrorResponseDto,
  })
  async updateProduct(
    @CurrentUser('sub') userId: string,
    @Param('id', productIdPipe) id: string,
    @Body() dto: UpdateVendorProductDto,
  ): Promise<VendorProductDto> {
    return this.products.updateProduct(userId, id, dto);
  }
}
