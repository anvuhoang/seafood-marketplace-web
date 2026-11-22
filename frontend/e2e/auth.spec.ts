import { expect, test } from "@playwright/test";
import { ACCOUNTS } from "./support/env";
import { PASSWORD, registerViaApi, uniqueEmail, waitForSignUpSlot } from "./support/api";
import { loginViaUi, registerViaForm } from "./support/ui";

test.describe("Sign-in", () => {
  test("a customer signs in with the right password and lands on the home page", async ({ page }) => {
    await loginViaUi(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: new RegExp(ACCOUNTS.customer.name) })).toBeVisible();
  });

  test("a wrong password shows a message and does not sign in", async ({ page }) => {
    await loginViaUi(page, ACCOUNTS.customer.email, "Wrong@123456");
    await expect(page.getByText("không chính xác")).toBeVisible();
    await expect(page).toHaveURL(/\/customer\/login/);
  });

  test("the form checks the fields before asking the server", async ({ page }) => {
    await page.goto("/customer/login");
    await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
    await expect(page.getByText("Vui lòng nhập số điện thoại hoặc email.")).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    await loginViaUi(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: new RegExp(ACCOUNTS.customer.name) }).click();
    await page.getByRole("button", { name: "Đăng xuất" }).click();

    await page.goto("/customer/orders");
    await expect(page).toHaveURL(/\/customer\/login\?redirect=/);
  });

  test("an admin account is told to use the admin site", async ({ page }) => {
    await loginViaUi(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await expect(page.getByText("không đăng nhập tại đây")).toBeVisible();
  });
});

test.describe("Protected pages", () => {
  test("a signed-out visitor is sent to sign in and back to the page afterwards", async ({ page }) => {
    await page.goto("/customer/orders");
    await expect(page).toHaveURL(/\/customer\/login\?redirect=%2Fcustomer%2Forders/);
    await expect(page.getByText("Vui lòng đăng nhập để tiếp tục")).toBeVisible();

    await page.getByPlaceholder("Nhập số điện thoại hoặc email của bạn").fill(ACCOUNTS.customer.email);
    await page.getByPlaceholder("Nhập mật khẩu").fill(ACCOUNTS.customer.password);
    await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
    await expect(page).toHaveURL("/customer/orders");
    await expect(page.getByRole("heading", { name: "Đơn hàng của tôi" })).toBeVisible();
  });
});

test.describe("Registration", () => {
  test("a new customer registers and is signed in", async ({ page }) => {
    await waitForSignUpSlot();
    await registerViaForm(page, {
      fullName: "Khách Đăng Ký",
      email: uniqueEmail("register"),
      phone: `09${String(Date.now()).slice(-8)}`,
      password: PASSWORD,
    });

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /Khách Đăng Ký/ })).toBeVisible();
  });

  test("an email that already has an account is refused", async ({ page, request }) => {
    const existing = await registerViaApi(request);
    await waitForSignUpSlot();
    await registerViaForm(page, {
      fullName: "Khách Trùng",
      email: existing.user.email,
      phone: `09${String(Date.now() + 1).slice(-8)}`,
      password: PASSWORD,
    });

    await expect(page.getByText(/đã được (sử dụng|đăng ký)|đã tồn tại|đã có tài khoản/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/customer\/register/);
  });

  test("the register page offers no fake Google button", async ({ page }) => {
    // Google's own button appears only when the server has a client ID; there is never a button that signs up a demo account.
    await page.goto("/customer/register");
    await expect(page.getByRole("button", { name: "Tiếp tục với Google" })).toHaveCount(0);
  });
});
