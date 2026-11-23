import { request, type APIRequestContext } from "@playwright/test";
import { adminViaApi, authHeaders, loginViaApi } from "./support/api";
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

    await waitForSearchIndex(api);
  } finally {
    await api.dispose();
  }
}

/**
 * The product search runs in Elasticsearch once its index is built, which the API does a while after it starts (and again
 * after the changes above). Until then the shop searches in memory, without forgiving typos, so a test that expects the
 * typo to be forgiven would fail only because it ran too early. Wait until the shop really forgives a typo (the status
 * alone said "ok" while CI still answered from memory); with no Elasticsearch there is nothing to wait for.
 */
async function waitForSearchIndex(api: APIRequestContext): Promise<void> {
  const admin = await adminViaApi(api);
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const response = await api.get(`${API_URL}/admin/search/status`, { headers: authHeaders(admin) });
    if (response.ok()) {
      const status = (await response.json()) as { enabled: boolean; state: string; documents: number };
      if (!status.enabled) return;
      // A built index is not yet proof that it answers: ask a question only Elasticsearch can answer (a typo).
      if (status.state === "ok" && status.documents > 0 && (await forgivesTypos(api))) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  console.warn("The search index was not ready after 150 s: the tests that need Elasticsearch may fail.");
}

/** True when searching "tom sus" (a slip) still finds the shrimp: only the Elasticsearch search does that. */
async function forgivesTypos(api: APIRequestContext): Promise<boolean> {
  const response = await api.get(`${API_URL}/products?q=${encodeURIComponent("tom sus")}&limit=5`);
  if (!response.ok()) return false;
  const { items } = (await response.json()) as { items: Array<{ name: string }> };
  return items.some((item) => item.name.includes("Tôm Sú"));
}
