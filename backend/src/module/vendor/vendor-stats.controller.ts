import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { VendorStatsDto, VendorStatsQueryDto } from './dto/vendor-stats.dto.js';
import { VendorStatsService } from './vendor-stats.service.js';

/**
 * Revenue statistics of the signed-in vendor's store. The store is found from
 * the token's owner; no store id is accepted from the client. Pending,
 * suspended and rejected stores can still read their figures.
 */
@ApiTags('Vendor statistics')
@ApiBearerAuth()
@Roles('VENDOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors/me/stats')
export class VendorStatsController {
  constructor(private readonly stats: VendorStatsService) {}

  @Get()
  @ApiOperation({
    summary: "Revenue and order statistics of the signed-in vendor's store",
    description:
      'Days are cut at midnight Vietnam time. Revenue is the subtotal of COMPLETED vendor orders, shipping fees ' +
      'excluded, counted on the day the order was completed (shipment delivered_at, or the last update of the ' +
      'order when it has no shipment). Placed and cancelled counts use the day the order was placed. Every figure ' +
      'comes with the value for the period of the same length just before.',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved', type: VendorStatsDto })
  @ApiResponse({
    status: 400,
    description: 'Unknown field (vendorId included), unknown range, missing or invalid custom dates, future date, more than 366 days',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not a Vendor account', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'This account has no store yet', type: ErrorResponseDto })
  async getStats(
    @CurrentUser('sub') userId: string,
    @Query() query: VendorStatsQueryDto,
  ): Promise<VendorStatsDto> {
    return this.stats.getStats(userId, query);
  }
}
