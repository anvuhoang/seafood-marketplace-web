# HaiSan Express — Website

The Next.js website: the storefront, the vendor console and the admin console. The API it talks to is in
[`../backend`](../backend/README.md); the overall picture is in the [root README](../README.md) and
[docs/architecture.md](../docs/architecture.md).

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide icons. Text shown to visitors is Vietnamese.

## Run it

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                    # http://localhost:3000
```

The API must be running (`cd ../backend && npm run start:dev`) with `FRONTEND_URL=http://localhost:3000`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build (also type-checks) and server |
| `npm run lint` | ESLint |
| `npm run e2e` | Playwright end-to-end tests against a running shop (default `http://localhost:8088`); see [e2e/README.md](e2e/README.md) |

## Settings

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | The address of the API as the browser reaches it. **Written into the code when the site is built**, so a Docker image is built for one address (the `docker-publish` workflow uses the repository variable `PUBLIC_URL`). |
| `NEXT_PUBLIC_ADMIN_URL` | Optional separate address for the admin site. When set, `/admin` is served only there and the shop host answers "not found" for it. Add the same origin to `FRONTEND_URL` in the API. Leave it out to keep `/admin` on the same address. |
| `API_INTERNAL_URL` | How the website's *server* reaches the API while rendering (in Docker `http://nginx:81/api`). |

Nothing here is secret: `NEXT_PUBLIC_` values are visible in the browser. All settings: [docs/configuration.md](../docs/configuration.md).

## How it is organised

```
src/
  app/                   pages (routes)
    (home), products/, categories/, visual-search/
    customer/            login, register, forgot/reset password, cart, checkout, orders, profile, addresses, reviews
    vendor/              register, [slug] (public store), (console)/ dashboard, products, orders, statistics, settings
    admin/               login, (console)/ dashboard, vendors, users, categories, chatbot
  features/              one folder per feature: components/, api/, hooks/, types/
    auth, cart, checkout, order, payment, product, catalog, category, vendor, vendor-registration,
    admin, account, chat, visual-search, home
  components/shared/     shared pieces (logo, header, footer)
  lib/                   API base address, constants, helpers
  proxy.ts               the route guard (see below)
e2e/                     Playwright tests
public/brand/            logo and favicon (SVG)
```

A page in `src/app/` only composes components from a feature. A feature keeps its API calls in `api/`, so a request is
written once.

## Sessions and the route guard

- **`features/auth/context/AuthContext.tsx`** keeps the token and user. "Remember me" uses `localStorage`, otherwise
  `sessionStorage`. On load it asks `GET /auth/me`; any `401` signs the visitor out.
- **`src/proxy.ts`** (the Next.js request proxy) reads two cookies, `haisan_token` and `haisan_role`, and redirects:
  a signed-out visitor to sign in (with `?redirect=` to come back), a visitor of the wrong role to `/unauthorized`, a
  signed-in visitor away from the sign-in pages. **The cookies are only a hint.** The server never trusts them: the API
  checks the token and reads the role from the database on every request, so a forged cookie opens a page that loads
  nothing.
- **Google sign-in** (`GoogleSignInButton`) loads Google's own button only when `GET /auth/providers` says it is on, and
  sends the ID token to the API.

## Conventions

- Prices come from the API as strings and are formatted with `Intl` (`vi-VN`, đ).
- Forms validate on the page for quick feedback and again on the server; the server's messages (Vietnamese) are shown as
  they are.
- No `data-testid`: tests select by role, label and visible text, which also keeps the pages usable with a screen reader.
- Images from vendors and customers are served by Cloudinary; the API only signs the upload.

## Docker

`Dockerfile` builds a standalone server (`output: "standalone"`). The image needs `NEXT_PUBLIC_API_URL` as a **build
argument**:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://example.com/api -t haisan-web .
```

`docker compose` and the deploy workflow do this for you (see [docs/deployment.md](../docs/deployment.md)).
