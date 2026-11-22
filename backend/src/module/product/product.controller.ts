import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service.js';
import { ProductListingService } from './product-listing.service.js';
import { ProductDetailDto } from './dto/product-detail.dto.js';
import { ProductListingQueryDto } from './dto/product-listing.dto.js';
import { ProductListingDto } from './dto/product-listing.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productListingService: ProductListingService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List products for sale with filters, facets, sorting and pagination',
  })
  @ApiResponse({ status: 200, description: 'Product listing retrieved', type: ProductListingDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async listProducts(@Query() query: ProductListingQueryDto): Promise<ProductListingDto> {
    return this.productListingService.listProducts(query);
  }

  @Public()
  @Get(':identifier')
  @ApiOperation({
    summary: 'Retrieve seafood product details by ID or slug',
    description:
      'Fetches full product details including variants, active vendor offers, media, specs, and stock info.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'Product UUID or human-readable slug',
    example: 'tom-su-bien-tuoi-song-loai-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details successfully retrieved',
    type: ProductDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductDetail(
    @Param('identifier') identifier: string,
  ): Promise<ProductDetailDto> {
    return this.productService.findByIdOrSlug(identifier);
  }
}
