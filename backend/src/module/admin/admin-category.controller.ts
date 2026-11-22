import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { AdminCategoryService } from './admin-category.service.js';
import {
  AdminCategoryDto,
  AdminCategoryListDto,
  AdminCategoryListQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/admin-category.dto.js';

const categoryIdParam = { name: 'id', description: 'Category id', format: 'uuid' } as const;

@ApiTags('Admin - Categories')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly adminCategoryService: AdminCategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List all categories, inactive ones included',
    description: 'Not paginated. `counts` covers every category regardless of the filters.',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved', type: AdminCategoryListDto })
  list(@Query() query: AdminCategoryListQueryDto): Promise<AdminCategoryListDto> {
    return this.adminCategoryService.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a category',
    description: 'The slug is generated from the name and made unique (`tom-song`, `tom-song-2`, ...).',
  })
  @ApiResponse({ status: 201, description: 'Category created', type: AdminCategoryDto })
  @ApiResponse({ status: 400, description: 'Invalid name, image URL or parent' })
  @ApiResponse({ status: 409, description: 'A category with that name already exists under the same parent' })
  create(@Body() dto: CreateCategoryDto): Promise<AdminCategoryDto> {
    return this.adminCategoryService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a category',
    description: 'Only the fields sent change. Renaming keeps the slug so existing links keep working.',
  })
  @ApiParam(categoryIdParam)
  @ApiResponse({ status: 200, description: 'Category updated', type: AdminCategoryDto })
  @ApiResponse({ status: 400, description: 'Invalid field or parent' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'A category with that name already exists under the same parent' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto): Promise<AdminCategoryDto> {
    return this.adminCategoryService.update(id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hide a category from customers',
    description: 'Its subcategories are hidden with it. Products keep their tags.',
  })
  @ApiParam(categoryIdParam)
  @ApiResponse({ status: 200, description: 'Category deactivated', type: AdminCategoryDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'The category is already inactive' })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<AdminCategoryDto> {
    return this.adminCategoryService.deactivate(id);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Show a deactivated category to customers again' })
  @ApiParam(categoryIdParam)
  @ApiResponse({ status: 200, description: 'Category reactivated', type: AdminCategoryDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'The category is already active' })
  reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<AdminCategoryDto> {
    return this.adminCategoryService.reactivate(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an unused category',
    description: 'Refused when products use the category or it has subcategories; deactivate it instead.',
  })
  @ApiParam(categoryIdParam)
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'The category is in use' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminCategoryService.remove(id);
  }
}
