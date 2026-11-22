# Running and deploying the shop

## The picture

```
                       ┌──────────────┐        ┌─ api ───┐
  browser ──────────►  │    nginx     │ /api/* │         ├──►  PostgreSQL
  (port 8088)          │ round robin  │ ─────► │ api (x2)┤
                       │ rate limit   │        └────┬────┘
                       └──────┬───────┘             └───────►  Redis  (limits, cache)
                              │ everything else
                              ▼
                        web (Next.js)  ──(rendering a page)──► nginx ──► api-*
```

- **nginx** is the only thing the outside world talks to. It serves the website, spreads `/api` calls over the API
  processes (in turn), tries another one when one does not answer, and keeps a coarse limit per address.
- **api** (two replicas) are two copies of the same API. They are stateless (the sign-in is a JWT), so any of them can
  answer any request. What they must agree on lives in **Redis**: rate limit counters, sign-in lock-outs and the cache.
- **PostgreSQL** holds the data. **migrate** runs `prisma migrate deploy` once at start; the API waits for it.
- **Elasticsearch** (one node) holds a search index of the products. The API does not need it to run: if it is down
  or not configured, product search works the way it did before, in memory.

## Run everything with Docker

```bash
cp .env.docker.example .env      # set POSTGRES_PASSWORD and JWT_SECRET (see the comments in the file)
docker compose up --build        # open http://localhost:8088 (8088, not 8080: Windows reserves 8080 on many machines)
docker compose --profile tools run --rm seed    # optional: sample vendors, products, customers
```

Useful checks:

```bash
curl -i http://localhost:8088/api/health         # database, Redis, which process answered
curl -sI http://localhost:8088/api/categories | grep -i "x-served-by\|ratelimit"
for i in 1 2 3 4; do curl -s http://localhost:8088/api/health | grep -o '"instance":"[^"]*"'; done   # alternates between the two replicas
docker stop haisan-api-1         # the shop keeps working on the other replica
```

## What protects and speeds up the API

| Piece | Where | Behaviour |
|---|---|---|
| **Global rate limit** | `src/infra/rate-limit.guard.ts` | Every route is limited per IP address: 300 requests per minute shared by the routes without their own limit (`RATE_LIMIT_DEFAULT`, `RATE_LIMIT_WINDOW_SECONDS`). Answers `429` with `Retry-After`, and every response carries `RateLimit-Limit` / `RateLimit-Remaining`. |
| **Stricter limits** | `@RateLimit(n, seconds)` | register 5/min, sign-in 10/min, admin sign-in 10/min, place an order 10/min, create a QR payment 10/min, check a payment 30/min, post a review 10/min, upload signatures 20/min. The PayOS webhook is exempt (`@SkipRateLimit()`). |
| **Per-feature limits** | `login-attempt.limiter.ts`, `smart-import.limiter.ts`, `chat.limiter.ts` | Admin sign-in lock-out (5 wrong tries, 15 minutes), vendor Smart Import (30 per 10 minutes), chatbot (per person and a daily budget). They use the same shared store, so with Redis they are one set of counters. |
| **Shared store** | `src/infra/kv-store.ts` | `REDIS_URL` set: Redis (atomic counters in a Lua script, `SCAN` not `KEYS`). Not set: in memory, which is right for one process and what development uses. |
| **Cache** | `src/infra/cache.service.ts` | The product listing and the categories are kept for `CACHE_CATALOG_TTL_SECONDS` (30). Requests for the same key share one database load. Changes made by vendors and admins empty the cache at once (`@InvalidatesCatalog()`). |
| **Health** | `GET /api/health`, `/api/health/live` | `live`: the process runs. `health`: the database answers (else 503) and Redis does (else `degraded`, still 200). |
| **Request trace** | `X-Served-By` header | Hostname of the process that answered. |
| **Website's own calls** | nginx port 81, `RATE_LIMIT_TRUST_INTERNAL` | The website renders some pages by calling the API, so those calls come from one address on behalf of many visitors. They go through nginx's internal port 81 (not published), which marks them with `X-Internal-Request: 1`; the API then leaves them out of the per-IP count. The public port strips that header, so a visitor cannot claim to be the website. |
| **Proxy awareness** | `TRUST_PROXY=1` | Behind nginx the API reads the visitor's address from `X-Forwarded-For`. Without it every visitor would share nginx's address and one limit. |
| **Graceful stop** | `enableShutdownHooks()` | On `SIGTERM` the API finishes its requests and closes its database and Redis connections. |

