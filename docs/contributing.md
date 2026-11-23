# Contributing

How changes are made, so the history stays readable and `dev` stays working.

## Branches and pull requests

```
feature/<name>   ──PR──▶  dev  ──PR──▶  main  ──▶  deployed
fix/<name>
test/<name>, docs/<name>, chore/<name>
```

- Work on a branch named by the kind of change (`feature/`, `fix/`, `test/`, `docs/`, `chore/`) and a short name.
- Open a pull request into **`dev`** (the default branch). CI must pass: backend, frontend, containers, E2E.
- A release is a pull request from `dev` into **`main`**; merging it publishes the images and deploys.
- Keep a pull request to **one purpose**. A fix found while working on something else gets its own branch.

### Pull request description

The sections used in this repository: **Description**, **What changed**, **How to test**, **Verified**, **Notes for
reviewers** (what was *not* verified, known limits), **Checklist**.

## Commits

A short imperative summary with a type, then a body that says **why**:

```
feat(auth): email sending, password reset, Google sign-in and order emails

- Mail module: nodemailer over Gmail SMTP, a log transport for development ...
```

Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`. A few commits that each make sense are better than many tiny
ones.

## Code

- **Back end**: one folder per feature in `src/module/`; controllers stay thin, rules live in services; validate input
  with DTO classes; give every controller method an explicit return type and a DTO class for the answer (the Swagger
  plugin reads them); write a `*.spec.ts` next to the service.
- **Database**: edit `prisma/schema/*.prisma`, then `npm run db:migrate -- --name <what>`; read the generated SQL before
  committing it; never use `prisma db push`. CI checks that the migrations rebuild the schema from nothing and that
  nothing is missing.
- **Front end**: a feature gets a folder in `src/features/` (components, API calls, types); the pages in `src/app/`
  only compose them. Text shown to customers is Vietnamese.
- **Security**: another person's data answers 404; a role is checked with `@Roles()` on the route and read from the
  database; never put a secret in the website. A new protected route is a new row in
  `frontend/e2e/permissions.spec.ts`.
- **Features that need a key** are off while the key is empty, and the shop says nothing is wrong.

## Before opening a pull request

```bash
cd backend  && npm run lint && npm run typecheck && npm test
cd frontend && npm run lint && npx tsc --noEmit
# and, when behaviour changed, with the shop running:
cd frontend && npm run e2e
```

## Secrets

Never commit `.env`, keys, or the private key of a server. `.env.example` files hold names and explanations, never values.
Images published to the registry contain no secrets; the settings of a running shop live in its `.env`.
