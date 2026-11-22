import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { VIETNAM_PHONE_PATTERN } from '../../account/dto/account.dto.js';
import { CartItemDto, CartVendorDto } from '../../cart/dto/cart.dto.js';
import { CustomerOrderDetailDto } from '../../order/dto/customer-order.dto.js';

export const PAYMENT_METHODS = ['COD', 'BANK_TRANSFER', 'E_WALLET', 'CARD'] as const;
export type PaymentMethodName = (typeof PAYMENT_METHODS)[number];

/** Always available: cash on delivery. */
export const SUPPORTED_PAYMENT_METHODS: readonly PaymentMethodName[] = ['COD'];
/** Paying by QR transfer through PayOS. Offered only while PayOS is configured. */
export const QR_PAYMENT_METHOD: PaymentMethodName = 'BANK_TRANSFER';

export const CHECKOUT_MAX_LINES = 50;
export const NOTE_MAX = 500;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? undefined : text;
};

/** Who receives the order and where. Checked for shape here; the saved address book has the same rules. */
export class ShippingInfoDto {
  /** @example "Nguyễn Văn An" */
  @ApiProperty({ minLength: 2, maxLength: 150 })
  @Transform(trim)
  @IsString({ message: 'Vui lòng nhập tên người nhận.' })
  @MinLength(2, { message: 'Tên người nhận phải có tối thiểu 2 ký tự.' })
  @MaxLength(150, { message: 'Tên người nhận tối đa 150 ký tự.' })
  recipientName: string;

  /** @example "0912345678" */
  @ApiProperty()
  @Transform(trim)
  @Matches(VIETNAM_PHONE_PATTERN, {
    message: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).',
  })
  recipientPhone: string;

  /** @example "TP. Hồ Chí Minh" */
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'Vui lòng chọn tỉnh/thành phố.' })
  @MinLength(2, { message: 'Vui lòng chọn tỉnh/thành phố.' })
  @MaxLength(100, { message: 'Tên tỉnh/thành phố tối đa 100 ký tự.' })
  province: string;

  /** @example "Quận 7" */
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'Vui lòng chọn quận/huyện.' })
  @MinLength(2, { message: 'Vui lòng chọn quận/huyện.' })
  @MaxLength(100, { message: 'Tên quận/huyện tối đa 100 ký tự.' })
  district: string;

  /** @example "Phường Tân Phong" */
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(100, { message: 'Tên phường/xã tối đa 100 ký tự.' })
  ward?: string;

  /** @example "Số 12, Đường Nguyễn Hữu Thọ" */
  @ApiProperty({ minLength: 3, maxLength: 255 })
  @Transform(trim)
  @IsString({ message: 'Vui lòng nhập số nhà, tên đường.' })
  @MinLength(3, { message: 'Vui lòng nhập số nhà, tên đường.' })
  @MaxLength(255, { message: 'Địa chỉ tối đa 255 ký tự.' })
  streetAddress: string;
}

/** The cart lines to buy; leaving it out buys the whole cart. */
export class CheckoutSelectionDto {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Offers (`items[].offerId` of the cart) to buy. Lines not listed stay in the cart.',
    maxItems: CHECKOUT_MAX_LINES,
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách sản phẩm không hợp lệ.' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 sản phẩm.' })
  @ArrayMaxSize(CHECKOUT_MAX_LINES, { message: `Tối đa ${CHECKOUT_MAX_LINES} sản phẩm.` })
  @ArrayUnique({ message: 'Có sản phẩm bị chọn trùng.' })
  @IsUUID('all', { each: true, message: 'Sản phẩm không hợp lệ.' })
  items?: string[];
}

/**
 * Place an order from the cart. No price, total or shipping fee is part of the request: the server reads
 * them. Give either a saved address (`addressId`) or the shipping fields, not both.
 */
export class PlaceOrderDto extends CheckoutSelectionDto {
  /** One of the signed-in customer's saved addresses. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Địa chỉ giao hàng không hợp lệ.' })
  addressId?: string;

  @ApiPropertyOptional({ type: ShippingInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingInfoDto)
  shipping?: ShippingInfoDto;

  @ApiProperty({ enum: PAYMENT_METHODS, example: 'COD' })
  @IsIn(PAYMENT_METHODS, { message: 'Phương thức thanh toán không hợp lệ.' })
  paymentMethod: PaymentMethodName;

  /** A note for the vendors, e.g. "Giao giờ hành chính". */
  @ApiPropertyOptional({ maxLength: NOTE_MAX })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(NOTE_MAX, { message: `Ghi chú tối đa ${NOTE_MAX} ký tự.` })
  customerNote?: string;
}

/** The lines of one vendor in the order, with that vendor's shipping fee and total. */
export class CheckoutVendorDto {
  vendor: CartVendorDto;
  items: CartItemDto[];
  /** Total in VND of this vendor's lines that can be bought. */
  subtotal: number;
  /** Flat fee in VND, charged once per vendor; 0 when none of the vendor's lines can be bought. */
  shippingFee: number;
  total: number;
}

/** What the order would cost now, worked out by the server. Nothing is stored or reserved. */
export class CheckoutPreviewDto {
  vendors: CheckoutVendorDto[];
  /** Number of lines in the order. */
  lineCount: number;
  subtotal: number;
  shippingTotal: number;
  grandTotal: number;
  /** Why checkout is not possible yet (a line is out of stock, withdrawn...), in Vietnamese. Empty when it is. */
  problems: string[];
  canCheckout: boolean;
  @ApiProperty({ enum: PAYMENT_METHODS, isArray: true })
  supportedPaymentMethods: PaymentMethodName[];
}

export class PlaceOrderResultDto {
  /** The order as `GET /orders/me/:orderNumber` shows it. */
  order: CustomerOrderDetailDto;
  /** True when this key had already placed the order, so nothing new was created. */
  alreadyPlaced: boolean;
}
