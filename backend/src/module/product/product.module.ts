import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CategoryModule } from '../category/category.module.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';
import { ProductListingService } from './product-listing.service.js';
import { RegionController } from './region.controller.js';

@Module({
  imports: [PrismaModule, CategoryModule],
  controllers: [ProductController, RegionController],
  providers: [ProductService, ProductListingService],
  exports: [ProductService],
})
export class ProductModule {}
