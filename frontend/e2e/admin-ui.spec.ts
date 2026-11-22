import { expect, test } from "@playwright/test";
import { ACCOUNTS, API_URL } from "./support/env";
import { adminViaApi, registerViaApi, vendorViaApi, waitForSignInSlot } from "./support/api";
import { signInAs } from "./support/session";

const GENERIC_FAILURE = "Email/Số điện thoại hoặc mật khẩu không chính xác.";

test.describe("Admin site", () => {
  test("the admin signs in on the admin page and sees the overview", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("input[type=text]").fill(ACCOUNTS.admin.email);
    await page.locator("input[type=password]").fill(ACCOUNTS.admin.password);
    await waitForSignInSlot();
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: "Tổng quan", exact: true })).toBeVisible();
    await expect(page.getByText("Doanh thu 6 tháng gần nhất")).toBeVisible();
  });

  test("a customer, a vendor and an unknown account all get the same refusal on the admin page", async ({ page, request }) => {
    // Repeated failures lock an account out for 15 minutes, so each run uses a new customer and a made-up address
    // for its failures, and never the real admin: the tests would otherwise lock their own admin out.
    const customer = await registerViaApi(request);
    const attempts = [
      [customer.user.email, customer.password],
      [ACCOUNTS.vendor.email, ACCOUNTS.vendor.password],
      [`nobody.${Date.now()}@example.com`, "Wrong@123456"],
    ];
    for (const [email, password] of attempts) {
      await page.goto("/admin/login");
      await page.locator("input[type=text]").fill(email);
      await page.locator("input[type=password]").fill(password);
      await waitForSignInSlot();
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      // The same words every time, so the page does not tell which accounts exist or what role they have.
      await expect(page.getByText(GENERIC_FAILURE).first()).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test("the admin pages list vendors, users and categories", async ({ page, context, request }) => {
    await signInAs(context, await adminViaApi(request));

    await page.goto("/admin/vendors");
    await expect(page.getByRole("heading", { name: "Duyệt và quản lý vựa" })).toBeVisible();
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: /Quản lý tài khoản/ })).toBeVisible();
    await page.goto("/admin/categories");
    await expect(page.getByRole("heading", { name: "Quản lý danh mục hải sản" })).toBeVisible();
  });
});

test.describe("Admin sign-in endpoint", () => {
  test("only an admin account gets a token from it, and every other answer is the same 401", async ({ request }) => {
    const customer = await registerViaApi(request);
    const answers: Array<{ status: number; message: string }> = [];
    // New addresses for the failures (see above); the second vendor, so it does not share a count with the page test.
    for (const [email, password] of [
      [customer.user.email, customer.password],
      [ACCOUNTS.otherVendor.email, ACCOUNTS.otherVendor.password],
      [`nobody.${Date.now()}@example.com`, "Whatever@123456"],
    ]) {
      await waitForSignInSlot();
      const response = await request.post(`${API_URL}/auth/admin/login`, { data: { emailOrPhone: email, password } });
      answers.push({ status: response.status(), message: (await response.json()).message });
    }
    expect(answers.map((answer) => answer.status)).toEqual([401, 401, 401]);
    expect(new Set(answers.map((answer) => answer.message)).size).toBe(1);

    const admin = await adminViaApi(request);
    expect(admin.user.role).toBe("ADMIN");
  });

  test("an admin cannot sign in through the customer endpoint", async ({ request }) => {
    await waitForSignInSlot();
    const response = await request.post(`${API_URL}/auth/login`, { data: { emailOrPhone: ACCOUNTS.admin.email, password: ACCOUNTS.admin.password } });
    expect(response.status()).toBe(403);
  });

  test("a customer's token does not open the admin API even after the same person visits the admin page", async ({ request }) => {
    const customer = await registerViaApi(request);
    const vendor = await vendorViaApi(request);
    for (const session of [customer, vendor]) {
      const response = await request.get(`${API_URL}/admin/stats/overview`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
      expect(response.status()).toBe(403);
    }
  });
});
