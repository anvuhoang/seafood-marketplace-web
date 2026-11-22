import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
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
import { orderNumberPipe } from '../order/customer-order.controller.js';
import { PaymentDetailDto } from './dto/payment.dto.js';
import { PaymentService } from './payment.service.js';

/** The payment of the signed-in user's own orders, always scoped by the token's user id. */
@ApiTags('My payments')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Missing or invalid token',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
@Controller('orders/me')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get(':orderNumber/payment')
  @ApiOperation({
    summary: 'Get the payment of one of my orders',
    description:
      'Reads what is saved and never calls PayOS, so it is cheap to poll. The QR and its expiry are only sent while the payment is PENDING. A QR past its time is saved as EXPIRED.',
  })
  @ApiParam({ name: 'orderNumber', example: 'HSE-90001' })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved',
    type: PaymentDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No such order of mine, or the order has no payment',
    type: ErrorResponseDto,
  })
  async getPayment(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber', orderNumberPipe) orderNumber: string,
  ): Promise<PaymentDetailDto> {
    return this.payments.getPayment(userId, orderNumber);
  }

  @Post(':orderNumber/payment/qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a QR to pay one of my orders',
    description:
      'Returns the QR that still works, or creates a new one when the payment has none, it expired, was cancelled or failed (this is how a failed payment is retried). Only for orders paid by QR transfer that are not paid or cancelled.',
  })
  @ApiParam({ name: 'orderNumber', example: 'HSE-90001' })
  @ApiResponse({ status: 200, description: 'QR ready', type: PaymentDetailDto })
  @ApiResponse({
    status: 404,
    description: 'No such order of mine, or the order has no payment',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Not paid by QR, already paid or refunded, or the order is cancelled',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 502,
    description: 'PayOS could not create the QR',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'QR payment is not switched on',
    type: ErrorResponseDto,
  })
  async createQr(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber', orderNumberPipe) orderNumber: string,
  ): Promise<PaymentDetailDto> {
    return this.payments.createLink(userId, orderNumber);
  }

  @Post(':orderNumber/payment/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask PayOS what happened to my QR',
    description:
      'Saves what PayOS reports (paid, cancelled, expired or failed). Use it when coming back from the PayOS page or after the customer says they paid. The customer cannot choose the outcome.',
  })
  @ApiParam({ name: 'orderNumber', example: 'HSE-90001' })
  @ApiResponse({ status: 200, description: 'Payment refreshed', type: PaymentDetailDto })
  @ApiResponse({
    status: 404,
    description: 'No such order of mine, or the order has no payment',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 502,
    description: 'PayOS could not be reached',
    type: ErrorResponseDto,
  })
  async syncPayment(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber', orderNumberPipe) orderNumber: string,
  ): Promise<PaymentDetailDto> {
    return this.payments.syncPayment(userId, orderNumber);
  }
}
