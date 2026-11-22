# End-to-end tests (Playwright)

These tests drive a real browser against a running shop and check what a customer sees: signing in, searching,
the cart, checkout, orders, and forgotten passwords.

## Run them

```bash
docker compose up -d --build          # the shop, at http://localhost:8088
docker compose --profile tools run --rm seed   # once: demo accounts and products
cd frontend
npm install
npx playwright install chromium       # once
npm run e2e                           # all tests
npx playwright test e2e/auth.spec.ts  # one file
npm run e2e:report                    # open the HTML report of the last run
```

A failing test leaves a screenshot and a trace in `test-results/` (`npx playwright show-trace <trace.zip>`).

| Setting | Default | Meaning |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:8088` | Where the shop runs. |
| `E2E_API_URL` | `<base>/api` | Where the API is. |
| `E2E_COMPOSE_PROJECT` | `haisan` | Docker Compose project, to read the API log. |
| `E2E_API_LOG_COMMAND` | – | A command that prints the API log, when the API does not run in Docker. |

## What is covered

| File | Flows |
|---|---|
| `auth.spec.ts` | sign-in (right and wrong password, validation, sign out, admin account refused), protected page → sign-in → back, registration (new, duplicate), no fake Google button |
| `password-reset.spec.ts` | forgot password end to end (link from the API log, new password, old password and used link stop working), same answer for an unknown address, invalid link, form validation |
| `catalog.spec.ts` | home, search without accents and with a typo, empty result, product page, unknown product |
| `checkout.spec.ts` | guest cart kept after sign-in, empty cart, checkout validation, two vendors → one order with two parts paid on delivery |
| `orders.spec.ts` | order in the history, cancel a pending order, buy again from a completed order (the vendor completes it through the API) |

## How they are written

- **Each test makes its own customer** through the API and signs in by placing the session where the site keeps it
  (`support/session.ts`), so tests do not depend on each other or on their order, and can be run twice in a row.
  The sign-in form itself is tested in `auth.spec.ts`.
- **The shop limits sign-ups to 5 a minute and sign-ins to 10 a minute per address.** The tests run one at a time and
  pace their sign-ups (`waitForSignUpSlot`), so they stay under the limit instead of switching it off.
- **Stock.** Orders take stock. `global-setup.ts` tops up the seed product through the vendor API before each run, and
  the tests cancel the orders they no longer need, so repeated runs never sell the product out.
- **Mail.** Without an SMTP server the API writes mails into its log. The reset test reads the link from there
  (`support/mail-log.ts`), so it needs no mailbox. It is skipped when the API log cannot be read.
- Selectors are roles, labels, and visible text (the pages have no `data-testid`), which also checks that the pages
  are usable with a screen reader.
