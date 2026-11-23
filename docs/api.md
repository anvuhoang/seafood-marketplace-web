# API

The API is REST over JSON. Every path starts with `/api`. The interactive reference (Swagger UI) is at **`/api/docs`**
and the raw OpenAPI document at `/api/docs-json`; both are on while the API runs in development and off in production
(`API_DOCS_ENABLED=true` turns them on).

## Conventions

| | |
|---|---|
| **Sign in** | `POST /api/auth/login` answers `{ user, accessToken }`. Send the token as `Authorization: Bearer <token>`. |
| **Access** | Routes are protected unless marked *public*. **C** = any signed-in account, **V** = vendor, **A** = admin. A wrong role answers `403`; someone else's data answers `404`. |
| **Errors** | `{ "message": string \| string[], "error": string, "statusCode": number }`. Validation errors (`400`) list one message per bad field, in Vietnamese. |
| **Limits** | Per address and per route; above the limit the answer is `429`. Sign-in 10 a minute, sign-up 5, checkout 10. |
| **Money** | Strings with two decimals in order and payment answers (`"840000.00"`), VND. |
| **Pages** | `?page=` and `?pageSize=` (or `limit`), with a `pagination` object in the answer. |
| **Checkout** | Needs an `Idempotency-Key` header (8–100 characters of `A-Z a-z 0-9 _ -`). |

## Endpoints

### Health

| | Path | Access | |
|---|---|---|---|
| GET | `/api/health` | public | Status of the API and its dependencies |
| GET | `/api/health/live` | public | The process is alive |

### Authentication (`/api/auth`)

| | Path | Access | |
|---|---|---|---|
| POST | `/auth/register` | public | Create a customer account |
| POST | `/auth/login` | public | Sign in by email or phone (customers and vendors) |
| POST | `/auth/admin/login` | public | Admin sign in; every failure looks the same |
| GET | `/auth/me` | C | The signed-in user |
| GET | `/auth/providers` | public | Which sign-in methods are on (Google) |
| POST | `/auth/google` | public | Sign in or sign up with a Google ID token |
| POST | `/auth/forgot-password` | public | Mail a reset link (same answer for any address) |
| POST | `/auth/reset-password/verify` | public | Is a link still good? |
| POST | `/auth/reset-password` | public | Choose a new password with the link |

### Account (`/api/account`) — all C

| | Path | |
|---|---|---|
| GET, PATCH | `/account/profile` | Read and edit the profile |
| POST | `/account/password` | Change the password |
| GET, POST | `/account/addresses` | List and add addresses |
| PUT, DELETE | `/account/addresses/:id` | Edit and delete |
| POST | `/account/addresses/:id/default` | Make the default |
| GET, POST | `/account/reviews` | My reviews; write one (delivered purchases only) |
| POST | `/account/reviews/upload-signature` | Signature for a direct photo upload |

### Catalogue (public)

| | Path | |
|---|---|---|
| GET | `/products` | Listing with search (`q`), category, region, price and stock filters |
| GET | `/products/:identifier` | A product by slug or id |
| GET | `/categories`, `/categories/:slug` | Categories |
| GET | `/regions` | Regions with product and vendor counts |
| GET | `/search/suggest?q=` | Product names that begin like the text |
| GET | `/administrative-units/provinces` | Provinces; `/provinces/:code/districts`, `/districts/:code/wards` |
| GET | `/vendors`, `/vendors/:slug` | Stores and a store page |
| POST | `/visual-search` | Find products from a photo (`GET /visual-search/status`) |

### Cart and checkout

| | Path | Access | |
|---|---|---|---|
| GET, DELETE | `/cart` | C | Read and empty the cart |
| POST | `/cart/items` | C | Add an offer |
| PATCH, DELETE | `/cart/items/:id` | C | Change the quantity, remove |
| POST | `/cart/merge` | C | Merge a guest cart after sign in |
| POST | `/cart/quote` | public | Price a guest cart |
| POST | `/checkout/preview` | C | Totals before confirming |
| POST | `/checkout` | C | Place the order (idempotent) |

