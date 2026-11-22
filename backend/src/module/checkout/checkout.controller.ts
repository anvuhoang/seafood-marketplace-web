import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CheckoutService } from './checkout.service.js';
import {
  CheckoutPreviewDto,
  CheckoutSelectionDto,
  PlaceOrderDto,
  PlaceOrderResultDto,
} from './dto/checkout.dto.js';

const ApiNoToken = () =>
  ApiResponse({
    status: 401,
    description: 'Missing or invalid token',
    type: ErrorResponseDto,
  });

/**
 * Checkout of the signed-in customer's cart. The user comes from the token, so only your own cart
 * can be bought. Prices, shipping fees and totals are worked out by the server and never read from
 * the request.
 */
@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'See what the order would cost now',
    description:
      'Lines grouped by vendor with each vendor\'s shipping fee and the totals. Lines that cannot be bought are listed in `problems`. Nothing is stored or reserved.',
  })
  @ApiResponse({ status: 200, type: CheckoutPreviewDto })
  @ApiResponse({ status: 400, description: 'A listed offer is not in the cart', type: ErrorResponseDto })
  @ApiNoToken()
  preview(
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckoutSelectionDto,
  ): Promise<CheckoutPreviewDto> {
    return this.checkout.preview(userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Place the order',
    description:
      'Buys the whole cart, or only the listed offers. One order is created with one vendor order per vendor, the stock is taken and a PENDING payment is recorded, all in one transaction: if any line cannot be bought or its stock is not enough, nothing is created. Bought lines leave the cart. Sending the same Idempotency-Key again returns the same order with `alreadyPlaced: true`.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'A new random value (for example a UUID) for each order attempt; reuse it only when retrying that attempt.',
  })
  @ApiResponse({ status: 201, type: PlaceOrderResultDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid shipping information or payment method, empty cart, or a missing or malformed Idempotency-Key',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiResponse({
    status: 409,
    description: 'A line cannot be bought (out of stock, withdrawn...). `problems` lists them; nothing was changed.',
    type: ErrorResponseDto,
  })
  placeOrder(
    @CurrentUser('sub') userId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: PlaceOrderDto,
  ): Promise<PlaceOrderResultDto> {
    return this.checkout.placeOrder(userId, idempotencyKey, dto);
  }
}
