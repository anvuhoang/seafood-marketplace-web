# Testing

| Layer | Tool | Where | Count | What it checks |
|---|---|---|---|---|
| Unit | Vitest | `backend/src/**/*.spec.ts` | ~1,190 | Services, guards, pure rules (order status, pricing), the chat tools, the mail and SMTP transport |
| End to end | Playwright | `frontend/e2e/` | 142 | The real shop in a browser and over HTTP: flows, permissions, ownership |
| Static | oxlint, ESLint, `tsc` | both | | Style and types |
| Migrations | Prisma | CI | | The migrations build the schema from an **empty** database and agree with `schema/*.prisma` |

## Unit tests

```bash
cd backend
npm test            # all unit tests
npm run lint
npm run typecheck
```

> On Windows run `npm test` from PowerShell or cmd with a path that starts with a capital drive letter (`C:\...`). From
> Git Bash (`/c/...`) Vitest can load two copies of itself and fail with "Cannot read properties of undefined (reading 'config')".

Services are tested with a fake `PrismaService` so the rules run without a database; the SMTP transport is tested against
an in-process SMTP server.

## End-to-end tests

They drive a **running shop**; by default the Docker stack at `http://localhost:8088` with the seed data.

```bash
docker compose up -d --build
docker compose --profile tools run --rm seed
cd frontend
npm install
npx playwright install chromium     # once
npm run e2e                         # all 142 tests, about 8 minutes
npx playwright test e2e/auth.spec.ts
npm run e2e:report                  # HTML report of the last run (traces for failures are in test-results/)
```

Against another address, for example the server:

```bash
E2E_BASE_URL=https://haisan.eastasia.cloudapp.azure.com npm run e2e
```

### What is covered

| File | Flows |
|---|---|
| `auth.spec.ts` | sign in (right and wrong password, validation, sign out, admin refused), guarded page → sign in → back, registration, no fake Google button |
| `password-reset.spec.ts` | forgot password end to end, unknown address, invalid link, validation |
| `catalog.spec.ts` | home, search without accents and with a typo, empty result, product page |
| `checkout.spec.ts` | guest cart kept after sign in, empty cart, checkout validation, two vendors → one order with two parts |
| `orders.spec.ts` | history, cancel, buy again from a completed order |
| `permissions.spec.ts` | **permission matrix**: each protected route × signed out / customer / vendor / admin |
| `routes.spec.ts` | **route matrix**: each guarded page × the same four visitors |
| `ownership.spec.ts` | one customer or vendor cannot read or change another's orders, addresses, offers, order parts |
| `reviews.spec.ts` | only after delivery, only the buyer, once per item |
| `vendor-lifecycle.spec.ts` | apply, approve, suspend, reactivate (access follows at once) |
| `vendor-ui.spec.ts`, `admin-ui.spec.ts` | the consoles: take an order to delivered, admin sign in and refusals |
| `sessions.spec.ts` | tokens before a password reset stop working; tampered and escalated tokens are refused |

### How they are written

- **Each test makes its own customer** through the API and places the session where the site keeps it, so tests are
  independent and can run twice in a row. The sign-in form is tested on its own.
- **The matrices are the specification.** A protected route or page is a row in `permissions.spec.ts` /
  `routes.spec.ts`; a route that answers differently fails the test. Add a row whenever you add a protected route.
- **They respect the shop's limits.** Sign-ups (5 a minute) and sign-ins (10 a minute) are paced (`waitForSignUpSlot`,
  `waitForSignInSlot`) instead of switching the limits off. Failures never use the real admin, because repeated failures lock
  an account for 15 minutes.
- **Stock.** `global-setup.ts` tops up the seed product through the vendor API, waits for the Elasticsearch index, and
  tests cancel the orders they no longer need, so repeated runs never sell out.
- **They clean up.** A test that creates a store rejects or suspends it at the end, even when the test fails.
- **Mail.** Without an SMTP server the API writes mails to its log; the reset tests read the link from there
  (`E2E_COMPOSE_PROJECT`, or `E2E_API_LOG_COMMAND` when the API does not run in local Docker) and are skipped if the log
  cannot be read.

More in [`frontend/e2e/README.md`](../frontend/e2e/README.md).

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `dev` and `main`:

| Job | Steps |
|---|---|
| **Backend** | install, lint, type check, unit tests, `prisma migrate deploy` on an empty PostgreSQL, `prisma migrate diff --exit-code`, build |
| **Frontend** | install, lint, build |
| **Containers** | build both images, check the compose file and the nginx configuration |
| **E2E** | start the stack with Docker Compose, load the seed data, run the Playwright suite, keep the report |

## Manual checks

What a computer cannot judge (layout on a phone, wording, how an empty state reads, the look of the mails) is covered by the
manual test pass; its checklist and results are kept in `docs/qa-checklist.md`.
Things that need real accounts are tried by hand once on the server: Gmail delivery, Google sign-in, QR payment with the
PayOS sandbox.

## When a test fails

1. Open the report (`npm run e2e:report`) or the trace (`npx playwright show-trace test-results/<test>/trace.zip`).
2. A burst of failures that mention "quá nhanh" (too fast) or `429` is the rate limit: wait a minute and run again.
3. Searching for a typo fails right after a restart: the Elasticsearch index is still being built (`GET /api/admin/search/status`).
4. A product sold out: the global setup tops it up; run again.
