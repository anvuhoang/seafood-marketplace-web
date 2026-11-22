import { expect, test } from "@playwright/test";
import { API_URL, PRODUCTS } from "./support/env";
import { authHeaders, completeOrderAsVendor, placeOrderViaApi, registerViaApi } from "./support/api";

const REVIEW = { rating: 5, content: "Tôm tươi, giao nhanh, đóng gói cẩn thận. Sẽ mua lại." };

/** Only someone who received the product may review it, and only once. */
test.describe("Reviews", () => {
  test("a review needs a completed order, and each item is reviewed once", async ({ request }) => {
    const customer = await registerViaApi(request);
    const stranger = await registerViaApi(request);
    const orderNumber = await placeOrderViaApi(request, customer, [PRODUCTS.shrimp.search]);

    const order = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
    const item = ((await order.json()) as { vendorOrders: Array<{ items: Array<{ id: string }> }> }).vendorOrders[0].items[0];
    const review = (who: typeof customer, data: object = REVIEW) =>
      request.post(`${API_URL}/account/reviews`, { headers: authHeaders(who), data: { orderItemId: item.id, ...data } });
    /** The answer's status, with its body as the failure message so a mismatch says why. */
    const expectStatus = async (response: Awaited<ReturnType<typeof review>>, status: number) =>
      expect(response.status(), await response.text()).toBe(status);

    // Signed out.
    const anonymous = await request.post(`${API_URL}/account/reviews`, { data: { orderItemId: item.id, ...REVIEW } });
    expect(anonymous.status()).toBe(401);

    // Bought but not delivered yet.
    await expectStatus(await review(customer), 400);

    // Delivered. A stranger still cannot review someone else's purchase (and gets "not found").
    await completeOrderAsVendor(request, customer, orderNumber);
    await expectStatus(await review(stranger), 404);

    // The buyer's review is checked for its fields, then accepted once.
    await expectStatus(await review(customer, { rating: 6 }), 400);
    await expectStatus(await review(customer, { content: "ngắn" }), 400);
    await expectStatus(await review(customer), 201);
    await expectStatus(await review(customer), 409);
  });
});
