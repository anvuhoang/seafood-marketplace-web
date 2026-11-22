import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { ProductIndexerService, type ReindexResult, type SearchStatus } from './product-indexer.service.js';

@ApiTags('Admin - Search')
@Admin()
@ApiResponse({ status: 401, description: 'Missing or invalid token' })
@ApiResponse({ status: 403, description: 'The account is not an ADMIN' })
@Controller('admin/search')
export class AdminSearchController {
  constructor(private readonly indexer: ProductIndexerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Is the product search engine on, does it answer, and how many products does it hold' })
  status(): Promise<SearchStatus> {
    return this.indexer.status();
  }

  @Post('reindex')
  @HttpCode(200)
  @ApiOperation({ summary: 'Build the product index again from the database' })
  reindex(): Promise<ReindexResult> {
    return this.indexer.reindex();
  }
}
