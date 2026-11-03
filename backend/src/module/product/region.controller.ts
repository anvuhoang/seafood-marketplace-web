import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductListingService } from './product-listing.service.js';
import { RegionSummaryDto } from './dto/product-listing.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Regions')
@Controller('regions')
export class RegionController {
  constructor(private readonly productListingService: ProductListingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List fishing regions where vendors currently sell products' })
  @ApiResponse({ status: 200, description: 'Regions retrieved', type: [RegionSummaryDto] })
  async listRegions(): Promise<RegionSummaryDto[]> {
    return this.productListingService.listRegions();
  }
}
