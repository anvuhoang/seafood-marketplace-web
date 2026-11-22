import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { PRODUCTS } from "./support/env";
import { cancelOrderViaApi, completeOrderAsVendor, registerViaApi, type Session } from "./support/api";
import { addToCartBySearch, placeCodOrder } from "./support/ui";
import { signInAs } from "./support/session";

/** A new customer who has one cash-on-delivery order. */
async function customerWithOrder(
  page: Page,
  context: BrowserContext,
  request: APIRequestContext,
): Promise<{ orderNumber: string; session: Session }> {
  const session = await registerViaApi(request);
  await signInAs(context, session);
  await addToCartBySearch(page, PRODUCTS.shrimp.search);
  return { orderNumber: await placeCodOrder(page), session };
}

test.describe("Orders", () => {
  test("a new order is pending and appears in the history", async ({ page, context, request }) => {
    const { orderNumber, session } = await customerWithOrder(page, context, request);

    await page.goto("/customer/orders");
    await expect(page.getByRole("heading", { name: "Đơn hàng của tôi" })).toBeVisible();
    await page.locator(`a[href='/customer/orders/${orderNumber}']`).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chờ xác nhận");
    await expect(page.getByText(PRODUCTS.shrimp.vendor).first()).toBeVisible();

    await cancelOrderViaApi(request, session, orderNumber); // puts the stock back
  });

  test("a pending order can be cancelled", async ({ page, context, request }) => {
    const { orderNumber } = await customerWithOrder(page, context, request);

    await page.goto(`/customer/orders/${orderNumber}`);
    await page.getByRole("button", { name: "Yêu cầu hủy đơn hàng này" }).click();
    // The shop asks to confirm first.
    await page.getByRole("dialog").getByRole("button", { name: "Hủy đơn", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Đã hủy");
    await expect(page.getByRole("button", { name: "Yêu cầu hủy đơn hàng này" })).toHaveCount(0);
  });

  test("buying again from a completed order puts the products back in the cart", async ({ page, context, request }) => {
    const { orderNumber, session } = await customerWithOrder(page, context, request);
    await completeOrderAsVendor(request, session, orderNumber);

    // "Buy again" is offered on the history card of a completed order.
    await page.goto("/customer/orders");
    await page.getByRole("button", { name: "Mua lại đơn này" }).first().click();
    await page.goto("/customer/cart");
    await expect(page.getByText(PRODUCTS.shrimp.search).first()).toBeVisible();
  });
});
