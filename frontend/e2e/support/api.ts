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

let counter = 0;

/** The shop allows 5 sign-ups a minute per address. The tests stay under that by waiting their turn. */
const SIGN_UPS_PER_WINDOW = 4;
const WINDOW_MS = 62_000;
const signUps: number[] = [];

/** Call before each sign-up (through the API or the form): waits until another one is allowed. */
export async function waitForSignUpSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (signUps.length > 0 && now - signUps[0] > WINDOW_MS) signUps.shift();
    if (signUps.length < SIGN_UPS_PER_WINDOW) {
      signUps.push(now);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, signUps[0] + WINDOW_MS - now + 50));
  }
}

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
  const result = await post<{ accessToken: string; user: ApiUser }>(request, "/auth/login", { emailOrPhone: email, password });
  return { ...result, password };
}

let vendorSession: Session | null = null;

/** The seeded vendor owner, signed in once and reused (sign-ins are limited to 10 a minute). */
export async function vendorViaApi(request: APIRequestContext): Promise<Session> {
  vendorSession ??= await loginViaApi(request, ACCOUNTS.vendor.email, ACCOUNTS.vendor.password);
  return vendorSession;
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