### Orders and payment (`/api/orders/me`) — all C

| | Path | |
|---|---|---|
| GET | `/orders/me` | My orders (filters: status, search, payment status) |
| GET | `/orders/me/:orderNumber` | One order with its vendor parts |
| POST | `/orders/me/:orderNumber/cancel` | Cancel while every part is pending |
| POST | `/orders/me/:orderNumber/reorder` | Put the items back in the cart |
| GET | `/orders/me/:orderNumber/payment` | Payment status |
| POST | `/orders/me/:orderNumber/payment/qr` | Make (or remake) the QR |
| POST | `/orders/me/:orderNumber/payment/sync` | Ask PayOS what happened |
| POST | `/payments/payos/webhook` | public, PayOS only (signature checked) |

### Followed vendors

`GET /vendors/followed` (C); `GET`, `PUT`, `DELETE /vendors/:slug/follow` (C).

### Vendor (`/api/vendors/...`)

| | Path | Access | |
|---|---|---|---|
| POST, GET | `/vendors/registration`, `/vendors/registration/me` | C | Apply for a store; read the application |
| GET | `/vendors/me/dashboard`, `/vendors/me/stats` | V | Dashboard and revenue statistics |
| GET, PATCH | `/vendors/me/store` | V | Store profile |
| GET, POST | `/vendors/me/offers` | V | My offers; add one |
| PATCH | `/vendors/me/offers/:id` | V | Price and stock |
| PATCH | `/vendors/me/offers/:id/status` | V | Active, paused, discontinued |
| GET | `/vendors/me/catalog/products` | V | Catalogue products an offer can be attached to |
| POST, GET, PATCH | `/vendors/me/products`, `/products/:id` | V | Propose and edit my products |
| GET | `/vendors/me/orders`, `/vendors/me/orders/:id` | V | My order parts |
| PATCH | `/vendors/me/orders/:id/status` | V | Accept, prepare, ship, complete, cancel |
| GET, POST | `/vendors/me/smart-import/...` | V | `status`, `transcribe`, `draft` |

### Admin (`/api/admin/...`) — all A

| | Path | |
|---|---|---|
| GET | `/admin/stats/overview`, `/users`, `/vendors`, `/products`, `/orders`, `/revenue` | Statistics |
| GET | `/admin/users` | Accounts (read only) |
| GET | `/admin/vendors`, `/admin/vendors/:id` | Stores and applications |
| POST | `/admin/vendors/:id/approve`, `/reject`, `/suspend`, `/reactivate` | Decisions (reject and suspend need a reason) |
| GET, POST, PATCH, DELETE | `/admin/categories...` | Manage categories (`/deactivate`, `/reactivate`) |
| GET, POST | `/admin/search/status`, `/admin/search/reindex` | Search index |
| GET, PATCH, POST | `/admin/chat/...` | `stats`, `health`, `conversations`, `handoffs`, `knowledge/sync` |

### Chatbot (`/api/chat`)

| | Path | Access | |
|---|---|---|---|
| GET | `/chat/status` | public | Is the assistant on? |
| POST | `/chat/messages` | public | Ask; the answer streams as server-sent events. A signed-in customer is recognised. |
| GET | `/chat/conversations/latest`, `/chat/conversations/:id` | public | Read a conversation |
| POST | `/chat/messages/:id/feedback` | public | Thumbs up or down |
| POST | `/chat/handoff` | public | Ask for a person |

## Example

```bash
# sign in
TOKEN=$(curl -s -X POST http://localhost:8088/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrPhone":"nam.le@example.com","password":"Customer@123456"}' | jq -r .accessToken)

# my orders
curl -s http://localhost:8088/api/orders/me -H "Authorization: Bearer $TOKEN"

# search the catalogue (public)
curl -s 'http://localhost:8088/api/products?q=tom%20hum'
```

The list above is written from the controllers (`backend/src/module/**/*.controller.ts`); when a route is added, add it
to the permission matrix in `frontend/e2e/permissions.spec.ts` as well, so its access rule is tested.
