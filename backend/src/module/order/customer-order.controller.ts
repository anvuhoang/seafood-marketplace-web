import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
  type PipeTransform,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CustomerOrderService } from './customer-order.service.js';
import {
  CustomerOrderDetailDto,
  CustomerOrderListDto,
  CustomerOrderQueryDto,
} from './dto/customer-order.dto.js';
import { ORDER_NOT_FOUND } from './order-lifecycle.service.js';

/** Order numbers look like "HSE-90001"; anything else cannot be an order, so it is not found. */
const ORDER_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,40}$/;
export const orderNumberPipe: PipeTransform<string, string> = {
  transform(value: string) {
    if (!ORDER_NUMBER_PATTERN.test(value)) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }
    return value;
  },
};

/**
 * The signed-in user's own orders, like /account/reviews: any signed-in role,
 * always scoped by the token's user id, so someone else's order is a 404.
 */
@ApiTags('My orders')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Missing or invalid token',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
@Controller('orders/me')
export class CustomerOrderController {
  constructor(private readonly orders: CustomerOrderService) {}

  @Get()
  @ApiOperation({
    summary: 'List my orders, newest first',
    description: 'Each order lists its vendors with their own status and items.',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved',
    type: CustomerOrderListDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query',
    type: ErrorResponseDto,
  })
  async listOrders(
    @CurrentUser('sub') userId: string,
    @Query() query: CustomerOrderQueryDto,
  ): Promise<CustomerOrderListDto> {
    return this.orders.listOrders(userId, query);
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one of my orders' })
  @ApiParam({ name: 'orderNumber', example: 'HSE-90001' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved',
    type: CustomerOrderDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order of mine',
    type: ErrorResponseDto,
  })
  async getOrder(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber', orderNumberPipe) orderNumber: string,
  ): Promise<CustomerOrderDetailDto> {
    return this.orders.getOrder(userId, orderNumber);
  }

  @Post(':orderNumber/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel the whole order',
    description:
      'Allowed only while every vendor part still running is PENDING. Stock goes back to the vendors; ' +
      'a paid order is marked REFUNDED (simulated), an unpaid one FAILED.',
  })
  @ApiParam({ name: 'orderNumber', example: 'HSE-90001' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled',
    type: CustomerOrderDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order of mine',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A vendor already accepted its part, or the order is already cancelled',
    type: ErrorResponseDto,
  })
  async cancelOrder(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber', orderNumberPipe) orderNumber: string,
  ): Promise<CustomerOrderDetailDto> {
    return this.orders.cancelOrder(userId, orderNumber);
  }
}
