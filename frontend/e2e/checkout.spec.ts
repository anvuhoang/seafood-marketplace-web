import { expect, test } from "@playwright/test";
import { API_URL, PRODUCTS } from "./support/env";
import { cancelOrderViaApi, registerViaApi } from "./support/api";
import { addToCartBySearch, loginViaUi, placeCodOrder } from "./support/ui";
import { signInAs } from "./support/session";

test.describe("Cart", () => {
  test("a guest cart is kept when they sign in", async ({ page, request }) => {
    const { user, password } = await registerViaApi(request);

    await addToCartBySearch(page, PRODUCTS.shrimp.search);
    await loginViaUi(page, user.email, password);
    await expect(page).toHaveURL("/");

    await page.goto("/customer/cart");
    await expect(page.getByRole("heading", { name: "Giỏ hàng của bạn" })).toBeVisible();
    await expect(page.getByText(PRODUCTS.shrimp.search).first()).toBeVisible();
  });

  test("an empty cart offers to keep shopping and has no checkout button", async ({ page, context, request }) => {
    await signInAs(context, await registerViaApi(request));
    await page.goto("/customer/cart");
    await expect(page.getByRole("link", { name: /Xem thêm hải sản|Tiếp tục mua|Mua sắm/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Tiến hành đặt hàng/ })).toHaveCount(0);
  });
});

test.describe("Checkout", () => {
  test("the form asks for the missing shipping details", async ({ page, context, request }) => {
    await signInAs(context, await registerViaApi(request));
    await addToCartBySearch(page, PRODUCTS.shrimp.search);
    await page.goto("/customer/cart");
    await page.getByRole("link", { name: /Tiến hành đặt hàng/ }).click();
    await page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
    await expect(page).toHaveURL(/\/customer\/checkout\?/);
    await expect(page.getByText(/vui lòng|bắt buộc|chưa/i).first()).toBeVisible();
  });

  test("products from two vendors become one order with two parts, paid on delivery", async ({ page, context, request }) => {
    const session = await registerViaApi(request);
    await signInAs(context, session);

    await addToCartBySearch(page, PRODUCTS.shrimp.search);
    await addToCartBySearch(page, PRODUCTS.crab.search);
    const orderNumber = await placeCodOrder(page);

    await expect(page.getByText(orderNumber).first()).toBeVisible();

    // The API agrees: one order, one part for each vendor.
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    const response = await request.get(`${API_URL}/orders/me/${orderNumber}`, { headers });
    expect(response.ok()).toBeTruthy();
    const order = await response.json();
    expect(order.status).toBe("PENDING");
    expect(order.payment.method).toBe("COD");
    expect(order.vendorOrders).toHaveLength(2);
    expect(order.vendorOrders.map((part: { vendor: { name: string } }) => part.vendor.name).sort()).toEqual(
      [PRODUCTS.crab.vendor, PRODUCTS.shrimp.vendor].sort(),
    );

    // The order is in the history and the cart is empty afterwards.
    await page.goto("/customer/orders");
    await expect(page.locator(`a[href='/customer/orders/${orderNumber}']`).first()).toBeVisible();
    const cart = await request.get(`${API_URL}/cart`, { headers });
    expect((await cart.json()).items ?? []).toHaveLength(0);

    await cancelOrderViaApi(request, session, orderNumber); // puts the stock back
  });
});
