# Configuration

Every setting of the shop in one place: what it does, whether it is required, and what happens when it is empty.
Settings are environment variables; where they live depends on how you run the shop:

| You run | The settings are in | Template |
|---|---|---|
| The API for development | `backend/.env` | `backend/.env.example` |
| The website for development | `frontend/.env.local` | `frontend/.env.example` |
| Docker Compose on your machine | `.env` next to `docker-compose.yml` | `.env.docker.example` |
| A server | `/opt/haisan/.env` on the server | `deploy/prod.env.example` |

**Secrets stay in these files** (never in git, never in the website). The values of `NEXT_PUBLIC_*` are written into the
website's code when it is built and are visible to everyone.

> Features are **off until their key is set**: the shop runs without mail, Google sign-in, QR payment, the chatbot, photos
> and Elasticsearch, and says nothing is wrong.

## 1. Required

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, `postgresql://user:password@host:5432/db?schema=public` |
| `JWT_SECRET` | Key that signs sessions; at least 32 characters. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The API refuses to start without it. |

In Docker Compose these come from `POSTGRES_PASSWORD` (the database password) and `JWT_SECRET`.

## 2. The API

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `5000` | Port the API listens on |
| `NODE_ENV` | `development` | `production` in containers; turns the Swagger page off unless `API_DOCS_ENABLED` says otherwise |
| `FRONTEND_URL` | `http://localhost:3000` | Browser addresses the API accepts (CORS), comma separated. Add the admin address too if it is separate. |
| `JWT_EXPIRES_IN` | `7d` | Life of a customer or vendor session |
| `ADMIN_JWT_EXPIRES_IN` | `2h` | Life of an admin session |
| `API_DOCS_ENABLED` | on outside production | `true`/`false`: Swagger at `/api/docs` |
| `TRUST_PROXY` | empty | How many proxies stand in front of the API (`1` behind nginx) so the visitor's address is used, not the proxy's |
| `SHIPPING_FEE_PER_VENDOR` | `30000` | Flat shipping fee (VND) charged once for each vendor in an order |

## 3. Redis, cache and rate limits

| Variable | Default | Meaning |
|---|---|---|
| `REDIS_URL` | empty | `redis://host:6379`. Empty = counters and cache live in each process's memory (right for one process; with several, every limit is multiplied) |
| `REDIS_KEY_PREFIX` | `haisan:` | Prefix of every key, so Redis can be shared |
| `RATE_LIMIT_ENABLED` | `true` | `false` switches the global per-address limit off (per-route limits stay) |
| `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_WINDOW_SECONDS` | `300` / `60` | Requests per address and window for routes without their own limit |
| `RATE_LIMIT_TRUST_INTERNAL` | `false` | `true` only behind the shop's nginx: the website's own server-side calls are left out of the count |
| `CACHE_ENABLED` | `true` | The catalogue cache |
| `CACHE_CATALOG_TTL_SECONDS` | `30` | How long the listing and categories are kept |

## 4. Search

| Variable | Default | Meaning |
|---|---|---|
| `ELASTICSEARCH_URL` | empty | `http://elasticsearch:9200`. Empty = the shop searches in memory (no typo tolerance) |
| `ELASTICSEARCH_INDEX` | `haisan-products` | Name of the index alias |
| `ELASTICSEARCH_TIMEOUT_MS` | `1500` | Past this the shop answers from memory for a short while |
| `SEARCH_MAX_RESULTS` | `300` | How many best matches a search takes from Elasticsearch |

After restoring a database, or loading sample data outside the API, rebuild the index: `npm run search:reindex` or
`POST /api/admin/search/reindex`.

## 5. Email

| Variable | Default | Meaning |
|---|---|---|
| `SMTP_USER`, `SMTP_PASS` | empty | A Gmail address and its **App password** (16 characters, no spaces). Empty = mails are written to the API log instead of sent |
| `MAIL_PROVIDER` | `smtp` if `SMTP_USER` is set, else `log` | `smtp`, `log`, or `off` (sends and logs nothing) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.gmail.com` / `465` / `true` for 465 | Port 587 needs `SMTP_SECURE=false` |
| `MAIL_FROM` | `"HaiSan Express" <SMTP_USER>` | The sender shown. Gmail only sends as the signed-in address. Not passed by `docker-compose.yml` |
| `APP_URL` | first `FRONTEND_URL` | Where the links in mails lead |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | Life of a reset link |

How to get a Gmail App password: turn on 2-Step Verification, then <https://myaccount.google.com/apppasswords>.

## 6. Sign in with Google

| Variable | Meaning |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID (type *Web application*) from Google Cloud Console. Empty = the button is hidden and the API refuses. No secret is needed. |

Add every address of the website (for example `http://localhost:3000`, `https://haisan.eastasia.cloudapp.azure.com`) to
the client's **Authorized JavaScript origins**, without a trailing slash. While the app is in *Testing* only the listed
test users can sign in.

## 7. QR payment (PayOS)

