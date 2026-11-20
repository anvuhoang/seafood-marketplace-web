import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  Line,
  OfferRow,
  lineProblem,
  offerInclude,
} from '../cart/cart-offers.js';
import { toCart } from '../cart/cart.service.js';
import { CustomerOrderService } from '../order/customer-order.service.js';
import { newOrderNumber, priceOrder } from './checkout-pricing.js';
import {
  CheckoutPreviewDto,
  CheckoutSelectionDto,
  PlaceOrderDto,
  PlaceOrderResultDto,
  SUPPORTED_PAYMENT_METHODS,
} from './dto/checkout.dto.js';

export const CART_EMPTY = 'Giỏ hàng của bạn đang trống.';
export const NOT_IN_CART = 'Có sản phẩm không còn trong giỏ hàng của bạn. Vui lòng tải lại giỏ hàng.';
export const IDEMPOTENCY_KEY_REQUIRED =
  'Thiếu mã chống gửi trùng (header Idempotency-Key).';
export const IDEMPOTENCY_KEY_INVALID =
  'Mã chống gửi trùng không hợp lệ (8-100 ký tự gồm chữ, số, gạch ngang và gạch dưới).';
export const ADDRESS_INVALID = 'Địa chỉ giao hàng không hợp lệ.';
export const SHIPPING_REQUIRED = 'Vui lòng nhập thông tin giao hàng.';
export const SHIPPING_ONE_ONLY =
  'Chỉ chọn một: địa chỉ đã lưu hoặc nhập địa chỉ mới.';
export const PAYMENT_NOT_SUPPORTED =
  'Phương thức thanh toán này chưa được hỗ trợ. Vui lòng chọn thanh toán khi nhận hàng (COD).';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
const ORDER_NUMBER_ATTEMPTS = 3;

/** Thrown inside the transaction to leave it when this key already placed an order. */
class AlreadyPlaced extends Error {
  constructor(readonly orderNumber: string) {
    super('already placed');
  }
}

interface CartLine extends Line {
  /** The line in the cart, so exactly the bought lines can be removed. */
  cartItemId: string;
}

interface Shipping {
  addressId: string | null;
  recipientName: string;
  recipientPhone: string;
  province: string;
  district: string;
  ward: string | null;
  streetAddress: string;
  note: string | null;
}

/** True for a unique-constraint error, and for which column when the database says. */
function isUniqueViolation(error: unknown, column: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  const target = error.meta?.target;
  const text = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return text.includes(column);
}

