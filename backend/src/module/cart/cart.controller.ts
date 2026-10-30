import {
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddToCartDto } from './dto/add-to-cart.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Post('items')
  @ApiOperation({
    summary: 'Add seafood product offer to cart',
    description:
      'Validates stock limits and active status before adding the specified item to the cart.',
  })
  @ApiResponse({
    status: 201,
    description: 'Item successfully added to cart',
  })
  @ApiResponse({
    status: 400,
    description: 'Quantity exceeds available stock or product unavailable',
  })
  async addToCart(@Body() dto: AddToCartDto, @Req() req: any) {
    const userId = req.user?.sub || 'guest-user';
    return this.cartService.addToCart(userId, dto);
  }
}
