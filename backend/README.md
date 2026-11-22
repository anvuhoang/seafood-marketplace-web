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
API docs (Swagger) are served at `http://localhost:<PORT>/api/docs`, and the raw
OpenAPI document at `/api/docs-json`. They are on by default and off when
`NODE_ENV=production`; set `API_DOCS_ENABLED=true` or `false` to override.

Response schemas come from the DTO classes through the Nest Swagger CLI plugin
(see `nest-cli.json`): declare response DTOs as classes, not interfaces, give
controller methods an explicit return type, and use `/** @example ... */` on a
field to show an example value.

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

> On Windows, run `npm test` from a terminal whose path starts with a capital drive letter (`C:\...`,
> PowerShell or cmd). From Git Bash (`/c/...`) vitest can load two copies of itself and fail with
> "Cannot read properties of undefined (reading 'config')".

## Chatbot (shopping assistant)

A chat widget on the storefront ("Cá Voi") answers questions about products, the customer's own
orders, and the shop's policies. Code: `src/module/chat/`; admin page: `/admin/chatbot`.

How it works, in one paragraph: the model (Gemini) never touches the database. It can only ask the API to
run **tools** (`search_products`, `get_my_order`, `list_my_recent_orders`, `search_knowledge`,
`propose_add_to_cart`, `propose_reorder`, `remember_preference`, `contact_support`). Live data (price,
stock, order status) always comes from tools that call the same services as the shop; policies and
how-tos come from the help documents (RAG). The customer is identified by the token, never by the model,
and "add to cart" is only a proposal: the cart changes when the customer presses the button.

```env
GEMINI_API_KEY=...        # https://aistudio.google.com/apikey ; empty = chatbot off
CHAT_PROVIDER=mock        # optional: no key, no network (keyword stub, for development and tests)
CHATBOT_ENABLED=false     # switch it off whatever else is set
```

Other settings (model names, limits) are in `.env.example`. The chat has a per-person rate limit and a
daily budget, so a script cannot spend the model quota.

**Help documents (RAG).** Markdown files in `backend/knowledge/`, one `##` section per passage. The API
syncs them at start-up; after editing run `npm run knowledge:ingest` (or press "Đồng bộ tài liệu" in
the admin page). Passages are embedded once and kept in `knowledge_chunks` as a plain number array and
searched with cosine similarity plus keywords, so no `pgvector` extension is needed. Move to pgvector if
the corpus grows to many thousands of passages.

**Evaluation.** `npm run chat:eval` asks ~30 questions (`src/module/chat/eval/chat-eval.cases.ts`) as a
guest, a customer and another customer, checks which tools were called, which cards appeared and what the
answer says, and writes `chat-eval-report.md`. It needs the seed data and a real model
(`GEMINI_API_KEY`); with `CHAT_PROVIDER=mock` it only checks that the harness works. It puts back what it
changed (conversations, remembered notes) unless you pass `--keep`.

**Adding a tool.** Write a class implementing `ChatTool` in `src/module/chat/tools/`, add it to
`ChatModule.providers` and to `ChatToolRegistry`, and describe it in the eval cases.

**Monitoring.** `/admin/chatbot` has a "Hiệu năng & hạn mức" part (API: `GET /api/admin/chat/health`):
latency (average, p50, p95, per day), tokens in and out, today's messages against the daily budget, and
a log of incidents (model 429 / timeout / errors, blocked answers, failing tools, people who hit the rate
limit, takeover attempts) with warnings. Tokens come from the model's own count. Google does not offer an
API for the remaining Gemini quota, so a rising number of "429" incidents is the signal that the quota is
used up (the real figures are in Google AI Studio).

## Product search (Elasticsearch)

With `ELASTICSEARCH_URL` set, the words typed in the search box are matched in Elasticsearch: no accents needed, a slip
in a word is forgiven, the best match comes first, and product names are suggested while typing
(`GET /api/search/suggest?q=`). Without it, or while it is down, the shop searches in memory as before. The index is
built when the API starts and follows changes to products, offers, categories and vendors; to rebuild it by hand run
`npm run search:reindex` (or `POST /api/admin/search/reindex`). Code: `src/module/search/`; how it works and the
measured database indexes: [docs/deployment.md](../docs/deployment.md).
