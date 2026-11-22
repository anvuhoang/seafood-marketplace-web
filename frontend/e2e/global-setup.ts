import { request } from "@playwright/test";
import { loginViaApi } from "./support/api";
import { ACCOUNTS, API_URL, PRODUCTS } from "./support/env";

/** The tests keep at least this much of their product in stock. */
const MIN_STOCK = 100;

/**
 * Runs once before the tests. Orders take stock (and the tests buy things), so after enough runs the seed
 * product would be sold out and every purchase would fail for a reason that has nothing to do with the code.
 * The vendor owner tops it up through the shop's own API, the same way a vendor would.
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext();
  try {
    const vendor = await loginViaApi(api, ACCOUNTS.vendor.email, ACCOUNTS.vendor.password);
    const headers = { Authorization: `Bearer ${vendor.accessToken}` };

    const response = await api.get(`${API_URL}/vendors/me/offers?pageSize=50&search=${encodeURIComponent(PRODUCTS.shrimp.search)}`, { headers });
    if (!response.ok()) throw new Error(`Could not list the vendor offers: ${response.status()}`);
    const { items } = (await response.json()) as { items: Array<{ id: string; stock: string; product: { name: string } }> };

    for (const offer of items.filter((item) => item.product.name.includes(PRODUCTS.shrimp.search))) {
      if (Number(offer.stock) >= MIN_STOCK) continue;
      const update = await api.patch(`${API_URL}/vendors/me/offers/${offer.id}`, { data: { stock: MIN_STOCK }, headers });
      if (!update.ok()) throw new Error(`Could not restock ${offer.product.name}: ${update.status()} ${await update.text()}`);
    }
  } finally {
    await api.dispose();
  }
}
