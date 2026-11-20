import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AddToCartDto,
  CartLineDto,
  CartLinesDto,
  UpdateCartItemDto,
} from './dto/add-to-cart.dto.js';
import {
  CartDto,
  CartItemDto,
  CartVendorGroupDto,
  MergeCartResultDto,
  QuoteDto,
} from './dto/cart.dto.js';

export const VENDOR_NOT_SELLING_MESSAGE =
  'Gian hàng bán sản phẩm này hiện chưa mở bán hoặc đang tạm ngưng.';
export const OFFER_NOT_FOUND = 'Không tìm thấy mặt hàng yêu cầu.';
export const OFFER_UNAVAILABLE =
  'Sản phẩm hiện không khả dụng hoặc đã ngừng kinh doanh.';
export const OUT_OF_STOCK = 'Sản phẩm hiện đã hết hàng.';
export const CART_ITEM_NOT_FOUND =
  'Không tìm thấy mặt hàng trong giỏ hàng của bạn.';

const exceedsStock = (requested: number, stock: number) =>
  `Số lượng yêu cầu (${requested}) vượt quá số lượng còn lại trong kho (${stock}).`;
const totalExceedsStock = (total: number, stock: number) =>
  `Tổng số lượng trong giỏ (${total}) vượt quá số lượng còn trong kho (${stock}).`;

