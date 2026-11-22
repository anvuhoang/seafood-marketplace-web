import { expect, test } from "@playwright/test";
import { ACCOUNTS, API_URL, PRODUCTS } from "./support/env";
import { authHeaders, cancelOrderViaApi, placeOrderViaApi, registerViaApi, vendorViaApi } from "./support/api";
import { loginViaUi } from "./support/ui";
import { signInAs } from "./support/session";

test.describe("Vendor console", () => {
  test("a vendor signs in on the customer page and lands on the vendor dashboard", async ({ page }) => {
    await loginViaUi(page, ACCOUNTS.vendor.email, ACCOUNTS.vendor.password);
    await expect(page).toHaveURL(/\/vendor\/dashboard/);
    await expect(page.getByRole("heading", { name: "Tổng quan gian hàng" })).toBeVisible();
  });

  test("the vendor sees own products and orders pages", async ({ page, context, request }) => {
    await signInAs(context, await vendorViaApi(request));

    await page.goto("/vendor/products");
    await expect(page).toHaveURL(/\/vendor\/products/);
    await expect(page.getByText(PRODUCTS.shrimp.search).first()).toBeVisible();

    await page.goto("/vendor/orders");
    await expect(page.getByRole("heading", { name: "Quản lý đơn hàng" })).toBeVisible();
  });

  test("a vendor takes an order from pending to delivered, and the customer sees it", async ({ page, context, request }) => {
    const customer = await registerViaApi(request);
    const orderNumber = await placeOrderViaApi(request, customer, [PRODUCTS.shrimp.search]);
    const order = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
    const part = ((await order.json()) as { vendorOrders: Array<{ id: string }> }).vendorOrders[0];

    await signInAs(context, await vendorViaApi(request));
    await page.goto("/vendor/orders");
    await expect(page.locator("a[href^='/vendor/orders/']", { hasText: orderNumber }).first()).toBeVisible();

    await page.goto(`/vendor/orders/${part.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(orderNumber) })).toBeVisible();
    for (const [button, done] of [
      ["Nhận đơn", "Đã nhận đơn."],
      ["Bắt đầu chuẩn bị", "Đơn đang được chuẩn bị."],
      ["Giao cho vận chuyển", "Đã bàn giao đơn cho vận chuyển."],
      ["Đã giao xong", "Đơn đã được giao xong."],
    ] as const) {
      await page.getByRole("button", { name: button }).click();
      await expect(page.getByText(done).first()).toBeVisible();
    }

    const after = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
    expect((await after.json()).status).toBe("COMPLETED");
  });

  test("another vendor opening that order gets a not-found page, with no buttons to act", async ({ page, context, request }) => {
    const customer = await registerViaApi(request);
    const orderNumber = await placeOrderViaApi(request, customer, [PRODUCTS.shrimp.search]);
    try {
      const order = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers: authHeaders(customer) });
      const part = ((await order.json()) as { vendorOrders: Array<{ id: string }> }).vendorOrders[0];

      await signInAs(context, await vendorViaApi(request, ACCOUNTS.otherVendor.email));
      await page.goto(`/vendor/orders/${part.id}`);
      await expect(page.getByText(/không tìm thấy/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Nhận đơn" })).toHaveCount(0);
    } finally {
      await cancelOrderViaApi(request, customer, orderNumber);
    }
  });
});
