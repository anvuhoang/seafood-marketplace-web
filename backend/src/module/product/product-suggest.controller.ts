import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../infra/rate-limit.guard.js';
import { ProductListingService } from './product-listing.service.js';

export class SuggestQueryDto {
  /** What the visitor has typed so far. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(60)
  q?: string;
}

@ApiTags('Search')
@Public()
@Controller('search')
export class ProductSuggestController {
  constructor(private readonly listing: ProductListingService) {}

  /** Names are suggested while typing, so a visitor sends a request for several keys: 120 a minute is plenty. */
  @RateLimit(120, 60)
  @Get('suggest')
  @ApiOperation({ summary: 'Product names that begin like what the visitor has typed' })
  @ApiOkResponse({ description: 'Up to 8 products: name and slug' })
  async suggest(@Query() query: SuggestQueryDto): Promise<{ suggestions: Array<{ name: string; slug: string }> }> {
    return { suggestions: await this.listing.suggest(query.q ?? '', 8) };
  }
}