/** Everything the cart screen needs about an offer, in one read. */
const offerInclude = {
  vendor: { select: { id: true, name: true, slug: true, district: true, province: true, status: true } },
  variant: {
    select: {
      name: true,
      unit: true,
      sizeLabel: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          images: {
            select: { imageUrl: true, isPrimary: true },
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
    },
  },
} satisfies Prisma.VendorOfferInclude;

type OfferRow = Prisma.VendorOfferGetPayload<{ include: typeof offerInclude }>;

interface Line {
  /** The cart line on the server; null for a guest cart that is only being priced. */
  id: string | null;
  offer: OfferRow;
  quantity: Prisma.Decimal;
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Why an offer cannot be bought at all (whatever the quantity), or null. */
function offerProblem(offer: OfferRow): string | null {
  if (offer.vendor.status !== 'ACTIVE') return VENDOR_NOT_SELLING_MESSAGE;
  if (
    offer.status !== 'ACTIVE' ||
    !offer.variant.isActive ||
    offer.variant.product.status !== 'ACTIVE'
  ) {
    return OFFER_UNAVAILABLE;
  }
  if (offer.stock.lte(0)) return OUT_OF_STOCK;
  return null;
}

/** Why a line cannot be bought with this quantity, or null. */
function lineProblem(offer: OfferRow, quantity: Prisma.Decimal): string | null {
  const problem = offerProblem(offer);
  if (problem) return problem;
  if (quantity.gt(offer.stock)) {
    return `Chỉ còn ${offer.stock.toString()} ${offer.variant.unit} trong kho, vui lòng giảm số lượng.`;
  }
  return null;
}

/**
 * The cart as the screens show it. Prices come from the offers in the database and
 * every amount is worked out here with exact decimals, never from what the browser sent.
 */
function toCart(lines: Line[]): CartDto {
  let subtotal = new Prisma.Decimal(0);
  let hasProblems = false;
  // One group per vendor, in the order the vendors first appear; each keeps its own exact total.
  const groups = new Map<string, { group: CartVendorGroupDto; total: Prisma.Decimal }>();

  const items: CartItemDto[] = lines.map(({ id, offer, quantity }) => {
    const problem = lineProblem(offer, quantity);
    const lineTotal = offer.price.mul(quantity).toDecimalPlaces(2);
    if (problem) hasProblems = true;
    else subtotal = subtotal.plus(lineTotal);

    const vendor = {
      id: offer.vendor.id,
      name: offer.vendor.name,
      slug: offer.vendor.slug,
      district: offer.vendor.district,
      province: offer.vendor.province,
    };
    const entry = groups.get(vendor.id) ?? { group: { vendor, lineCount: 0, subtotal: 0 }, total: new Prisma.Decimal(0) };
    entry.group.lineCount += 1;
    if (!problem) entry.total = entry.total.plus(lineTotal);
    groups.set(vendor.id, entry);

    const { product } = offer.variant;
    const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
    return {
      id,
      offerId: offer.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantName: offer.variant.name,
      sizeLabel: offer.variant.sizeLabel,
      imageUrl: image?.imageUrl ?? null,
      vendor,
      unit: offer.variant.unit,
      unitPrice: offer.price.toNumber(),
      quantity: quantity.toNumber(),
      subtotal: problem ? 0 : lineTotal.toNumber(),
      stock: offer.stock.toNumber(),
      available: problem === null,
      problem,
    };
  });

  return {
    items,
    vendors: [...groups.values()].map(({ group, total }) => ({ ...group, subtotal: total.toDecimalPlaces(2).toNumber() })),
    lineCount: items.length,
    subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    hasProblems,
  };
}

/** The same offer listed twice becomes one line with the quantities added up. */
function combine(lines: CartLineDto[]): Map<string, Prisma.Decimal> {
  const byOffer = new Map<string, Prisma.Decimal>();
  for (const line of lines) {
    byOffer.set(
      line.offerId,
      (byOffer.get(line.offerId) ?? new Prisma.Decimal(0)).plus(line.quantity),
    );
  }
  return byOffer;
}

/**
 * A signed-in customer's cart, stored on the server. Every read and write is scoped to
 * the user in the token; a line that belongs to someone else is "not found". Guests keep
 * their cart in the browser and only ask for it to be priced (see `quote`).
 */
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string): Promise<CartDto> {
    return toCart(await this.readLines(userId));
  }

  /** Adds to the quantity already in the cart. Unknown or unsellable offers are refused. */
  async addItem(userId: string, dto: AddToCartDto): Promise<CartDto> {
    const offer = await this.findOffer(dto.offerId);
    const problem = offerProblem(offer);
    if (problem) throw new BadRequestException(problem);

    const requested = new Prisma.Decimal(dto.quantity);
    if (requested.gt(offer.stock)) {
      throw new BadRequestException(
        exceedsStock(dto.quantity, offer.stock.toNumber()),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        select: { id: true },
      });
      const existing = await tx.cartItem.findUnique({
        where: { cartId_offerId: { cartId: cart.id, offerId: offer.id } },
        select: { quantity: true },
      });
      const total = requested.plus(existing?.quantity ?? 0);
      if (total.gt(offer.stock)) {
        throw new BadRequestException(
          totalExceedsStock(total.toNumber(), offer.stock.toNumber()),
        );
      }
      await tx.cartItem.upsert({
        where: { cartId_offerId: { cartId: cart.id, offerId: offer.id } },
        update: { quantity: total },
        create: { cartId: cart.id, offerId: offer.id, quantity: requested },
      });
    });

    return this.getCart(userId);
  }

  /** Sets the quantity of one of the user's own lines. */
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    const item = await this.findOwnItem(userId, itemId);
    const offer = await this.findOffer(item.offerId);

    const problem = offerProblem(offer);
    if (problem) throw new BadRequestException(problem);
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.gt(offer.stock)) {
      throw new BadRequestException(
        exceedsStock(dto.quantity, offer.stock.toNumber()),
      );
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartDto> {
    const item = await this.findOwnItem(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<CartDto> {
    await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    return this.getCart(userId);
  }

  /**
   * Adds the browser cart to the server cart after sign-in. Lines that cannot be bought
   * are left out and quantities that would exceed the stock are lowered; each is reported.
   */
  async merge(userId: string, dto: CartLinesDto): Promise<MergeCartResultDto> {
    const wanted = combine(dto.items);
    const offers = await this.prisma.vendorOffer.findMany({
      where: { id: { in: [...wanted.keys()] } },
      include: offerInclude,
    });
    const found = new Map(offers.map((offer) => [offer.id, offer]));
    const notices: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        select: { id: true },
      });

      for (const [offerId, quantity] of wanted) {
        const offer = found.get(offerId);
        if (!offer) {
          notices.push('Một sản phẩm trong giỏ tạm không còn tồn tại nên đã bị bỏ qua.');
          continue;
        }
        const name = offer.variant.product.name;
        const problem = offerProblem(offer);
        if (problem) {
          notices.push(`"${name}": ${problem} Đã bỏ qua.`);
          continue;
        }

        const existing = await tx.cartItem.findUnique({
          where: { cartId_offerId: { cartId: cart.id, offerId } },
          select: { quantity: true },
        });
        let total = quantity.plus(existing?.quantity ?? 0);
        if (total.gt(offer.stock)) {
          total = offer.stock;
          notices.push(
            `"${name}": chỉ còn ${offer.stock.toString()} ${offer.variant.unit} trong kho nên số lượng đã được giảm xuống.`,
          );
        }
        await tx.cartItem.upsert({
          where: { cartId_offerId: { cartId: cart.id, offerId } },
          update: { quantity: total },
          create: { cartId: cart.id, offerId, quantity: total },
        });
      }
    });

    return { cart: await this.getCart(userId), notices };
  }

  /** Prices a guest cart: the same view as a stored cart, with nothing saved. */
  async quote(dto: CartLinesDto): Promise<QuoteDto> {
    const wanted = combine(dto.items);
    const offers = await this.prisma.vendorOffer.findMany({
      where: { id: { in: [...wanted.keys()] } },
      include: offerInclude,
    });
    const found = new Map(offers.map((offer) => [offer.id, offer]));

    const lines: Line[] = [];
    const unknownOfferIds: string[] = [];
    for (const [offerId, quantity] of wanted) {
      const offer = found.get(offerId);
      if (offer) lines.push({ id: null, offer, quantity });
      else unknownOfferIds.push(offerId);
    }
    return { ...toCart(lines), unknownOfferIds };
  }

  private async readLines(userId: string): Promise<Line[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { cart: { userId } },
      orderBy: { createdAt: 'desc' },
      include: { offer: { include: offerInclude } },
    });
    return items.map((item) => ({
      id: item.id,
      offer: item.offer,
      quantity: item.quantity,
    }));
  }

  private async findOffer(offerId: string): Promise<OfferRow> {
    const offer = isUuid(offerId)
      ? await this.prisma.vendorOffer.findUnique({
          where: { id: offerId },
          include: offerInclude,
        })
      : null;
    if (!offer) throw new NotFoundException(OFFER_NOT_FOUND);
    return offer;
  }

  /** The line must be in the cart of the user in the token; someone else's id looks like a missing one. */
  private async findOwnItem(userId: string, itemId: string) {
    const item = isUuid(itemId)
      ? await this.prisma.cartItem.findFirst({
          where: { id: itemId, cart: { userId } },
          select: { id: true, offerId: true },
        })
      : null;
    if (!item) throw new NotFoundException(CART_ITEM_NOT_FOUND);
    return item;
  }
}
