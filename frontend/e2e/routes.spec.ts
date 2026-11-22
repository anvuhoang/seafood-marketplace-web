import { expect, test } from "@playwright/test";
import { adminViaApi, registerViaApi, vendorViaApi, type Session } from "./support/api";
import { signInAs } from "./support/session";

type Role = "anonymous" | "customer" | "vendor" | "admin";

/** `stay` = the page opens; otherwise the path the visitor is sent to. */
type Outcome = "stay" | string;

interface Row {
  path: string;
  anonymous: Outcome;
  customer: Outcome;
  vendor: Outcome;
  admin: Outcome;
}

/**
 * Which page opens for whom, and where everyone else is sent. The Next.js proxy decides this from the session
 * cookies, so these are checks of the signed-in experience; the API has its own matrix (permissions.spec.ts)
 * because a cookie proves nothing to the server.
 */
const ROUTES: Row[] = [
  { path: "/customer/orders", anonymous: "/customer/login", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/customer/profile", anonymous: "/customer/login", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/customer/addresses", anonymous: "/customer/login", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/customer/checkout", anonymous: "/customer/login", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/vendor/register", anonymous: "/customer/login", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/vendor/dashboard", anonymous: "/customer/login", customer: "/unauthorized", vendor: "stay", admin: "stay" },
  { path: "/vendor/orders", anonymous: "/customer/login", customer: "/unauthorized", vendor: "stay", admin: "stay" },
  { path: "/vendor/products", anonymous: "/customer/login", customer: "/unauthorized", vendor: "stay", admin: "stay" },
  { path: "/admin/dashboard", anonymous: "/admin/login", customer: "/unauthorized", vendor: "/unauthorized", admin: "stay" },
  { path: "/admin/vendors", anonymous: "/admin/login", customer: "/unauthorized", vendor: "/unauthorized", admin: "stay" },
  { path: "/admin/users", anonymous: "/admin/login", customer: "/unauthorized", vendor: "/unauthorized", admin: "stay" },
  // The sign-in pages send someone who is already signed in to their own home.
  { path: "/customer/login", anonymous: "stay", customer: "/", vendor: "/vendor/dashboard", admin: "/admin/dashboard" },
  { path: "/customer/register", anonymous: "stay", customer: "/", vendor: "/vendor/dashboard", admin: "/admin/dashboard" },
  { path: "/admin/login", anonymous: "stay", customer: "stay", vendor: "stay", admin: "/admin/dashboard" },
  // Open to everyone.
  { path: "/", anonymous: "stay", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/products", anonymous: "stay", customer: "stay", vendor: "stay", admin: "stay" },
  { path: "/customer/cart", anonymous: "stay", customer: "stay", vendor: "stay", admin: "stay" },
];

const sessions = new Map<Role, Session>();

async function sessionFor(role: Exclude<Role, "anonymous">, request: Parameters<typeof registerViaApi>[0]): Promise<Session> {
  const known = sessions.get(role);
  if (known) return known;
  const session = role === "customer" ? await registerViaApi(request) : role === "vendor" ? await vendorViaApi(request) : await adminViaApi(request);
  sessions.set(role, session);
  return session;
}

test.describe("Route matrix (browser)", () => {
  for (const { path, ...outcomes } of ROUTES) {
    for (const role of ["anonymous", "customer", "vendor", "admin"] as const) {
      const expected = outcomes[role];
      test(`${path} as ${role}: ${expected === "stay" ? "opens" : `goes to ${expected}`}`, async ({ page, context, request }) => {
        if (role !== "anonymous") await signInAs(context, await sessionFor(role, request));

        await page.goto(path);
        if (expected === "stay") {
          await expect(page).toHaveURL(new RegExp(`^[^?#]*${path === "/" ? "/$" : path.replace(/[/]/g, "\\/")}(\\?.*)?$`));
        } else {
          await expect(page).toHaveURL(new RegExp(`^[^?#]*${expected === "/" ? "/$" : expected.replace(/[/]/g, "\\/")}(\\?.*)?$`));
        }
      });
    }
  }

  test("after being sent to sign in, a page remembers where to go back to", async ({ page }) => {
    await page.goto("/vendor/orders");
    await expect(page).toHaveURL(/\/customer\/login\?redirect=%2Fvendor%2Forders/);
    await page.goto("/admin/vendors");
    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Fvendors/);
  });

  test("a made-up session cookie opens no page that the server would refuse", async ({ page, context }) => {
    // The cookies are only a hint for navigation. With a role cookie that lies, the page may open, but it can load
    // nothing: the API refuses the token, and the app signs the visitor out.
    await context.addCookies([
      { name: "haisan_token", value: "forged", domain: "localhost", path: "/" },
      { name: "haisan_role", value: "ADMIN", domain: "localhost", path: "/" },
    ]);
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/Doanh thu 6 tháng gần nhất/)).toHaveCount(0);
  });
});
