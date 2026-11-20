import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min, ValidateBy } from 'class-validator';
import { hasAtMostDecimalPlaces } from '../../vendor/shared/offer-amount.validator.js';

/** The cart column is Decimal(12, 3): three decimals, and nothing absurd. */
export const CART_QUANTITY_DECIMALS = 3;
export const CART_QUANTITY_MAX = 100_000;

/** A quantity in the offer's unit: a JSON number above 0 with at most 3 decimals. */
export function IsCartQuantity(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      type: Number,
      minimum: 0.001,
      maximum: CART_QUANTITY_MAX,
      example: 1.5,
      description: 'In the offer\'s unit (kg, con, hộp...). Must be above 0 and within the stock.',
    }),
    IsNumber(
      { allowNaN: false, allowInfinity: false },
      { message: 'Số lượng phải là số.' },
    ),
    Min(0.001, { message: 'Số lượng phải lớn hơn 0.' }),
    Max(CART_QUANTITY_MAX, { message: 'Số lượng quá lớn.' }),
    ValidateBy(
      {
        name: 'maxDecimalPlaces',
        constraints: [CART_QUANTITY_DECIMALS],
        validator: {
          validate: (value: unknown) =>
            hasAtMostDecimalPlaces(value, CART_QUANTITY_DECIMALS),
        },
      },
      { message: 'Số lượng chỉ được có tối đa 3 chữ số thập phân.' },
    ),
  );
}
