import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CartService } from './cart.service.js';
import {
  AddToCartDto,
  CartLinesDto,
  UpdateCartItemDto,
} from './dto/add-to-cart.dto.js';
import { CartDto, MergeCartResultDto, QuoteDto } from './dto/cart.dto.js';

const ApiNoToken = () =>
  ApiResponse({
    status: 401,
    description: 'Missing or invalid token',
    type: ErrorResponseDto,
  });

/**
 * The signed-in customer's cart. The user always comes from the token and is never read
 * from the request, so nobody can reach another user's cart. Prices and totals are worked
 * out by the server from the offers; the request only says which offer and how much.
 * Guests keep their cart in the browser and use `POST /cart/quote` to see it priced.
 */
@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get my cart',
    description:
      'Lines with product, vendor, current price and stock, plus the total of the lines that can be bought. A line that can no longer be bought is flagged with `problem` and left out of the total.',
  })
  @ApiResponse({ status: 200, type: CartDto })
  @ApiNoToken()
  getCart(@CurrentUser('sub') userId: string): Promise<CartDto> {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add an offer to my cart',
    description:
      'Adds to the quantity already in the cart. Unknown or unavailable offers and quantities beyond the stock are refused; the API never answers success for them.',
  })
  @ApiResponse({ status: 201, description: 'The cart after adding', type: CartDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity, offer not for sale, out of stock or over the stock',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiResponse({ status: 404, description: 'No such offer', type: ErrorResponseDto })
  addItem(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToCartDto,
  ): Promise<CartDto> {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Set the quantity of one line of my cart' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'The cart line (`items[].id`)' })
  @ApiResponse({ status: 200, description: 'The cart after the change', type: CartDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity, offer not for sale, or over the stock',
    type: ErrorResponseDto,
  })
  @ApiNoToken()
  @ApiResponse({
    status: 404,
    description: 'No such line in my cart (also for a line of another user)',
    type: ErrorResponseDto,
  })
  updateItem(
    @CurrentUser('sub') userId: string,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove one line from my cart' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The cart after removing', type: CartDto })
  @ApiNoToken()
  @ApiResponse({
    status: 404,
    description: 'No such line in my cart (also for a line of another user)',
    type: ErrorResponseDto,
  })
  removeItem(
    @CurrentUser('sub') userId: string,
    @Param('id') itemId: string,
  ): Promise<CartDto> {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty my cart' })
  @ApiResponse({ status: 200, description: 'The empty cart', type: CartDto })
  @ApiNoToken()
  clear(@CurrentUser('sub') userId: string): Promise<CartDto> {
    return this.cartService.clear(userId);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Merge the browser cart into my cart after signing in',
    description:
      'Quantities are added to what is already there. Offers that cannot be bought are left out and quantities beyond the stock are lowered; each is listed in `notices`.',
  })
  @ApiResponse({ status: 200, type: MergeCartResultDto })
  @ApiResponse({ status: 400, description: 'Invalid list', type: ErrorResponseDto })
  @ApiNoToken()
  merge(
    @CurrentUser('sub') userId: string,
    @Body() dto: CartLinesDto,
  ): Promise<MergeCartResultDto> {
    return this.cartService.merge(userId, dto);
  }

  @Public()
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Price a guest cart (nothing is saved)',
    description:
      'For visitors who are not signed in: the browser sends the offers and quantities it holds and gets back the same view as a stored cart, with current prices and server-side totals. Offers that do not exist are listed in `unknownOfferIds`.',
  })
  @ApiResponse({ status: 200, type: QuoteDto })
  @ApiResponse({ status: 400, description: 'Invalid list', type: ErrorResponseDto })
  quote(@Body() dto: CartLinesDto): Promise<QuoteDto> {
    return this.cartService.quote(dto);
  }
}
