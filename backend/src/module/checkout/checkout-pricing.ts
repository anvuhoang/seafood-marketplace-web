import { Prisma } from '@prisma/client';

/** One bought line as the order stores it: the offer's price and names as they are right now. */
export interface PricedLine {
  offerId: string;
  vendorId: string;
  vendorName: string;
  productName: string;
  variantName: string;
  unit: string;
  unitPrice: Prisma.Decimal;
  quantity: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export interface PricedVendorOrder {
  vendorId: string;
  lines: PricedLine[];
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

export interface PricedOrder {
  vendorOrders: PricedVendorOrder[];
  subtotal: Prisma.Decimal;
  shippingTotal: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

/** price x quantity in whole hundredths, with exact decimals. */
export const lineTotal = (price: Prisma.Decimal, quantity: Prisma.Decimal) =>
  price.mul(quantity).toDecimalPlaces(2);

/**
 * Totals of an order, from the lines the server read. Each vendor order has its own subtotal and
 * flat shipping fee; the order adds them up. Vendors keep the order they first appear in.
 */
export function priceOrder(
  lines: Omit<PricedLine, 'lineTotal'>[],
  shippingFeePerVendor: Prisma.Decimal.Value,
): PricedOrder {
  const fee = new Prisma.Decimal(shippingFeePerVendor).toDecimalPlaces(2);
  const byVendor = new Map<string, PricedLine[]>();
  for (const line of lines) {
    const priced = { ...line, lineTotal: lineTotal(line.unitPrice, line.quantity) };
    byVendor.set(line.vendorId, [...(byVendor.get(line.vendorId) ?? []), priced]);
  }

  const vendorOrders = [...byVendor].map(([vendorId, vendorLines]) => {
    const subtotal = vendorLines.reduce((sum, line) => sum.plus(line.lineTotal), new Prisma.Decimal(0));
    return { vendorId, lines: vendorLines, subtotal, shippingFee: fee, grandTotal: subtotal.plus(fee) };
  });

  const sum = (pick: (order: PricedVendorOrder) => Prisma.Decimal) =>
    vendorOrders.reduce((total, order) => total.plus(pick(order)), new Prisma.Decimal(0));
  return {
    vendorOrders,
    subtotal: sum((order) => order.subtotal),
    shippingTotal: sum((order) => order.shippingFee),
    grandTotal: sum((order) => order.grandTotal),
  };
}

/** "HSE-" and eight digits, like the numbers in the seed data. Unique in the database; a clash is retried. */
export function newOrderNumber(random: (min: number, max: number) => number): string {
  return `HSE-${random(10_000_000, 100_000_000)}`;
}
