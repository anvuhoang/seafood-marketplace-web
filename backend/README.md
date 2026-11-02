# seafood-marketplace-web — Backend

NestJS API with Prisma and PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env        # if present; otherwise create .env (see below)
npm run db:deploy           # create or update the database tables
npx prisma generate         # generate the Prisma Client
npm run seed                # optional: sample vendors, products, reviews
npm run start:dev
```

`.env` needs at least `DATABASE_URL`, `PORT`, `FRONTEND_URL` and `JWT_SECRET`.

Review photos are uploaded straight from the browser to Cloudinary with a
signature from this API. Add the keys from the Cloudinary dashboard
(Settings → API Keys) to enable it; without them reviews still work, only
photo upload is turned off:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=keep-this-private
```
API docs (Swagger) are served at `http://localhost:<PORT>/api/docs`.

## Database migrations

The schema lives in `prisma/schema/*.prisma`. Every schema change is recorded
as a migration in `prisma/migrations/` and committed with the code. Do **not**
use `prisma db push` any more: it changes the database without leaving a
migration, so other machines and production drift apart.

| Task | Command |
| --- | --- |
| Change the schema | Edit `prisma/schema/*.prisma`, then `npm run db:migrate -- --name <short_description>` |
| Pull someone else's schema change | `npm run db:migrate` (local) |
| Deploy to a server | `npm run db:deploy` |
| Check what is applied | `npm run db:status` |

`db:migrate` (`prisma migrate dev`) creates the SQL file, applies it to your
local database and regenerates the Prisma Client. Review the generated
`migration.sql` before committing it — especially for renames or dropped
columns, which can lose data.

`db:deploy` (`prisma migrate deploy`) only applies committed migrations and
never resets data, so it is the command for staging and production.

### Existing databases created before migrations (one-time)

The first migration, `0_init`, is a baseline of the schema as it was when the
project switched from `db push` to migrations. A database that already has
these tables must mark the baseline as applied instead of running it:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script
# The output must be "-- This is an empty migration." If it is not, run
# `npx prisma db push` once to catch up, then repeat the check.

npx prisma migrate resolve --applied 0_init
npm run db:status            # "Database schema is up to date!"
```

New, empty databases need none of this: `npm run db:deploy` creates
everything from the migrations.

## Seed data

`npm run seed` is safe to run repeatedly. It only upserts sample data and
never overwrites names, images or descriptions that were edited later.

Sample accounts: vendors use `Vendor@123456`, customers (e.g.
`lan.nguyen@example.com`) use `Customer@123456`.

## Tests

```bash
npm test          # unit tests
npm run lint
```