**If Redis is down** the shop keeps working: rate limits let requests through (and log it), the cache reads from the
database, and the health check says `degraded`. A broken Redis must never become a broken shop.

### Settings

| Variable | Default | Meaning |
|---|---|---|
| `REDIS_URL` | empty | `redis://host:6379`. Empty = memory store. |
| `REDIS_KEY_PREFIX` | `haisan:` | All keys start with this, so the shop can share a Redis server. |
| `RATE_LIMIT_ENABLED` | `true` | `false` switches the global limit off (the per-feature limits stay). |
| `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_WINDOW_SECONDS` | `300` / `60` | The default limit. |
| `CACHE_ENABLED` / `CACHE_CATALOG_TTL_SECONDS` | `true` / `30` | The catalogue cache. |
| `ELASTICSEARCH_URL` | empty | `http://elasticsearch:9200`. Empty = product search in memory. |
| `ELASTICSEARCH_INDEX` / `SEARCH_MAX_RESULTS` | `haisan-products` / `300` | The alias name, and how many best matches a search takes from Elasticsearch. |
| `TRUST_PROXY` | empty | Hops of proxies to trust (`1` behind nginx), `true`, or a list of addresses. |

## Product search (Elasticsearch)

| Piece | Where | Behaviour |
|---|---|---|
| **Search** | `src/module/search/`, `ELASTICSEARCH_URL` | The words typed in the search box are matched in Elasticsearch: no accents needed ("tom hum" finds "Tôm Hùm"), a slip in a word is forgiven ("tom hun"), and the best match comes first. The shop then applies its own filters (category, region, price, stock) and facet counts to the products Elasticsearch names. Price and stock are never indexed, so they are always current. |
| **Suggestions** | `GET /api/search/suggest?q=` | Product names that begin like what was typed, shown under the search box. Without Elasticsearch the same endpoint answers from the catalogue. |
| **Fallback** | `ProductSearchService` | Not configured, no answer within `ELASTICSEARCH_TIMEOUT_MS` (1.5 s), or no index yet: the shop searches as before. The visitor only loses the typo tolerance. |
| **Keeping it current** | `ProductIndexerService` | The index is rebuilt (into a new index, then the alias `haisan-products` is switched in one step) when the API starts and shortly after anything that empties the catalogue cache: a vendor or admin changing products, offers, categories or vendors. A burst of changes is indexed once. A lock in Redis keeps two API processes from indexing at the same time. |
| **By hand** | `npm run search:reindex`, `POST /api/admin/search/reindex`, `GET /api/admin/search/status` | After restoring a database, or to check how many products the index holds. |

The index uses no plugin: text is lower-cased and folded to plain letters (`asciifolding`), and the name also keeps the first
2 to 15 letters of every word (edge n-grams) so a name is found while it is being typed. Raise `PRODUCT_INDEX_VERSION`
(`product-index.ts`) when the mapping changes; the API then builds a new index at start-up.

## Database indexes

Measured on a throw-away database with 300,000 orders and 1.35 million order lines (the queries a customer or vendor makes
were already instant, because they are scoped by customer or vendor and use the existing indexes):

