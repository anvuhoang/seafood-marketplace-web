import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CategoryModule } from '../category/category.module.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { ProductListingService } from './product-listing.service.js';
import { RegionController } from './region.controller.js';
import { ProductSuggestController } from './product-suggest.controller.js';
import { SearchModule } from '../search/search.module.js';

@Module({
  imports: [PrismaModule, CategoryModule, SearchModule],
  controllers: [ProductController, RegionController, ProductSuggestController],
  providers: [ProductService, ProductListingService],
  exports: [ProductService, ProductListingService],
})
export class ProductModule {}
