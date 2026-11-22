import { expect, test } from "@playwright/test";
import { API_URL } from "./support/env";
import { PASSWORD, registerViaApi } from "./support/api";
import { canReadMailLog, waitForResetLink } from "./support/mail-log";
import { loginViaUi } from "./support/ui";

const NEW_PASSWORD = "NewPass@654321";

test.describe("Forgot password", () => {
  test.skip(!canReadMailLog(), "needs the API log: run the stack with Docker, or set E2E_API_LOG_COMMAND");

  test("a customer gets a link, sets a new password, and the link works only once", async ({ page, request }) => {
    const { user } = await registerViaApi(request);

    await page.goto("/customer/forgot-password");
    await page.getByPlaceholder("ten@example.com").fill(user.email);
    await page.getByRole("button", { name: "Gửi đường dẫn đặt lại" }).click();
    await expect(page.getByRole("status")).toContainText("đã gửi hướng dẫn đặt lại mật khẩu");

    const link = await waitForResetLink(user.email);

    await page.goto(link);
    await page.getByLabel("Mật khẩu mới").fill(NEW_PASSWORD);
    await page.getByLabel("Nhập lại mật khẩu").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await expect(page.getByRole("heading", { name: "Đã đặt lại mật khẩu" })).toBeVisible();

    // The old password no longer works, the new one does.
    const oldLogin = await request.post(`${API_URL}/auth/login`, { data: { emailOrPhone: user.email, password: PASSWORD } });
    expect(oldLogin.status()).toBe(401);
    await loginViaUi(page, user.email, NEW_PASSWORD);
    await expect(page).toHaveURL("/");

    // The same link cannot be used again.
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Đường dẫn không còn hiệu lực" })).toBeVisible();
  });

  test("the answer is the same for an address that has no account", async ({ page }) => {
    await page.goto("/customer/forgot-password");
    await page.getByPlaceholder("ten@example.com").fill("nobody.here@example.com");
    await page.getByRole("button", { name: "Gửi đường dẫn đặt lại" }).click();
    await expect(page.getByRole("status")).toContainText("đã gửi hướng dẫn đặt lại mật khẩu");
  });

  test("a made-up link is shown as no longer valid", async ({ page }) => {
    await page.goto(`/customer/reset-password?token=${"x".repeat(43)}`);
    await expect(page.getByRole("heading", { name: "Đường dẫn không còn hiệu lực" })).toBeVisible();
  });

  test("the form checks the email before sending", async ({ page }) => {
    await page.goto("/customer/forgot-password");
    await page.getByPlaceholder("ten@example.com").fill("not-an-email");
    await page.getByRole("button", { name: "Gửi đường dẫn đặt lại" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "email hợp lệ" })).toBeVisible();
  });
});
