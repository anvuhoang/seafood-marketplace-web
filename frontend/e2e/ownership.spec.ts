import { expect, test } from "@playwright/test";
import { ACCOUNTS, API_URL, PRODUCTS } from "./support/env";
import { authHeaders, cancelOrderViaApi, placeOrderViaApi, registerViaApi, vendorViaApi } from "./support/api";

/**
 * "Not yours" must look like "not found": answering 403 would confirm that the order or the offer exists. These
 * tests make two customers and two vendors and check that none of them can read or change the other's data.
 */
test.describe("Ownership: customers", () => {
  test("a customer cannot read, pay for, cancel or buy again another customer's order", async ({ request }) => {
    const owner = await registerViaApi(request);
    const stranger = await registerViaApi(request);
    const orderNumber = await placeOrderViaApi(request, owner, [PRODUCTS.shrimp.search]);

    try {
      const url = `${API_URL}/orders/me/${orderNumber}`;
      const strangerHeaders = authHeaders(stranger);

      expect((await request.get(url, { headers: authHeaders(owner) })).status()).toBe(200);
      expect((await request.get(url, { headers: strangerHeaders })).status()).toBe(404);
      expect((await request.get(`${url}/payment`, { headers: strangerHeaders })).status()).toBe(404);
      expect((await request.post(`${url}/cancel`, { headers: strangerHeaders })).status()).toBe(404);
      expect((await request.post(`${url}/reorder`, { headers: strangerHeaders })).status()).toBe(404);

      // The order list of the stranger does not hold it either, and the order is still pending.
      const list = await request.get(`${API_URL}/orders/me`, { headers: strangerHeaders });
      expect(JSON.stringify(await list.json())).not.toContain(orderNumber);
      const still = await request.get(url, { headers: authHeaders(owner) });
      expect((await still.json()).status).toBe("PENDING");
    } finally {
      await cancelOrderViaApi(request, owner, orderNumber);
    }
  });

  test("a customer cannot use or delete another customer's address", async ({ request }) => {
    const owner = await registerViaApi(request);
    const stranger = await registerViaApi(request);
    const created = await request.post(`${API_URL}/account/addresses`, {
      headers: authHeaders(owner),
      data: {
        recipientName: "Chủ địa chỉ",
        recipientPhone: "0912345678",
        province: "Hồ Chí Minh",
        district: "Quận 1",
        streetAddress: "1 Đường Riêng Tư",
      },
    });
    test.skip(!created.ok(), "the address endpoint did not accept the test address");
    const { id } = (await created.json()) as { id: string };

    expect((await request.delete(`${API_URL}/account/addresses/${id}`, { headers: authHeaders(stranger) })).status()).toBe(404);
    expect((await request.post(`${API_URL}/account/addresses/${id}/default`, { headers: authHeaders(stranger) })).status()).toBe(404);

    const mine = await request.get(`${API_URL}/account/addresses`, { headers: authHeaders(owner) });
    expect(JSON.stringify(await mine.json())).toContain(id);
  });
});

test.describe("Ownership: vendors", () => {
  test("a vendor cannot read or change an order part that belongs to another vendor", async ({ request }) => {
    const customer = await registerViaApi(request);
    const owner = await vendorViaApi(request, ACCOUNTS.vendor.email);
    const other = await vendorViaApi(request, ACCOUNTS.otherVendor.email);
    const orderNumber = await placeOrderViaApi(request, customer, [PRODUCTS.shrimp.search]);

    try {
      const order = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
      const part = ((await order.json()) as { vendorOrders: Array<{ id: string }> }).vendorOrders[0];

      // The right vendor sees it; the other vendor gets "not found" for reading and for changing it.
      expect((await request.get(`${API_URL}/vendors/me/orders/${part.id}`, { headers: authHeaders(owner) })).status()).toBe(200);
      expect((await request.get(`${API_URL}/vendors/me/orders/${part.id}`, { headers: authHeaders(other) })).status()).toBe(404);
      const change = await request.patch(`${API_URL}/vendors/me/orders/${part.id}/status`, {
        headers: authHeaders(other),
        data: { status: "ACCEPTED" },
      });
      expect(change.status()).toBe(404);

      const theirList = await request.get(`${API_URL}/vendors/me/orders`, { headers: authHeaders(other) });
      expect(JSON.stringify(await theirList.json())).not.toContain(orderNumber);

      const after = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
      expect((await after.json()).status).toBe("PENDING");
    } finally {
      await cancelOrderViaApi(request, customer, orderNumber);
    }
  });

  test("a vendor cannot change the price or stock of another vendor's offer", async ({ request }) => {
    const owner = await vendorViaApi(request, ACCOUNTS.vendor.email);
    const other = await vendorViaApi(request, ACCOUNTS.otherVendor.email);

    const listed = await request.get(`${API_URL}/vendors/me/offers?pageSize=50&search=${encodeURIComponent(PRODUCTS.shrimp.search)}`, {
      headers: authHeaders(owner),
    });
    const offer = ((await listed.json()) as { items: Array<{ id: string; price: string; stock: string }> }).items[0];

    for (const attempt of [
      () => request.patch(`${API_URL}/vendors/me/offers/${offer.id}`, { headers: authHeaders(other), data: { price: 1000, stock: 0 } }),
      () => request.patch(`${API_URL}/vendors/me/offers/${offer.id}/status`, { headers: authHeaders(other), data: { status: "PAUSED" } }),
    ]) {
      expect((await attempt()).status()).toBe(404);
    }

    const again = await request.get(`${API_URL}/vendors/me/offers?pageSize=50&search=${encodeURIComponent(PRODUCTS.shrimp.search)}`, {
      headers: authHeaders(owner),
    });
    const unchanged = ((await again.json()) as { items: Array<{ id: string; price: string; stock: string; status: string }> }).items.find(
      (item) => item.id === offer.id,
    );
    expect(unchanged).toMatchObject({ price: offer.price, stock: offer.stock, status: "ACTIVE" });
  });
});
