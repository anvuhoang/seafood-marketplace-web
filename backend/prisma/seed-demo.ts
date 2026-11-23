import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { buildCatalog, buildSpecies, type CategorySlug, type DemoProduct } from './demo/catalog.js';
import { pexels, POOLS, REVIEW_PHOTO_POOLS } from './demo/images.js';
import { groupOfCategory, makeAddress, makeCustomers, makeReview } from './demo/people.js';
import { Random, roundPrice } from './demo/random.js';
import { DEMO_VENDORS, SIZE_WEIGHT, type DemoVendor } from './demo/vendors.js';

/**
 * Fills the shop with demo data that looks like a real marketplace: about 300 products with sizes and offers from
 * several vendors, a dozen more stores, 120 customers, 900 orders over the last 90 days in every status, reviews
 * with some photos, follows and saved addresses.
 *
 *   npm run seed:demo
 *
 * Run `npm run seed` first (categories and the admin account). The data is made from a fixed random seed, so every
 * run builds the same shop, and running it again adds nothing. Search is not updated by this script: reindex
 * afterwards (POST /api/admin/search/reindex, or restart the API).
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not configured in .env');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const SEED = 20260101;
const CUSTOMER_COUNT = 120;
const ORDER_COUNT = 900;
const HISTORY_DAYS = 90;
const DAY = 86_400_000;
const NOW = Date.now();
const ADMIN_EMAIL = 'admin@haisanexpress.vn';

type VendorOrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

const STAGES: VendorOrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'SHIPPING', 'COMPLETED'];

/** The order's status follows its slowest live part; it is cancelled only when every part is. */
function deriveOrderStatus(parts: VendorOrderStatus[]): OrderStatus {
  const live = parts.filter((status) => status !== 'CANCELLED');
  if (live.length === 0) return 'CANCELLED';
  const slowest = live.reduce((a, b) => (STAGES.indexOf(a) <= STAGES.indexOf(b) ? a : b));
  return ({ PENDING: 'PENDING', ACCEPTED: 'CONFIRMED', PREPARING: 'PROCESSING', SHIPPING: 'SHIPPING', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const)[slowest];
}

const ago = (days: number) => new Date(NOW - days * DAY);
const hours = (h: number) => h * 3_600_000;

async function main() {
  console.log('Seeding demo data...');
  const categories = new Map((await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  if (categories.size < 6) throw new Error('Categories are missing. Run "npm run seed" first.');
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) throw new Error('The admin account is missing. Run "npm run seed" first.');

  const rng = new Random(SEED);

  // ------------------------------------------------------------ species
  const speciesId = new Map<string, string>();
  for (const species of buildSpecies()) {
    const row = await prisma.seafoodSpecies.upsert({
      where: { slug: species.slug },
      update: {},
      create: { slug: species.slug, commonName: species.commonName, scientificName: species.scientificName, description: species.description },
    });
    speciesId.set(species.slug, row.id);
  }

  // ------------------------------------------------------------ vendors
  const vendorPassword = await bcrypt.hash('Vendor@123456', 10);
  const customerPassword = await bcrypt.hash('Customer@123456', 10);
  const vendorIds = new Map<string, string>();
  for (const v of DEMO_VENDORS) {
    const opened = ago(v.daysAgo);
    const owner = await prisma.user.upsert({
      where: { email: v.ownerEmail },
      update: {},
      create: {
        email: v.ownerEmail, fullName: v.ownerName, phone: v.ownerPhone,
        passwordHash: v.status === 'PENDING' ? customerPassword : vendorPassword,
        role: v.status === 'PENDING' ? 'CUSTOMER' : 'VENDOR', status: 'ACTIVE', emailVerifiedAt: opened, createdAt: opened,
      },
    });
    const vendor = await prisma.vendor.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        ownerId: owner.id, name: v.name, slug: v.slug, description: v.description,
        logoUrl: pexels(rng.pick(POOLS[v.logoPool]), 200), coverUrl: pexels(rng.pick(POOLS[v.coverPool]), 1200),
        phone: v.phone, email: v.email, province: v.province, district: v.district, streetAddress: v.streetAddress,
        status: v.status, createdAt: opened,
      },
    });
    vendorIds.set(v.slug, vendor.id);
    if (v.status !== 'PENDING' && (await prisma.vendorDecision.count({ where: { vendorId: vendor.id } })) === 0) {
      const approved = new Date(opened.getTime() + hours(20));
      await prisma.vendorDecision.create({ data: { vendorId: vendor.id, adminId: admin.id, action: 'APPROVE', fromStatus: 'PENDING', toStatus: 'ACTIVE', createdAt: approved } });
      if (v.status === 'SUSPENDED') {
        await prisma.vendorDecision.create({ data: { vendorId: vendor.id, adminId: admin.id, action: 'SUSPEND', fromStatus: 'ACTIVE', toStatus: 'SUSPENDED', reason: v.note ?? 'Vi phạm quy định gian hàng.', createdAt: ago(20) } });
      }
    }
  }
  const activeVendors = DEMO_VENDORS.filter((v) => v.status === 'ACTIVE');
  console.log(`  vendors: ${DEMO_VENDORS.length}`);

  // ------------------------------------------------------------ products
  const catalog = buildCatalog(new Random(SEED + 1));
  const existingProducts = await prisma.product.findMany({ where: { slug: { in: catalog.map((p) => p.slug) } }, select: { slug: true } });
  const have = new Set(existingProducts.map((p) => p.slug));
  const productRng = new Random(SEED + 2);
  let created = 0;
  const productCreatedAt = new Map<string, Date>();
  for (const p of catalog) {
    const createdAt = ago(productRng.int(30, 240));
    productCreatedAt.set(p.slug, createdAt);
    if (have.has(p.slug)) continue;
    await prisma.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.description, status: 'ACTIVE', isFeatured: p.featured, createdAt,
        speciesId: speciesId.get(p.speciesSlug) ?? null,
        categories: { create: { categoryId: categories.get(p.category)! } },
        images: { create: p.imageIds.map((id, i) => ({ imageUrl: pexels(id, 800), altText: p.name, sortOrder: i, isPrimary: i === 0 })) },
        variants: { create: p.variants.map((v) => ({ name: v.name, sku: v.sku, unit: v.unit, sizeLabel: v.sizeLabel })) },
      },
    });
    created += 1;
  }
  console.log(`  products: ${catalog.length} (${created} new)`);

  const dbProducts = await prisma.product.findMany({
    where: { slug: { in: catalog.map((p) => p.slug) } },
    select: { id: true, slug: true, variants: { select: { id: true, sku: true } } },
  });
  const productBySlug = new Map(dbProducts.map((p) => [p.slug, p]));
  const variantBySku = new Map(dbProducts.flatMap((p) => p.variants.map((v) => [v.sku!, v.id] as const)));

  // ------------------------------------------------------------ offers
  const offerRng = new Random(SEED + 3);
  const vendorFor = (slug: string) => vendorIds.get(slug)!;
  const offerRows: Array<{ vendorId: string; variantId: string; price: number; stock: number; status: 'ACTIVE' | 'PAUSED'; createdAt: Date }> = [];
  const fallback = activeVendors.find((v) => v.slug === 'cho-bien-ha-noi')!;
  for (const p of catalog) {
    const eligible = activeVendors.filter((v) => v.categories.includes(p.category));
    const pool = eligible.length ? eligible : [fallback];
    const wanted = 1 + (offerRng.chance(0.55) ? 1 : 0) + (offerRng.chance(0.3) ? 1 : 0) + (offerRng.chance(0.1) ? 1 : 0);
    const chosen: DemoVendor[] = [];
    const candidates = [...pool];
    while (chosen.length < Math.min(wanted, candidates.length + chosen.length) && candidates.length) {
      const pick = offerRng.weighted(candidates.map((v) => [v, SIZE_WEIGHT[v.size] * (v.regions.some((r) => p.origin.includes(r) || r.includes(p.origin)) ? 5 : 1)] as const));
      chosen.push(pick);
      candidates.splice(candidates.indexOf(pick), 1);
    }
    const listedAt = productCreatedAt.get(p.slug)!;
    for (const vendor of chosen) {
      const shift = 0.94 + offerRng.next() * 0.12;
      const added = new Date(Math.min(NOW, listedAt.getTime() + offerRng.int(0, 6) * DAY));
      for (const variant of p.variants) {
        const variantId = variantBySku.get(variant.sku);
        if (!variantId) continue;
        const soldOut = offerRng.chance(0.05);
        offerRows.push({
          vendorId: vendorFor(vendor.slug), variantId, price: roundPrice(p.basePrice * variant.priceFactor * shift),
          stock: soldOut ? 0 : p.unit === 'kg' ? offerRng.int(20, 400) : offerRng.int(8, 90),
          status: offerRng.chance(0.04) ? 'PAUSED' : 'ACTIVE', createdAt: added,
        });
      }
    }
  }
  const offerResult = await prisma.vendorOffer.createMany({ data: offerRows, skipDuplicates: true });
  console.log(`  offers: ${offerRows.length} (${offerResult.count} new)`);

  // ------------------------------------------------------------ customers
  const customerRng = new Random(SEED + 4);
  // Made without looking at the database, so every run produces the same people; the ones already there are skipped.
  const people = makeCustomers(customerRng, CUSTOMER_COUNT, new Set(), new Set());
  const categoryList = [...categories.keys()] as CategorySlug[];
  const customerRows = people.map((p) => ({
    email: p.email, fullName: p.fullName, phone: p.phone, gender: p.gender, passwordHash: customerPassword, role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const, emailVerifiedAt: ago(customerRng.int(5, 170)), createdAt: ago(customerRng.int(5, 170)),
    interests: customerRng.sample(categoryList, customerRng.int(1, 3)),
    birthDate: new Date(Date.UTC(customerRng.int(1965, 2003), customerRng.int(0, 11), customerRng.int(1, 28))),
  }));
  const userResult = await prisma.user.createMany({ data: customerRows, skipDuplicates: true });
  const newEmails = new Set(customerRows.map((c) => c.email));
  if (userResult.count > 0) {
    const users = await prisma.user.findMany({ where: { email: { in: [...newEmails] } }, select: { id: true, email: true, fullName: true, phone: true } });
    const addressRows = users.flatMap((u) => {
      const count = customerRng.chance(0.3) ? 2 : 1;
      return Array.from({ length: count }, (_, i) => {
        const a = makeAddress(customerRng);
        return {
          userId: u.id, recipientName: u.fullName, recipientPhone: u.phone ?? '', province: a.province, district: a.district, ward: a.ward,
          streetAddress: a.streetAddress, label: (i === 0 ? 'HOME' : customerRng.pick(['OFFICE', 'FAMILY'])) as 'HOME' | 'OFFICE' | 'FAMILY',
          note: customerRng.chance(0.25) ? customerRng.pick(['Gọi trước 15 phút khi tới.', 'Giao giờ hành chính.', 'Để hàng ở bảo vệ nếu không có nhà.']) : null,
          isDefault: i === 0, createdAt: ago(customerRng.int(1, 150)),
        };
      });
    });
    await prisma.userAddress.createMany({ data: addressRows });
    const followRows = users.flatMap((u) =>
      customerRng
        .sample(activeVendors, customerRng.weighted([[0, 40], [1, 30], [2, 20], [3, 10]]))
        .map((v) => ({ userId: u.id, vendorId: vendorFor(v.slug), createdAt: ago(customerRng.int(1, 120)) })),
    );
    await prisma.vendorFollow.createMany({ data: followRows, skipDuplicates: true });
  }
  console.log(`  customers: ${CUSTOMER_COUNT} (${userResult.count} new)`);

  // ------------------------------------------------------------ orders and reviews
  const hasOrders = (await prisma.order.count({ where: { orderNumber: { startsWith: 'HSD-' } } })) > 0;
  if (hasOrders) {
    console.log('  orders: already there, skipped');
  } else {
    await seedOrders(catalog);
  }

  await refreshVendorRatings();
  console.log('Done. Reindex search: POST /api/admin/search/reindex (or restart the API).');
}

