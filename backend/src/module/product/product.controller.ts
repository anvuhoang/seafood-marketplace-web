import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from './product.service.js';
import type { ProductDetailDto } from './dto/product-detail.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