| Variable | Default | Meaning |
|---|---|---|
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | empty | From the PayOS dashboard. Any missing = QR payment is not offered (cash on delivery still works) |
| `PAYOS_LINK_TTL_MINUTES` | `15` | How long a QR stays valid |

Register `https://<site>/api/payments/payos/webhook` as the webhook in the PayOS dashboard (a tunnel works for local
tests).

## 8. Photos (Cloudinary)

| Variable | Meaning |
|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Dashboard values. Empty = photo upload is off (reviews and products still work without photos) |

## 9. AI features

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | empty | Key from <https://aistudio.google.com/apikey>. Turns the chatbot on |
| `CHAT_PROVIDER` | `gemini` if the key is set, else off | `gemini`, `groq`, `mock` (no key, keyword stand-in for development and tests) |
| `CHATBOT_ENABLED` | `true` | `false` switches the chatbot off whatever else is set |
| `GEMINI_CHAT_MODEL` / `GEMINI_EMBED_MODEL` / `GEMINI_EMBED_DIMENSIONS` | `gemini-2.5-flash` / `gemini-embedding-001` / `768` | Models |
| `GROQ_API_KEY` | empty | Key from <https://console.groq.com>. Turns Smart Import and Visual Search on, and serves the chatbot with `CHAT_PROVIDER=groq` |
| `GROQ_CHAT_MODEL` | `openai/gpt-oss-120b` | Chatbot model when `CHAT_PROVIDER=groq` |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Where the Groq calls go (chatbot, Smart Import, Visual Search). Set it to a relay, for example `https://<your-relay>/api/openai/v1`, when the server's region is refused by Groq. The key still comes from `GROQ_API_KEY` |
| `CHAT_RATE_LIMIT_MESSAGES` / `CHAT_RATE_LIMIT_WINDOW_MINUTES` | `20` / `10` | Messages per person in the window |
| `CHAT_DAILY_BUDGET` | `2000` | Messages the whole shop may send a day |
| `CHAT_MAX_MESSAGE_LENGTH` | `500` | Longer messages are refused |
| `CHAT_MAX_OUTPUT_TOKENS` / `CHAT_TIMEOUT_MS` | `1500` / `30000` | Limits of one answer |
| `CHAT_HISTORY_MESSAGES` / `CHAT_MAX_TOOL_ROUNDS` | `12` / `4` | Conversation sent back each turn; tool calls allowed per answer |
| `SMART_IMPORT_PROVIDER` | `groq` if `GROQ_API_KEY`, else off | `groq` or `mock` |
| `SMART_IMPORT_TRANSCRIBE_MODEL` / `SMART_IMPORT_EXTRACT_MODEL` / `SMART_IMPORT_TIMEOUT_MS` | `whisper-large-v3-turbo` / `openai/gpt-oss-120b` / `20000` | Speech to text, draft writing, timeout |
| `VISUAL_SEARCH_PROVIDER` | `groq` if `GROQ_API_KEY`, else off | `groq`, `mock`, or `off` |
| `VISUAL_SEARCH_MODEL` / `VISUAL_SEARCH_TIMEOUT_MS` | `qwen/qwen3.8-27b` / `20000` | The model must accept images |

> **Region.** Gemini refuses requests from some regions (a server in Hong Kong, such as Azure *East Asia*, gets
> `User location is not supported for the API use`). Use `CHAT_PROVIDER=groq` there. Groq has no embedding model, so the help
> documents are then searched by words, computed on the server.

## 10. The website

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | The address of the API as the **browser** reaches it. Written into the code at build time, so the image is built for one address |
| `NEXT_PUBLIC_ADMIN_URL` | empty | A separate address for the admin site. Set = `/admin` is served only there. Empty = `/admin` on the same address |
| `API_INTERNAL_URL` | the public one | How the website's own server reaches the API (in Docker: `http://nginx:81/api`) |

## 11. Docker Compose and the server

| Variable | Meaning |
|---|---|
| `POSTGRES_PASSWORD` | Required. Database password, used only between the containers |
| `POSTGRES_USER`, `POSTGRES_DB` | Default `haisan` |
| `PUBLIC_URL` | The address visitors use (default `http://localhost:8088`); becomes `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` |
| `HTTP_PORT` | Port nginx publishes (default `8088`; on a server `127.0.0.1:8088`, as Caddy is the front door) |
| `DOMAIN` | Server only: the DNS name Caddy gets a certificate for |
| `API_IMAGE`, `WEB_IMAGE` | Server only: the images to pull, for example `ghcr.io/anvuhoang/seafood-marketplace-web-api:main` |

GitHub Actions variables and secrets for the deploy (`PUBLIC_URL`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`) are
described in [deployment.md](deployment.md).

## 12. The end-to-end tests

| Variable | Default | Meaning |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:8088` | Where the shop runs |
| `E2E_API_URL` | `<base>/api` | Where the API is |
| `E2E_COMPOSE_PROJECT` | `haisan` | Docker Compose project, to read the API log |
| `E2E_API_LOG_COMMAND` | none | A command that prints the API log, when the API does not run in local Docker |
