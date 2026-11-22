import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They drive a real browser against a running shop, by default the Docker stack:
 *   docker compose up -d   (then)   npm run e2e
 * Point them at another address with E2E_BASE_URL. They use the seeded demo accounts (see e2e/support/env.ts).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8088";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The shop limits sign-ins and orders per IP address (10 a minute), so the tests run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    // A failing test leaves what is needed to see why.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