/**
 * Turns the customer's cart into an order. Everything that matters is decided here, from the
 * database: prices, shipping fees, totals and stock. The request only says which cart lines to buy,
 * where to send them, how to pay and carries an idempotency key.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orders: CustomerOrderService,
  ) {}

  private shippingFeePerVendor(): Prisma.Decimal {
    const fee = this.config.get<{ shippingFeePerVendor?: number }>('checkout')
      ?.shippingFeePerVendor;
    return new Prisma.Decimal(Number.isFinite(fee) && fee! >= 0 ? fee! : 30000);
  }

  /** What the order would cost now. Nothing is stored or reserved. */
  async preview(
    userId: string,
    selection: CheckoutSelectionDto,
  ): Promise<CheckoutPreviewDto> {
    const lines = await this.readCartLines(this.prisma, userId, selection.items);
    const supportedPaymentMethods = [...SUPPORTED_PAYMENT_METHODS];
    if (lines.length === 0) {
      return {
        vendors: [],
        lineCount: 0,
        subtotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
        problems: [CART_EMPTY],
        canCheckout: false,
        supportedPaymentMethods,
      };
    }

    const cart = toCart(lines);
    const fee = this.shippingFeePerVendor();
    const vendors = cart.vendors.map((group) => {
      // A vendor none of whose lines can be bought is not part of the order, so it pays no shipping.
      const shippingFee = group.subtotal > 0 ? fee : new Prisma.Decimal(0);
      return {
        vendor: group.vendor,
        items: cart.items.filter((item) => item.vendor.id === group.vendor.id),
        subtotal: group.subtotal,
        shippingFee: shippingFee.toNumber(),
        total: new Prisma.Decimal(group.subtotal).plus(shippingFee).toNumber(),
      };
    });
    const sum = (pick: (vendor: (typeof vendors)[number]) => number) =>
      vendors
        .reduce((total, vendor) => total.plus(pick(vendor)), new Prisma.Decimal(0))
        .toDecimalPlaces(2)
        .toNumber();
    const problems = cart.items
      .filter((item) => !item.available)
      .map((item) => `${item.productName}: ${item.problem ?? OUT_OF_STOCK_FALLBACK}`);

    return {
      vendors,
      lineCount: cart.lineCount,
      subtotal: cart.subtotal,
      shippingTotal: sum((vendor) => vendor.shippingFee),
      grandTotal: sum((vendor) => vendor.total),
      problems,
      canCheckout: problems.length === 0,
      supportedPaymentMethods,
    };
  }

  /**
   * Places the order. All or nothing: if any line cannot be bought, or its stock is no longer enough,
   * nothing is created, nothing is taken from stock and the cart is untouched. Sending the same
   * idempotency key again returns the order it created.
   */
  async placeOrder(
    userId: string,
    idempotencyKey: string | undefined,
    dto: PlaceOrderDto,
  ): Promise<PlaceOrderResultDto> {
    if (!idempotencyKey) throw new BadRequestException(IDEMPOTENCY_KEY_REQUIRED);
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new BadRequestException(IDEMPOTENCY_KEY_INVALID);
    }

    // A repeated request: the same answer as the first time, with no second order.
    const earlier = await this.findByKey(userId, idempotencyKey);
    if (earlier) return this.replay(userId, earlier);

    if (!SUPPORTED_PAYMENT_METHODS.includes(dto.paymentMethod)) {
      throw new BadRequestException(PAYMENT_NOT_SUPPORTED);
    }
    const shipping = await this.resolveShipping(userId, dto);

    for (let attempt = 1; ; attempt += 1) {
      try {
        const orderNumber = await this.prisma.$transaction(
          (tx) => this.createOrder(tx, userId, idempotencyKey, dto, shipping),
          { timeout: 20_000 },
        );
        return { order: await this.orders.getOrder(userId, orderNumber), alreadyPlaced: false };
      } catch (error) {
        if (error instanceof AlreadyPlaced) return this.replay(userId, error.orderNumber);
        // Two requests with the same key at the same moment: the database lets one in; the other gets its order.
        if (isUniqueViolation(error, 'idempotency_key')) {
          const winner = await this.findByKey(userId, idempotencyKey);
          if (winner) return this.replay(userId, winner);
        }
        // An order number that was already taken (very unlikely): try again with a new one.
        if (isUniqueViolation(error, 'order_number') && attempt < ORDER_NUMBER_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  private async createOrder(
    tx: Prisma.TransactionClient,
    userId: string,
    idempotencyKey: string,
    dto: PlaceOrderDto,
    shipping: Shipping,
  ): Promise<string> {
    // Checkouts of one customer take turns: a second one waits here, then sees what the first changed.
    await tx.$queryRaw`SELECT id FROM carts WHERE user_id = ${userId}::uuid FOR UPDATE`;

    const again = await this.findByKey(userId, idempotencyKey, tx);
    if (again) throw new AlreadyPlaced(again);

    const lines = await this.readCartLines(tx, userId, dto.items);
    if (lines.length === 0) throw new BadRequestException(CART_EMPTY);

    // Judge every line first, so the customer hears about all the problems at once.
    const problems = lines
      .map(({ offer, quantity }) => {
        const problem = lineProblem(offer, quantity);
        return problem ? `${offer.variant.product.name}: ${problem}` : null;
      })
      .filter((problem): problem is string => problem !== null);
    if (problems.length > 0) throw stockConflict(problems);

    // Take the stock. The condition is part of the update, so two buyers can never both take the last kilo.
    const byOffer = [...lines].sort((a, b) => a.offer.id.localeCompare(b.offer.id));
    for (const { offer, quantity } of byOffer) {
      const taken = await tx.vendorOffer.updateMany({
        where: {
          id: offer.id,
          status: 'ACTIVE',
          stock: { gte: quantity },
          vendor: { status: 'ACTIVE' },
          variant: { isActive: true, product: { status: 'ACTIVE' } },
        },
        data: { stock: { decrement: quantity } },
      });
      if (taken.count !== 1) {
        throw stockConflict([
          `${offer.variant.product.name}: ${lineProblemAfterRace(offer)}`,
        ]);
      }
    }

    const priced = priceOrder(
      lines.map(({ offer, quantity }) => ({
        offerId: offer.id,
        vendorId: offer.vendor.id,
        vendorName: offer.vendor.name,
        productName: offer.variant.product.name,
        variantName: offer.variant.name,
        unit: offer.variant.unit,
        unitPrice: offer.price,
        quantity,
      })),
      this.shippingFeePerVendor(),
    );

    const created = await tx.order.create({
      data: {
        orderNumber: newOrderNumber(randomInt),
        userId,
        addressId: shipping.addressId,
        status: 'PENDING',
        subtotal: priced.subtotal,
        shippingTotal: priced.shippingTotal,
        grandTotal: priced.grandTotal,
        recipientName: shipping.recipientName,
        recipientPhone: shipping.recipientPhone,
        shippingAddress: shipping.streetAddress,
        shippingProvince: shipping.province,
        shippingDistrict: shipping.district,
        shippingWard: shipping.ward,
        customerNote: dto.customerNote ?? shipping.note,
        idempotencyKey,
        vendorOrders: {
          create: priced.vendorOrders.map((vendorOrder) => ({
            vendorId: vendorOrder.vendorId,
            status: 'PENDING' as const,
            subtotal: vendorOrder.subtotal,
            shippingFee: vendorOrder.shippingFee,
            grandTotal: vendorOrder.grandTotal,
            items: {
              create: vendorOrder.lines.map((line) => ({
                offerId: line.offerId,
                // The names and the price as they are at purchase; later changes to the offer do not touch the order.
                productNameSnapshot: line.productName,
                variantNameSnapshot: line.variantName,
                vendorNameSnapshot: line.vendorName,
                unitSnapshot: line.unit,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
              })),
            },
          })),
        },
        payment: {
          create: {
            method: dto.paymentMethod,
            status: 'PENDING',
            amount: priced.grandTotal,
          },
        },
      },
      select: { orderNumber: true },
    });

    // Only what was bought leaves the cart.
    await tx.cartItem.deleteMany({
      where: { id: { in: lines.map((line) => line.cartItemId) } },
    });

    return created.orderNumber;
  }

  private async replay(userId: string, orderNumber: string): Promise<PlaceOrderResultDto> {
    return { order: await this.orders.getOrder(userId, orderNumber), alreadyPlaced: true };
  }

  private async findByKey(
    userId: string,
    idempotencyKey: string,
    client: Pick<Prisma.TransactionClient, 'order'> = this.prisma,
  ): Promise<string | null> {
    const found = await client.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: { orderNumber: true },
    });
    return found?.orderNumber ?? null;
  }

  /** The cart lines to buy (all, or the offers asked for), with the offer data to judge them by. */
  private async readCartLines(
    client: Pick<Prisma.TransactionClient, 'cartItem'>,
    userId: string,
    offerIds?: string[],
  ): Promise<CartLine[]> {
    const rows = await client.cartItem.findMany({
      where: {
        cart: { userId },
        ...(offerIds && { offerId: { in: offerIds } }),
      },
      orderBy: { createdAt: 'desc' },
      include: { offer: { include: offerInclude } },
    });
    if (offerIds && rows.length !== offerIds.length) {
      throw new BadRequestException(NOT_IN_CART);
    }
    return rows.map((row) => ({
      id: row.id,
      cartItemId: row.id,
      offer: row.offer,
      quantity: row.quantity,
    }));
  }

  private async resolveShipping(userId: string, dto: PlaceOrderDto): Promise<Shipping> {
    if (dto.addressId && dto.shipping) throw new BadRequestException(SHIPPING_ONE_ONLY);

    if (dto.addressId) {
      const saved = await this.prisma.userAddress.findFirst({
        where: { id: dto.addressId, userId },
      });
      if (!saved) throw new BadRequestException(ADDRESS_INVALID);
      return {
        addressId: saved.id,
        recipientName: saved.recipientName,
        recipientPhone: saved.recipientPhone,
        province: saved.province,
        district: saved.district,
        ward: saved.ward,
        streetAddress: saved.streetAddress,
        note: saved.note,
      };
    }

    if (!dto.shipping) throw new BadRequestException(SHIPPING_REQUIRED);
    return {
      addressId: null,
      recipientName: dto.shipping.recipientName,
      recipientPhone: dto.shipping.recipientPhone,
      province: dto.shipping.province,
      district: dto.shipping.district,
      ward: dto.shipping.ward ?? null,
      streetAddress: dto.shipping.streetAddress,
      note: null,
    };
  }
}

const OUT_OF_STOCK_FALLBACK = 'Sản phẩm hiện không khả dụng.';

function stockConflict(problems: string[]): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    message: `Không thể đặt hàng: ${problems.join(' ')}`,
    problems,
  });
}

/** The reason for a line that passed the check but lost the race for the stock a moment later. */
function lineProblemAfterRace(offer: OfferRow): string {
  return `Sản phẩm vừa hết hoặc không còn đủ hàng (còn ${offer.stock.toString()} ${offer.variant.unit} lúc kiểm tra). Vui lòng kiểm tra lại giỏ hàng.`;
}
