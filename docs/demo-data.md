# Demo data

Written for: people who run or show the shop and want it to look like a real marketplace, not an empty one.

The base seed (`npm run seed`) gives a handful of vendors, a few products and four customers: enough for tests, too
little for a demo. The **demo seed** fills the rest.

## What it makes

| What | How many | Notes |
|---|---|---|
| Products | 300 | 44 product families, each in several forms (live, fresh, frozen, cooked, dried, sauce) and origins; 2-5 sizes each; 3 photos each; a description written from the family, form and origin |
| Vendors | 15 | 12 active stores (large, medium and small), 2 applications waiting for an admin, 1 suspended store. Owners sign in with `Vendor@123456` |
| Offers | about 1,200 | Each product is sold by 1-4 vendors at slightly different prices; stores favour products from their own region and category |
| Customers | 120 | Vietnamese names, `@example.com` addresses (nobody owns that domain, so no mail is ever sent), saved addresses, favourite categories, follows. Password `Customer@123456` |
| Orders | 900 | Over the last 90 days, in every status. COD and QR (bank transfer) payments, shipments with a carrier and tracking number. Numbers `HSD-000001` onwards |
| Reviews | about 550 | On delivered lines, mostly 4 and 5 stars with some complaints; about one in ten good reviews has a photo of the dish |
| Admin decisions | 14 | Approvals and a suspension with a reason, so the admin audit page has a history |

The orders follow the same rules as the real flow: the order status comes from the slowest live part; a QR order is paid
before a vendor accepts it; a COD order is paid when delivered; a cancelled paid order is refunded; nothing happens in
the future. Vendor ratings are calculated from the reviews.

## Run it

Run the base seed first (it makes the categories and the admin), then the demo seed. Both are safe to run again.

```bash
# local, without Docker
cd backend
npm run seed
npm run seed:demo

# Docker Compose
docker compose --profile tools run --rm seed
docker compose --profile tools run --rm seed-demo

# the server (loads both, then restarts the API so search indexes the products)
bash deploy/deploy.sh --seed-demo
```

The data comes from a fixed random seed, so every run builds the same shop and running it twice adds nothing (products,
offers and customers are skipped when they exist; orders are skipped when any `HSD-` order exists). To start again, reset
the database.

**Search is not updated by the seed.** The seed writes to the database directly. After it, restart the API (it indexes
on start) or call `POST /api/admin/search/reindex` as admin. `deploy.sh --seed-demo` restarts the API for you.

## Where it lives

```
backend/prisma/seed-demo.ts       the script: writes everything in order, in one transaction for the orders
backend/prisma/demo/catalog.ts    species, product families, forms, origins, sizes, prices, descriptions
backend/prisma/demo/vendors.ts    the demo vendors
backend/prisma/demo/people.ts     names, addresses, review sentences
backend/prisma/demo/images.ts     the photo ids
backend/prisma/demo/random.ts     the seeded random generator
```

To change the size of the shop, edit the constants at the top of `seed-demo.ts` (`CUSTOMER_COUNT`, `ORDER_COUNT`,
`HISTORY_DAYS`) or the `count` of a family in `catalog.ts`.

## Photos

Product, store and review photos come from [Pexels](https://www.pexels.com/license/), whose licence allows free use, also
commercially, without attribution. They are loaded from Pexels' own address
(`images.pexels.com/photos/<id>/...`), so the shop needs internet access to show them. Every id in `images.ts` was
looked at and grouped by what the picture shows (salmon, tiger prawn, swimming crab, oyster and so on), so a crab product
never shows a fish. The photos are for the demo only; use your own photos in a real shop.

## Limits

- It is demo data: reviews and names are generated, prices are plausible but invented.
- Vendors and customers made by the demo seed have the shared demo passwords above. Do not load it on a shop with real users.
- The seed does not make carts, chat conversations or password-reset tokens.
