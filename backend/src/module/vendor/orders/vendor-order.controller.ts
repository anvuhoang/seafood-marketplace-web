import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { VENDOR_ORDER_NOT_FOUND } from '../../order/order-lifecycle.service.js';
import {
  UpdateVendorOrderStatusDto,
  VendorOrderDetailDto,
  VendorOrderListDto,
  VendorOrderQueryDto,
} from './dto/vendor-order.dto.js';
import { VendorOrderService } from './vendor-order.service.js';

/** A malformed id is answered like someone else's id: not found. */
const vendorOrderIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(VENDOR_ORDER_NOT_FOUND),
});

const ApiNoToken = () =>
  ApiResponse({
    status: 401,
    description: 'Missing or invalid token',
    type: ErrorResponseDto,
  });
const ApiNotVendor = () =>
  ApiResponse({
    status: 403,
    description: 'Not a Vendor account',
    type: ErrorResponseDto,
  });

/**
 * The signed-in vendor's orders. Every route finds the store from the token's
 * owner; no store id is ever accepted from the client, and payment status can
 * never be changed here.
 */
@ApiTags('Vendor orders')
@ApiBearerAuth()
@Roles('VENDOR')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors/me/orders')
export class VendorOrderController {
  constructor(private readonly orders: VendorOrderService) {}

  @Get()
  @ApiOperation({
    summary: "List the signed-in vendor's orders, newest first",
    description:
      'Accent-insensitive search on order number, recipient name and phone. `from`/`to` are days in Vietnam time. ' +
      '`summary` counts every order of the store, whatever the filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved',
    type: VendorOrderListDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query or date range',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiNotVendor()
  @ApiResponse({
    status: 404,
    description: 'This account has no store yet',
    type: ErrorResponseDto,
  })
  async listOrders(
    @CurrentUser('sub') userId: string,
    @Query() query: VendorOrderQueryDto,
  ): Promise<VendorOrderListDto> {
    return this.orders.listOrders(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get one of the vendor's orders",
    description:
      "Only this vendor's part of the customer order. `allowedActions` lists the statuses it may set now.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved',
    type: VendorOrderDetailDto,
  })
  @ApiNoToken()
  @ApiNotVendor()
  @ApiResponse({
    status: 404,
    description: 'No such order in this store',
    type: ErrorResponseDto,
  })
  async getOrder(
    @CurrentUser('sub') userId: string,
    @Param('id', vendorOrderIdPipe) id: string,
  ): Promise<VendorOrderDetailDto> {
    return this.orders.getOrder(userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Move one order a step forward, or cancel it',
    description:
      'PENDING → ACCEPTED (paid, or cash on delivery) → PREPARING → SHIPPING → COMPLETED; cancelling only from ' +
      'PENDING or ACCEPTED, which restocks the offers. Payment is never set by the vendor.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Status changed',
    type: VendorOrderDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status, note or unknown field',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiResponse({
    status: 403,
    description:
      'Not a Vendor account, or the store is suspended or rejected (read-only)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order in this store',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Not allowed from the current status, unpaid order, or changed meanwhile',
    type: ErrorResponseDto,
  })
  async changeStatus(
    @CurrentUser('sub') userId: string,
    @Param('id', vendorOrderIdPipe) id: string,
    @Body() dto: UpdateVendorOrderStatusDto,
  ): Promise<VendorOrderDetailDto> {
    return this.orders.changeStatus(userId, id, dto);
  }
}
