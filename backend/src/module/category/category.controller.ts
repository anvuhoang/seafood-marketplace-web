import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoryService, DEFAULT_PAGE_SIZE } from './category.service.js';
import { CategoryListingDto, CategorySummaryDto } from './dto/category.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active seafood categories with product counts' })
  @ApiResponse({ status: 200, description: 'Active categories retrieved', type: [CategorySummaryDto] })
  async listCategories(): Promise<CategorySummaryDto[]> {
    return this.categoryService.listCategories();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'List products for sale in an active category' })
  @ApiParam({ name: 'slug', example: 'tom-song' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: DEFAULT_PAGE_SIZE })
  @ApiResponse({ status: 200, description: 'Category products retrieved', type: CategoryListingDto })
  @ApiResponse({ status: 404, description: 'Category not found or inactive' })
  async getCategoryListing(
    @Param('slug') slug: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(DEFAULT_PAGE_SIZE), ParseIntPipe) limit: number,
  ): Promise<CategoryListingDto> {
    return this.categoryService.getCategoryListing(slug, page, limit);
  }
}
