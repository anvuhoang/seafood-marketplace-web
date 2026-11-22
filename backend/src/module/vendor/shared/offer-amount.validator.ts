import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min, ValidateBy } from 'class-validator';

/** Largest values the offer columns hold: price is Decimal(14, 2), stock is Decimal(12, 3). */
export const OFFER_PRICE_MAX = 999_999_999_999.99;
export const OFFER_STOCK_MAX = 999_999_999.999;
export const OFFER_PRICE_DECIMALS = 2;
export const OFFER_STOCK_DECIMALS = 3;

/**
 * True when a finite number has at most `places` digits after the decimal point.
 * Read from the number's own text, so 0.1 counts as one place (no float maths),
 * and exponent forms such as 1e-7 are refused (they only appear for tiny values).
 */
export function hasAtMostDecimalPlaces(
  value: unknown,
  places: number,
): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const text = String(value);
  if (/e/i.test(text)) return false;
  return (text.split('.')[1]?.length ?? 0) <= places;
}

function MaxDecimalPlaces(places: number, message: string): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxDecimalPlaces',
      constraints: [places],
      validator: {
        validate: (value: unknown) => hasAtMostDecimalPlaces(value, places),
      },
    },
    { message },
  );
}

/** Selling price in VND: a JSON number above 0, at most 2 decimals, fits Decimal(14, 2). */
export function IsOfferPrice({ optional = false } = {}): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      type: Number,
      minimum: 0.01,
      maximum: OFFER_PRICE_MAX,
      example: 450000,
      required: !optional,
    }),
    IsNumber(
      { allowNaN: false, allowInfinity: false },
      { message: 'Giá bán phải là số.' },
    ),
    Min(0.01, { message: 'Giá bán phải lớn hơn 0.' }),
    Max(OFFER_PRICE_MAX, { message: 'Giá bán tối đa 999.999.999.999,99 đ.' }),
    MaxDecimalPlaces(
      OFFER_PRICE_DECIMALS,
      'Giá bán chỉ được có tối đa 2 chữ số thập phân.',
    ),
  );
}

/** Stock in the variant's unit: a JSON number from 0, at most 3 decimals, fits Decimal(12, 3). */
export function IsOfferStock({ optional = false } = {}): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      type: Number,
      minimum: 0,
      maximum: OFFER_STOCK_MAX,
      example: 25.5,
      required: !optional,
    }),
    IsNumber(
      { allowNaN: false, allowInfinity: false },
      { message: 'Tồn kho phải là số.' },
    ),
    Min(0, { message: 'Tồn kho không được âm.' }),
    Max(OFFER_STOCK_MAX, { message: 'Tồn kho tối đa 999.999.999,999.' }),
    MaxDecimalPlaces(
      OFFER_STOCK_DECIMALS,
      'Tồn kho chỉ được có tối đa 3 chữ số thập phân.',
    ),
  );
}
