import type { APIRequestContext } from "@playwright/test";
import { ACCOUNTS, API_URL, PRODUCTS } from "./env";

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  accessToken: string;
  user: ApiUser;
  password: string;
}

export const PASSWORD = "E2e@123456";

const WINDOW_MS = 62_000;
const used = new Map<string, number[]>();

/**
 * The shop limits sign-ups (5 a minute) and sign-ins (10 a minute) per address. The tests stay under the limits by
 * waiting their turn instead of switching them off: call before each request of that kind, through the API or a form.
 */
async function waitForSlot(kind: string, perWindow: number): Promise<void> {
  const times = used.get(kind) ?? [];
  used.set(kind, times);
  for (;;) {
    const now = Date.now();
    while (times.length > 0 && now - times[0] > WINDOW_MS) times.shift();
    if (times.length < perWindow) {
      times.push(now);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, times[0] + WINDOW_MS - now + 50));
  }
}

export const waitForSignUpSlot = (): Promise<void> => waitForSlot("sign-up", 4);
/** Sign-ins through the form, the customer endpoint and the admin endpoint, counted together to stay well under. */
export const waitForSignInSlot = (): Promise<void> => waitForSlot("sign-in", 7);

let counter = 0;

/** An address nobody else has, so each run (and each test) works with its own customer. */
export function uniqueEmail(prefix = "e2e"): string {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.com`;
}

/** The API answers 429 above its per-address limits (sign-up 5 a minute); wait and try again a few times. */
async function post<T>(request: APIRequestContext, path: string, data: unknown, token?: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await request.post(`${API_URL}${path}`, {
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (response.status() === 429) {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    if (!response.ok()) throw new Error(`POST ${path} answered ${response.status()}: ${await response.text()}`);
    return (await response.json()) as T;
  }
  throw new Error(`POST ${path} kept answering 429`);
}

export async function registerViaApi(request: APIRequestContext, email = uniqueEmail()): Promise<Session> {
  await waitForSignUpSlot();
  const phone = `09${String(Date.now()).slice(-8)}`;
  const result = await post<{ accessToken: string; user: ApiUser }>(request, "/auth/register", {
    fullName: "Khách E2E",
    email,
    phone,
    password: PASSWORD,
  });
  return { ...result, password: PASSWORD };
}

export async function loginViaApi(request: APIRequestContext, email: string, password: string): Promise<Session> {
  await waitForSignInSlot();
  const result = await post<{ accessToken: string; user: ApiUser }>(request, "/auth/login", { emailOrPhone: email, password });
  return { ...result, password };
}

const staffSessions = new Map<string, Session>();

/** A seeded vendor owner, signed in once and reused (sign-ins are limited to 10 a minute). */
export async function vendorViaApi(request: APIRequestContext, email: string = ACCOUNTS.vendor.email): Promise<Session> {
  const known = staffSessions.get(email);
  if (known) return known;
  const session = await loginViaApi(request, email, ACCOUNTS.vendor.password);
  staffSessions.set(email, session);
  return session;
}

/** The seeded admin, signed in through the admin endpoint once and reused. */
export async function adminViaApi(request: APIRequestContext): Promise<Session> {
  const known = staffSessions.get(ACCOUNTS.admin.email);
  if (known) return known;
  await waitForSignInSlot();
  const result = await post<{ accessToken: string; user: ApiUser }>(request, "/auth/admin/login", {
    emailOrPhone: ACCOUNTS.admin.email,
    password: ACCOUNTS.admin.password,
  });
  const session = { ...result, password: ACCOUNTS.admin.password };
  staffSessions.set(ACCOUNTS.admin.email, session);
  return session;
}

export const authHeaders = (session: Session) => ({ Authorization: `Bearer ${session.accessToken}` });

/** The offer (a vendor's price and stock for a product) that the shop sells under this search. */
export async function findOfferId(request: APIRequestContext, search: string): Promise<string> {
  const response = await request.get(`${API_URL}/products?q=${encodeURIComponent(search)}`);
  const { items } = (await response.json()) as { items: Array<{ name: string; offerId: string | null }> };
  const found = items.find((item) => item.name.includes(search) && item.offerId);
  if (!found?.offerId) throw new Error(`No offer for "${search}"`);
  return found.offerId;
}

/**
 * Buys one unit of each product, paying cash on delivery, through the API, and returns the order number. For the
 * tests whose subject is something else than the checkout screens (permissions, reviews, the vendor's side).
 */
export async function placeOrderViaApi(request: APIRequestContext, customer: Session, searches: string[]): Promise<string> {
  const headers = authHeaders(customer);
  const offerIds: string[] = [];
  for (const search of searches) {
    const offerId = await findOfferId(request, search);
    const added = await request.post(`${API_URL}/cart/items`, { data: { offerId, quantity: 1 }, headers });
    if (!added.ok()) throw new Error(`Could not add "${search}" to the cart: ${added.status()} ${await added.text()}`);
    offerIds.push(offerId);
  }
  const response = await request.post(`${API_URL}/checkout`, {
    headers: { ...headers, "Idempotency-Key": `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` },
    data: {
      items: offerIds,
      paymentMethod: "COD",
      shipping: {
        recipientName: "Nguyễn Văn E2E",
        recipientPhone: "0912345678",
        province: "Hồ Chí Minh",
        district: "Quận 1",
        streetAddress: "12 Đường Kiểm Thử",
      },
    },
  });
  if (!response.ok()) throw new Error(`Checkout answered ${response.status()}: ${await response.text()}`);
  return ((await response.json()) as { order: { orderNumber: string } }).order.orderNumber;
}

/**
 * Plays the vendor: accepts, prepares, ships and completes every part of an order that belongs to the seeded
 * vendor. A customer can only "buy again" or review once an order is completed, so those tests need this.
 */
export async function completeOrderAsVendor(request: APIRequestContext, customer: Session, orderNumber: string): Promise<void> {
  const vendor = await vendorViaApi(request);
  const order = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: { Authorization: `Bearer ${customer.accessToken}` } });
  const parts = (await order.json()).vendorOrders as Array<{ id: string; vendor: { name: string } }>;
  for (const part of parts.filter((p) => p.vendor.name === PRODUCTS.shrimp.vendor)) {
    for (const status of ["ACCEPTED", "PREPARING", "SHIPPING", "COMPLETED"]) {
      const response = await request.patch(`${API_URL}/vendors/me/orders/${part.id}/status`, {
        data: { status },
        headers: { Authorization: `Bearer ${vendor.accessToken}` },
      });
      if (!response.ok()) throw new Error(`Vendor could not set ${status}: ${response.status()} ${await response.text()}`);
    }
  }
}

/** Cancels an order so its stock goes back on the shelf; the tests call it for the orders they no longer need. */
export async function cancelOrderViaApi(request: APIRequestContext, customer: Session, orderNumber: string): Promise<void> {
  await request.post(`${API_URL}/orders/me/${orderNumber}/cancel`, { headers: { Authorization: `Bearer ${customer.accessToken}` } });
}