// ---------------------------------------------------------------- orders

async function seedOrders(catalog: DemoProduct[]) {
  const rng = new Random(SEED + 5);
  const popularity = new Map(catalog.map((p) => [p.slug, p.popularity]));
  const meta = new Map(catalog.map((p) => [p.slug, p]));

  const offers = await prisma.vendorOffer.findMany({
    where: { status: 'ACTIVE', vendor: { status: 'ACTIVE', slug: { in: DEMO_VENDORS.map((v) => v.slug) } }, variant: { sku: { startsWith: 'DM-' } } },
    select: {
      id: true, vendorId: true, price: true, vendor: { select: { name: true } },
      variant: { select: { id: true, name: true, unit: true, product: { select: { id: true, slug: true, name: true } } } },
    },
  });
  type OfferRow = (typeof offers)[number];
  const byProduct = new Map<string, Map<string, OfferRow[]>>();
  for (const o of offers) {
    const slug = o.variant.product.slug;
    const variants = byProduct.get(slug) ?? new Map<string, OfferRow[]>();
    variants.set(o.variant.id, [...(variants.get(o.variant.id) ?? []), o]);
    byProduct.set(slug, variants);
  }
  const sellable = [...byProduct.keys()].map((slug) => [slug, popularity.get(slug) ?? 0.01] as const);

  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER', email: { endsWith: '@example.com' }, addresses: { some: {} } },
    orderBy: { email: 'asc' },
    select: { id: true, fullName: true, phone: true, addresses: { select: { id: true, recipientName: true, recipientPhone: true, province: true, district: true, ward: true, streetAddress: true, isDefault: true } } },
  });
  if (customers.length === 0 || sellable.length === 0) throw new Error('No customers or offers to make orders from.');
  const customerOrder = rng.sample(customers, customers.length);
  const customerWeights = customerOrder.map((c, i) => [c, 1 / (i + 10)] as const);

  // When each order was placed: newer days are busier, with a morning and an evening peak.
  const placedAt = Array.from({ length: ORDER_COUNT }, () => {
    const day = Math.floor(Math.pow(rng.next(), 1.25) * HISTORY_DAYS);
    const hour = rng.weighted([[7, 4], [8, 6], [9, 8], [10, 9], [11, 10], [12, 6], [13, 4], [14, 4], [15, 5], [16, 6], [17, 9], [18, 10], [19, 9], [20, 6], [21, 3]]);
    const date = new Date(NOW - day * DAY);
    date.setHours(hour, rng.int(0, 59), rng.int(0, 59), 0);
    return date.getTime() > NOW - hours(1) ? new Date(NOW - hours(1) - rng.int(0, 90) * 60_000) : date;
  }).sort((a, b) => a.getTime() - b.getTime());

  const orders: any[] = [], vendorOrders: any[] = [], items: any[] = [], payments: any[] = [], shipments: any[] = [];
  const reviewCandidates: Array<{ userId: string; productId: string; slug: string; itemId: string; deliveredAt: Date }> = [];

  for (let n = 0; n < ORDER_COUNT; n++) {
    const createdAt = placedAt[n]!;
    const ageDays = (NOW - createdAt.getTime()) / DAY;
    const customer = rng.weighted(customerWeights);
    const address = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0]!;
    const orderId = randomUUID();

    // Lines: group the picked offers by vendor.
    const lineCount = rng.weighted([[1, 45], [2, 30], [3, 17], [4, 8]]);
    const picked = new Map<string, { offer: OfferRow; quantity: number }>();
    for (let l = 0; l < lineCount; l++) {
      const slug = rng.weighted(sellable);
      const variants = [...byProduct.get(slug)!.values()];
      const offerList = rng.pick(variants);
      const offer = rng.pick(offerList);
      if (picked.has(offer.id)) continue;
      const unit = offer.variant.unit;
      const quantity = unit === 'kg' ? rng.pick([0.5, 1, 1, 1.5, 2, 2, 3, 5]) : rng.int(1, 3);
      picked.set(offer.id, { offer, quantity });
    }
    const byVendor = new Map<string, Array<{ offer: OfferRow; quantity: number }>>();
    for (const line of picked.values()) byVendor.set(line.offer.vendorId, [...(byVendor.get(line.offer.vendorId) ?? []), line]);

    // The outcome, by how old the order is; the timeline below pulls it back if it could not have happened yet.
    const bank = rng.chance(0.3);
    let target: VendorOrderStatus = ageDays >= 6
      ? rng.weighted<VendorOrderStatus>([['COMPLETED', 88], ['CANCELLED', 12]])
      : ageDays >= 2
        ? rng.weighted<VendorOrderStatus>([['COMPLETED', 55], ['SHIPPING', 20], ['PREPARING', 8], ['ACCEPTED', 7], ['CANCELLED', 10]])
        : rng.weighted<VendorOrderStatus>([['PENDING', 35], ['ACCEPTED', 25], ['PREPARING', 15], ['SHIPPING', 15], ['CANCELLED', 5], ['COMPLETED', 5]]);
    if (bank && target === 'PENDING') target = 'CANCELLED'; // a QR payment nobody made expires and the order is cancelled

    let subtotal = 0, shippingTotal = 0;
    const partStatuses: VendorOrderStatus[] = [];
    const partRows: Array<{ id: string; vendorId: string; status: VendorOrderStatus; lines: Array<{ offer: OfferRow; quantity: number }>; subtotal: number; fee: number; shippedAt: Date | null; deliveredAt: Date | null; carrier: string }> = [];
    for (const [vendorId, lines] of byVendor) {
      const partSubtotal = lines.reduce((sum, line) => sum + Number(line.offer.price) * line.quantity, 0);
      const fee = partSubtotal >= 500_000 ? 0 : rng.pick([25_000, 30_000, 35_000]);
      let status = target;
      // Parts of one order are not always at the same step: one may be a step behind.
      if ((target === 'PREPARING' || target === 'SHIPPING') && byVendor.size > 1 && rng.chance(0.3)) status = STAGES[STAGES.indexOf(target) - 1]!;
      const shipAfter = createdAt.getTime() + hours(rng.int(2, 18));
      const deliverAfter = shipAfter + hours(rng.int(3, 20));
      const prepAfter = createdAt.getTime() + hours(1);
      // The timeline: nothing can be later than now.
      if (status === 'COMPLETED' && deliverAfter > NOW) status = 'SHIPPING';
      if (status === 'SHIPPING' && shipAfter > NOW) status = 'PREPARING';
      if ((status === 'PREPARING' || status === 'ACCEPTED') && prepAfter > NOW) status = 'PENDING';
      if (bank && status === 'PENDING' && target !== 'CANCELLED') status = 'ACCEPTED';
      const shipped = status === 'SHIPPING' || status === 'COMPLETED';
      partStatuses.push(status);
      subtotal += partSubtotal;
      shippingTotal += fee;
      partRows.push({
        id: randomUUID(), vendorId, status, lines, subtotal: partSubtotal, fee,
        shippedAt: shipped ? new Date(shipAfter) : null, deliveredAt: status === 'COMPLETED' ? new Date(deliverAfter) : null,
        carrier: rng.pick(['Giao Hàng Nhanh', 'Ahamove', 'Viettel Post', 'Vựa tự giao', 'Grab Express']),
      });
    }
    const status = deriveOrderStatus(partStatuses);
    const lastEvent = Math.max(createdAt.getTime(), ...partRows.map((p) => p.deliveredAt?.getTime() ?? p.shippedAt?.getTime() ?? createdAt.getTime() + hours(1)));
    const updatedAt = new Date(Math.min(NOW, status === 'PENDING' ? createdAt.getTime() : lastEvent));

    orders.push({
      id: orderId, orderNumber: `HSD-${String(n + 1).padStart(6, '0')}`, userId: customer.id, addressId: address.id, status,
      subtotal, shippingTotal, grandTotal: subtotal + shippingTotal, recipientName: address.recipientName, recipientPhone: address.recipientPhone,
      shippingAddress: address.streetAddress, shippingProvince: address.province, shippingDistrict: address.district, shippingWard: address.ward,
      customerNote: rng.chance(0.12) ? rng.pick(['Cho em xin đá khô để giữ lạnh.', 'Giao buổi sáng giúp mình nhé.', 'Làm sạch giúp em phần mực.', 'Gọi trước khi giao.', 'Chọn con to giúp mình.']) : null,
      createdAt, updatedAt,
    });

    for (const part of partRows) {
      vendorOrders.push({
        id: part.id, orderId, vendorId: part.vendorId, status: part.status, subtotal: part.subtotal, shippingFee: part.fee, grandTotal: part.subtotal + part.fee,
        vendorNote: part.status === 'CANCELLED' ? rng.pick(['Hết hàng đúng size khách chọn, xin lỗi anh/chị.', 'Khách yêu cầu hủy đơn.', 'Không liên lạc được với khách.']) : null,
        createdAt, updatedAt: new Date(Math.min(NOW, part.deliveredAt?.getTime() ?? part.shippedAt?.getTime() ?? createdAt.getTime() + hours(1))),
      });
      for (const line of part.lines) {
        const itemId = randomUUID();
        const p = line.offer.variant.product;
        items.push({
          id: itemId, vendorOrderId: part.id, offerId: line.offer.id, productNameSnapshot: p.name, variantNameSnapshot: line.offer.variant.name,
          vendorNameSnapshot: line.offer.vendor.name, unitSnapshot: line.offer.variant.unit, unitPrice: Number(line.offer.price), quantity: line.quantity,
          lineTotal: Number(line.offer.price) * line.quantity,
        });
        if (part.status === 'COMPLETED') reviewCandidates.push({ userId: customer.id, productId: p.id, slug: p.slug, itemId, deliveredAt: part.deliveredAt! });
      }
      if (part.shippedAt) {
        shipments.push({
          id: randomUUID(), vendorOrderId: part.id, carrier: part.carrier, trackingNumber: `${part.carrier.slice(0, 2).toUpperCase()}${rng.int(10_000_000, 99_999_999)}VN`,
          status: part.status, estimatedDelivery: new Date(part.shippedAt.getTime() + hours(12)), shippedAt: part.shippedAt, deliveredAt: part.deliveredAt,
        });
      }
    }

    // The payment follows the order: COD is paid at delivery, a QR transfer before the vendor accepts.
    const base = { id: randomUUID(), orderId, method: bank ? 'BANK_TRANSFER' : 'COD', amount: subtotal + shippingTotal, provider: bank ? 'PayOS' : 'COD', createdAt };
    const done = partRows.find((p) => p.deliveredAt);
    if (status === 'CANCELLED') {
      if (bank) {
        const paidBefore = target === 'CANCELLED' && rng.chance(0.5) && ageDays >= 1;
        payments.push(paidBefore
          ? { ...base, status: 'REFUNDED', paidAt: new Date(createdAt.getTime() + hours(0.2)), reference: `FT${rng.int(1_000_000_000, 9_999_999_999)}`, failureReason: 'Order cancelled, refunded' }
          : { ...base, status: 'EXPIRED', expiresAt: new Date(createdAt.getTime() + 15 * 60_000), failureReason: 'QR expired' });
      } else {
        payments.push({ ...base, status: 'CANCELLED', failureReason: 'Order cancelled' });
      }
    } else if (bank) {
      payments.push({ ...base, status: 'PAID', paidAt: new Date(createdAt.getTime() + rng.int(3, 20) * 60_000), reference: `FT${rng.int(1_000_000_000, 9_999_999_999)}` });
    } else if (status === 'COMPLETED' && done) {
      payments.push({ ...base, status: 'PAID', paidAt: new Date(Math.max(...partRows.map((p) => p.deliveredAt?.getTime() ?? 0))) });
    } else {
      payments.push({ ...base, status: 'PENDING' });
    }
  }

  // Reviews: about half of the delivered lines, mostly good, a few with a photo of the dish.
  const reviews: any[] = [], reviewImages: any[] = [];
  for (const c of reviewCandidates) {
    if (!rng.chance(0.4)) continue;
    const product = meta.get(c.slug)!;
    const rating = rng.weighted([[5, 58], [4, 27], [3, 9], [2, 4], [1, 2]]);
    const { content, highlights } = makeReview(rng, rating, groupOfCategory(product.category, product.kind));
    const reviewId = randomUUID();
    reviews.push({
      id: reviewId, userId: c.userId, productId: c.productId, orderItemId: c.itemId, rating, content, highlights, isAnonymous: rng.chance(0.08), status: 'PUBLISHED',
      createdAt: new Date(Math.min(NOW - 60_000, c.deliveredAt.getTime() + hours(rng.int(4, 96)))),
    });
    if (rating >= 4 && rng.chance(0.12)) {
      const pool = POOLS[rng.pick(REVIEW_PHOTO_POOLS)];
      for (const [i, id] of rng.sample(pool, rng.int(1, 2)).entries()) reviewImages.push({ id: randomUUID(), reviewId, imageUrl: pexels(id, 800), sortOrder: i });
    }
  }

  await prisma.$transaction(
    async (tx) => {
      const chunk = <T,>(rows: T[], size = 1000) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
      for (const rows of chunk(orders)) await tx.order.createMany({ data: rows });
      for (const rows of chunk(vendorOrders)) await tx.vendorOrder.createMany({ data: rows });
      for (const rows of chunk(items)) await tx.orderItem.createMany({ data: rows });
      for (const rows of chunk(payments)) await tx.payment.createMany({ data: rows });
      for (const rows of chunk(shipments)) await tx.shipment.createMany({ data: rows });
      for (const rows of chunk(reviews)) await tx.review.createMany({ data: rows });
      for (const rows of chunk(reviewImages)) await tx.reviewImage.createMany({ data: rows });
    },
    { timeout: 300_000, maxWait: 60_000 },
  );
  console.log(`  orders: ${orders.length}, items: ${items.length}, payments: ${payments.length}, shipments: ${shipments.length}`);
  console.log(`  reviews: ${reviews.length} (${reviewImages.length} photos)`);
}

/** The stars shown on a store: the average and the count of the reviews of what it sold. */
async function refreshVendorRatings() {
  const rows = await prisma.$queryRaw<Array<{ vendor_id: string; avg: string; count: bigint }>>`
    SELECT vo.vendor_id, AVG(r.rating)::numeric(3,2)::text AS avg, COUNT(*) AS count
    FROM reviews r
    JOIN order_items oi ON oi.id = r.order_item_id
    JOIN vendor_orders vo ON vo.id = oi.vendor_order_id
    WHERE r.status = 'PUBLISHED'
    GROUP BY vo.vendor_id`;
  const demoIds = new Set(
    (await prisma.vendor.findMany({ where: { slug: { in: DEMO_VENDORS.map((v) => v.slug) } }, select: { id: true } })).map((v) => v.id),
  );
  for (const row of rows) {
    if (!demoIds.has(row.vendor_id)) continue;
    await prisma.vendor.update({ where: { id: row.vendor_id }, data: { ratingAverage: row.avg, ratingCount: Number(row.count) } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
