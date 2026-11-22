import { expect, type Page } from "@playwright/test";

/** The sign-in form, as a visitor fills it. */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/customer/login");
  await page.getByPlaceholder("Nhập số điện thoại hoặc email của bạn").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(password);
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
}

/** Finds a product by searching for it, opens it and puts one unit in the cart. */
export async function addToCartBySearch(page: Page, search: string): Promise<void> {
  await page.goto(`/products?q=${encodeURIComponent(search)}`);
  await page.locator("a[href^='/products/']", { hasText: search }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(search);
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).click();
  await expect(page.getByRole("status").filter({ hasText: "vào giỏ hàng" })).toBeVisible();
}

/** The shipping part of the checkout form. */
export async function fillShipping(page: Page): Promise<void> {
  await page.getByPlaceholder("Nguyễn Văn An").fill("Nguyễn Văn E2E");
  await page.getByPlaceholder("0912345678").fill("0912345678");
  const selects = page.locator("main select");
  await selects.nth(0).selectOption({ label: "Hồ Chí Minh" });
  await expect(selects.nth(1)).toBeEnabled();
  await selects.nth(1).selectOption({ index: 1 });
  await page.getByPlaceholder("Số 12, Đường Nguyễn Hữu Thọ").fill("12 Đường Kiểm Thử");
}

/** From the cart to the order success page, paying cash on delivery. Returns the order number. */
export async function placeCodOrder(page: Page): Promise<string> {
  await page.goto("/customer/cart");
  await page.getByRole("link", { name: /Tiến hành đặt hàng/ }).click();
  await expect(page.getByRole("heading", { name: "Đặt hàng & Thanh toán" })).toBeVisible();
  await fillShipping(page);
  await page.locator("input[name=payment]").first().check();
  await page.getByRole("button", { name: "Xác nhận đặt hàng" }).click();
  await page.waitForURL(/\/customer\/checkout\/success\?order=/);
  const orderNumber = new URL(page.url()).searchParams.get("order");
  if (!orderNumber) throw new Error("The success page has no order number");
  return orderNumber;
}

/**
 * Fills the registration form and sends it. The shop allows 5 sign-ups a minute per address and says so on the
 * page; when that happens the test waits as the page asks and sends the form again.
 */
export async function registerViaForm(
  page: Page,
  details: { fullName: string; email: string; phone: string; password: string },
): Promise<void> {
  await page.goto("/customer/register");
  await page.getByPlaceholder("Nhập họ và tên của bạn").fill(details.fullName);
  await page.getByPlaceholder("vidu@gmail.com").fill(details.email);
  await page.getByPlaceholder("0912 345 678").fill(details.phone);
  await page.getByPlaceholder("Tạo mật khẩu an toàn").fill(details.password);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(details.password);
  await page.getByRole("checkbox").check();

  const tooFast = page.getByText("thao tác quá nhanh");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.getByRole("button", { name: /Đăng ký/ }).last().click();
    const refused = await tooFast.waitFor({ state: "visible", timeout: 3_000 }).then(() => true, () => false);
    if (!refused) return;
    await page.waitForTimeout(20_000);
  }
}
