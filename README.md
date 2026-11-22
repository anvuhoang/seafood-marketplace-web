# seafood-marketplace-web

A marketplace for live seafood: customers buy from many vendors in one order, vendors manage their own offers,
and admins approve vendors and watch the shop.

| Folder | What it is |
|---|---|
| `backend/` | NestJS API with Prisma and PostgreSQL ([setup, tests, chatbot](backend/README.md)) |
| `frontend/` | Next.js website: storefront, vendor console, admin console |
| `deploy/` | nginx configuration for the load balancer |
| `docs/` | [Running and deploying](docs/deployment.md): Docker, rate limiting, cache, Redis, load balancing, CI/CD |

## Quick start

For development, run the API (`cd backend`, `npm run start:dev`) and the website (`cd frontend`, `npm run dev`) as the
READMEs of each folder describe.

To run the whole shop in containers, with PostgreSQL, Redis, two API processes and nginx in front:

```bash
cp .env.docker.example .env      # set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build        # http://localhost:8088
```

Every push and pull request to `dev` and `main` is checked by GitHub Actions (lint, types, tests, migrations, build,
images); see [docs/deployment.md](docs/deployment.md).
