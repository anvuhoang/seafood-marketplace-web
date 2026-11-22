import { expect, test, type APIRequestContext } from "@playwright/test";
import { API_URL } from "./support/env";
import { adminViaApi, authHeaders, registerViaApi, vendorViaApi, type Session } from "./support/api";

type Role = "anonymous" | "customer" | "vendor" | "admin";
type Method = "GET" | "POST" | "PATCH";

/** What each kind of visitor gets from one endpoint. 401 = not signed in, 403 = signed in but not allowed. */
interface Row {
  method: Method;
  path: string;
  anonymous: number;
  customer: number;
  vendor: number;
  admin: number;
}

const NOBODY = "00000000-0000-4000-8000-000000000000";

const row = (method: Method, path: string, anonymous: number, customer: number, vendor: number, admin: number): Row => ({
  method,
  path,
  anonymous,
  customer,
  vendor,
  admin,
});

/**
 * Who may call what. The table is the rule: a route that answers differently from its row fails the test, whether
 * it opened to someone who must not be there or closed to someone who must. A new protected route is added here.
 */
const MATRIX: Row[] = [
  // Open to everyone.
  row("GET", "/products", 200, 200, 200, 200),
  row("GET", "/categories", 200, 200, 200, 200),
  row("GET", "/vendors", 200, 200, 200, 200),
  row("GET", "/regions", 200, 200, 200, 200),
  // Any signed-in account.
  row("GET", "/auth/me", 401, 200, 200, 200),
  row("GET", "/account/profile", 401, 200, 200, 200),
  row("GET", "/account/addresses", 401, 200, 200, 200),
  row("GET", "/account/reviews", 401, 200, 200, 200),
  row("GET", "/cart", 401, 200, 200, 200),
  row("GET", "/orders/me", 401, 200, 200, 200),
  row("GET", "/vendors/followed", 401, 200, 200, 200),
  row("GET", "/vendors/registration/me", 401, 200, 200, 200),
  // Vendors only (an admin is not a vendor).
  row("GET", "/vendors/me/dashboard", 401, 403, 200, 403),
  row("GET", "/vendors/me/store", 401, 403, 200, 403),
  row("GET", "/vendors/me/offers", 401, 403, 200, 403),
  row("GET", "/vendors/me/orders", 401, 403, 200, 403),
  row("GET", "/vendors/me/stats", 401, 403, 200, 403),
  row("GET", "/vendors/me/smart-import/status", 401, 403, 200, 403),
  row("PATCH", `/vendors/me/offers/${NOBODY}`, 401, 403, 404, 403),
  row("PATCH", `/vendors/me/orders/${NOBODY}/status`, 401, 403, 404, 403),
  // Admins only.
  row("GET", "/admin/stats/overview", 401, 403, 403, 200),
  row("GET", "/admin/users", 401, 403, 403, 200),
  row("GET", "/admin/vendors", 401, 403, 403, 200),
  row("GET", "/admin/categories", 401, 403, 403, 200),
  row("POST", `/admin/vendors/${NOBODY}/approve`, 401, 403, 403, 404),
  row("POST", `/admin/vendors/${NOBODY}/suspend`, 401, 403, 403, 400),
];

const sessions = new Map<Role, Session | null>();

async function sessionFor(request: APIRequestContext, role: Role): Promise<Session | null> {
  if (role === "anonymous") return null;
  const known = sessions.get(role);
  if (known) return known;
  const session =
    role === "customer" ? await registerViaApi(request) : role === "vendor" ? await vendorViaApi(request) : await adminViaApi(request);
  sessions.set(role, session);
  return session;
}

test.describe("Permission matrix (API)", () => {
  for (const { method, path, ...expected } of MATRIX) {
    test(`${method} ${path.replace(NOBODY, ":id")}`, async ({ request }) => {
      const answers: Record<string, number> = {};
      for (const role of ["anonymous", "customer", "vendor", "admin"] as const) {
        const session = await sessionFor(request, role);
        const response = await request.fetch(`${API_URL}${path}`, {
          method,
          headers: session ? authHeaders(session) : undefined,
          data: method === "GET" ? undefined : path.endsWith("/status") ? { status: "ACCEPTED" } : {},
        });
        answers[role] = response.status();
      }
      expect(answers).toEqual(expected);
    });
  }

  test("a token that is made up, or signed with another key, is refused", async ({ request }) => {
    const garbage = await request.get(`${API_URL}/auth/me`, { headers: { Authorization: "Bearer not.a.token" } });
    expect(garbage.status()).toBe(401);
    // A real-looking JWT with an unknown signature.
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDAiLCJlbWFpbCI6ImFAYi5jIiwicm9sZSI6IkFETUlOIn0." +
      "c2lnbmF0dXJlLXRoYXQtaXMtbm90LXZhbGlk";
    const response = await request.get(`${API_URL}/admin/stats/overview`, { headers: { Authorization: `Bearer ${forged}` } });
    expect(response.status()).toBe(401);
  });

  test("a customer cannot make themselves an admin or a vendor by editing their profile", async ({ request }) => {
    const customer = await sessionFor(request, "customer");
    if (!customer) throw new Error("no customer");
    await request.patch(`${API_URL}/account/profile`, { headers: authHeaders(customer), data: { role: "ADMIN", status: "ACTIVE" } });
    const me = await request.get(`${API_URL}/auth/me`, { headers: authHeaders(customer) });
    expect((await me.json()).role).toBe("CUSTOMER");

    const vendorArea = await request.get(`${API_URL}/vendors/me/dashboard`, { headers: authHeaders(customer) });
    expect(vendorArea.status()).toBe(403);
  });
});
