import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsCartQuantity } from './cart-quantity.validator.js';

/** A cart holds at most this many different offers. */
export const CART_MAX_LINES = 50;

/** One offer and how much of it. The price is never part of the request: the server reads it. */
export class CartLineDto {
  /** The vendor offer to buy (the `offerId` of a product card or the product detail). */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Mặt hàng không hợp lệ.' })
  offerId: string;

  @IsCartQuantity()
  quantity: number;
}

export class AddToCartDto extends CartLineDto {}

export class UpdateCartItemDto {
  /** The new quantity of the line (not an amount to add). */
  @IsCartQuantity()
  quantity: number;
}

/** Many lines at once: the browser cart merged after sign-in, or a guest cart to be priced. */
export class CartLinesDto {
  @ApiProperty({ type: [CartLineDto], minItems: 1, maxItems: CART_MAX_LINES })
  @IsArray({ message: 'Danh sách mặt hàng không hợp lệ.' })
  @ArrayMinSize(1, { message: 'Giỏ hàng trống.' })
  @ArrayMaxSize(CART_MAX_LINES, {
    message: `Giỏ hàng tối đa ${CART_MAX_LINES} mặt hàng.`,
  })
  @ValidateNested({ each: true })
  @Type(() => CartLineDto)
  items: CartLineDto[];
}