| Query | Before | After |
|---|---|---|
| Count how often an offer was sold (the vendor's product editor does it for every offer) | 170 ms, whole table read | 0.4 ms, `order_items(offer_id)` |
| Same for carts that hold an offer | no index (`cart_items` is small, not measured) | `cart_items(offer_id)` |

Not added on purpose: a trigram index on product names (the only name search is limited to one customer's orders, which is
already instant) and an index on `payments(status, paid_at)` (the admin revenue queries read most of the table, so it
gained next to nothing). A new index is worth adding when `EXPLAIN ANALYZE` of a real query shows a table scan; the
`CREATE INDEX` of a migration locks writes while it builds, which matters on a large table.

## CI/CD (GitHub Actions)

| Workflow | When | What it checks or does |
|---|---|---|
| `.github/workflows/ci.yml` | push and pull request to `dev` / `main` | **Backend**: lint, type check, unit tests, `prisma migrate deploy` on an empty PostgreSQL, `prisma migrate diff --exit-code` (the schema files and the migrations agree), build. **Frontend**: lint, build. **Containers**: both images build, `docker compose config` is valid, the nginx config passes `nginx -t`. |
| `.github/workflows/docker-publish.yml` | push to `main`, tags `v*`, manual | Builds the API and website images and pushes them to `ghcr.io/<owner>/<repo>-api` and `-web`, tagged with the branch, the release and the commit. |
| `.github/workflows/deploy.yml` | after "Publish images" succeeds on `main`, or by hand | Pulls the images on the server over SSH, migrates, restarts, health-checks, and rolls back if unhealthy. |
| `.github/dependabot.yml` | weekly | Pull requests for npm, Docker and Actions updates, minor and patch grouped. |

Recommended on GitHub (Settings, Branches): protect `dev` and `main` and require the **Backend**, **Frontend** and
**Containers** checks before merging. Branch protection is a setting on github.com; it cannot be committed.

**Deploying** to a server is described in "Deploy to a server (Azure)" below. The plain manual way is: on the server, `docker compose pull && docker compose up -d`
(use the published images by replacing `build:` with `image: ghcr.io/...` in a `docker-compose.prod.yml`, or build
on the server with `docker compose up --build -d`). The website has its public address written in when it is built
(`NEXT_PUBLIC_API_URL`), so the published image is built for the address in the repository variable `PUBLIC_URL`
(Settings, Secrets and variables, Actions, Variables). Automatic deployment needs a server to deploy to; add a job
that connects to it (SSH) when there is one.

## Email and sign-in with Google

**Email** (`backend/src/module/mail`). The API sends the password reset link, a "password changed" notice, the order
confirmation, the payment receipt and the shipped / delivered / cancelled notices. Mail never holds up an order: it is
queued in the API process, retried twice, and a failure is only logged (the address masked).

| Setting | Meaning |
|---|---|
| `SMTP_USER`, `SMTP_PASS` | A Gmail address and its **App password** (Google account, Security, 2-Step Verification, App passwords). With `SMTP_USER` empty, mails are written to the API log instead, so development works without a mailbox. |
| `MAIL_PROVIDER` | `smtp`, `log` or `off`. Chosen from `SMTP_USER` when not set. |
| `MAIL_FROM`, `APP_URL` | Sender, and the website address used in links (defaults to the first `FRONTEND_URL`). |

Gmail allows about 500 mails a day, which is plenty for a project like this; a real shop would move to a mail service
(SendGrid, SES) by adding a transport next to `smtp.transport.ts`.

**Forgot password.** `POST /api/auth/forgot-password` always answers the same, whether or not the address has an
account. The mail holds a link with a random token that works once, for 30 minutes; only its SHA-256 is stored. An
address gets at most 3 mails an hour. Finishing a reset signs the account out everywhere (tokens issued earlier are
refused, using a timestamp in Redis or memory) and sends a notice. Admin accounts cannot be reset this way.

**Sign in with Google.** Set `GOOGLE_CLIENT_ID` (an OAuth client of type *Web application*; add the website address
under *Authorized JavaScript origins*). The browser gets an ID token from Google and the API checks its signature,
audience and expiry. Without the client ID the button is hidden. Nobody who registered with a password has proved they
own the mailbox, so when Google links to such an account its old password is replaced by one nobody knows, its
sessions end and the owner is told by mail (they can pick a new password with *Forgot password*). Admins never sign in
with Google.

If the sessions are revoked on one API process, the others must see it: run Redis (`REDIS_URL`) when there is more
than one process, as for the rate limits.

## Deploy to a server (Azure)

The shop runs on one small Linux server: the same Docker Compose stack as on a laptop, plus **Caddy** in front of nginx for
HTTPS. GitHub builds the images and the server only pulls them.

```
merge into main ─> Publish images (GitHub builds API + web, pushes to ghcr.io) ─> Deploy (SSH) ─> server:
visitor ──https──> Caddy ──> nginx ──> website / 2 API processes ──> PostgreSQL, Redis, Elasticsearch
```

| File | What it is |
|---|---|
| `docker-compose.prod.yml` | Overrides the compose file: images from ghcr.io instead of builds, memory limits, Caddy, nginx not published |
| `deploy/caddy/Caddyfile` | HTTPS for `$DOMAIN`, streaming for the chatbot, security headers |
| `deploy/prod.env.example` | The `.env` of the server (domain, images, secrets, optional keys) |
| `deploy/server-setup.sh` | One-time setup of a fresh Ubuntu server: Docker, 2 GiB swap, `/opt/haisan`, security updates |
| `deploy/deploy.sh` | Pulls the images, runs the migration, starts the shop, checks `/api/health`, and **goes back to the previous images** if it is not healthy |
| `.github/workflows/deploy.yml` | Runs `deploy.sh` on the server over SSH after "Publish images" succeeds on `main`, or by hand |

### The server

Tested sizing: **2 vCPU and 4 GiB RAM** (Azure `Standard_B2als_v2`, region East Asia, Ubuntu 24.04, 64 GiB disk, static public
IP). Open ports **22, 80 and 443**. Give the public IP a DNS name label in the Azure portal (Overview > DNS name), for
example `haisan.eastasia.cloudapp.azure.com`: Caddy gets a free certificate for it, so no domain has to be bought.

### First time

1. **Set up the machine.** `ssh -i haisan-vm_key.pem azureuser@<dns name>`, then run `deploy/server-setup.sh` (it installs
   Docker, adds swap, creates `/opt/haisan`). Log out and in again.
2. **Write the settings.** On the server, create `/opt/haisan/.env` from `deploy/prod.env.example`: set `DOMAIN`,
   `PUBLIC_URL`, `API_IMAGE`, `WEB_IMAGE`, `POSTGRES_PASSWORD`, `JWT_SECRET` (long and random), and whichever optional
   keys you have (Gmail App password, Google client ID, PayOS, Cloudinary, chatbot). Run `chmod 600 .env`.
3. **Tell GitHub where the shop is.** Settings > Secrets and variables > Actions:
   variables `PUBLIC_URL` (`https://<dns name>`), `DEPLOY_HOST` (`<dns name>`), `DEPLOY_USER` (`azureuser`), and the secret
   `DEPLOY_SSH_KEY` (the whole content of the `.pem` file). `PUBLIC_URL` is written into the website when its image is
   built, so set it **before** the first build. Also create the environment `production` (Settings > Environments); add
   yourself as a required reviewer if you want to approve each deploy.
4. **Publish and deploy.** Merge `dev` into `main` (a pull request). "Publish images" builds the two images, then "Deploy" runs.
   If the packages are private, the workflow logs the server in to ghcr.io with its own token.
5. **Load the sample data once** (the first deploy leaves an empty shop): on the server,
   `cd /opt/haisan && bash deploy/deploy.sh --seed`.
6. Open `https://<dns name>` and sign in with the demo accounts.

Deploying by hand needs no GitHub: copy `docker-compose.yml`, `docker-compose.prod.yml` and `deploy/` to `/opt/haisan`,
and run `bash deploy/deploy.sh`.

### After the first deploy

- **Google sign-in:** add `https://<dns name>` to the OAuth client's "Authorized JavaScript origins", and set
  `GOOGLE_CLIENT_ID` in the server's `.env`.
- **PayOS:** register `https://<dns name>/api/payments/payos/webhook` as the webhook.
- **Mail:** set `SMTP_USER` and `SMTP_PASS`; without them mails are only written to the API log.
- A changed `.env` needs `bash deploy/deploy.sh` (it recreates the containers whose settings changed).

### Day to day

| To | Run on the server (in `/opt/haisan`) |
|---|---|
| See what runs | `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` |
| Read the API log | `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api` |
| Back up the database | `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db pg_dump -U haisan haisan > backup.sql` |
| Go back one release | `deploy.sh` does it by itself when the new release is unhealthy; later, set `API_IMAGE` and `WEB_IMAGE` to an older tag and run `deploy.sh` |

**Cost.** On Azure for Students the machine uses the free credit, roughly 1.5 USD a day while it runs. Stop it in the portal
(Stop, and check it says "Stopped (deallocated)") when it is not needed, and delete the resource group when the demo is over.

## Things to know

- **Fixed-window limits.** A burst can straddle two windows and briefly reach twice the limit. That is fine for
  protecting the shop from abuse; it is not a billing-grade meter.
- **Stock in the listing is up to 30 seconds late.** Orders change stock constantly, and emptying the cache on every
  sale would defeat it. The cart and checkout always read the real stock.
- **Scaling out** means raising `deploy.replicas` of `api` in `docker-compose.yml` (or `docker compose up -d --scale api=3`);
  nginx finds the new copies through Docker's DNS within 5 seconds, so nothing in `deploy/nginx/default.conf` changes. Two or more processes need `REDIS_URL`; without it each
  process counts on its own and every limit is multiplied by the number of processes.
- **Chatbot documents.** Each API process syncs `backend/knowledge` when it starts. Two processes starting together
  may both embed a new document once (the result is the same row); it only costs a few extra embedding calls.
- **Not covered:** HTTPS (put a certificate on nginx or a cloud load balancer in front), backups of the PostgreSQL
  volume, log shipping and metrics.
