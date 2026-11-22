import { expect, test } from "@playwright/test";
import { PRODUCTS } from "./support/env";

test.describe("Browse and search", () => {
  test("the home page shows products and the categories", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[href^='/products/']").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tôm sống" }).first()).toBeVisible();
  });

  test("search finds a product when the accents are left out", async ({ page }) => {
    await page.goto("/products?q=tom+su");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("tom su");
    await expect(page.locator("a[href^='/products/']", { hasText: "Tôm Sú" }).first()).toBeVisible();
  });

  test("search finds a product despite a typo", async ({ page }) => {
    await page.goto("/products?q=tom+sus");
    await expect(page.locator("a[href^='/products/']", { hasText: "Tôm Sú" }).first()).toBeVisible();
  });

  test("a search with no match says so instead of showing a blank page", async ({ page }) => {
    await page.goto("/products?q=zzzzqqqq");
    await expect(page.getByText("Không tìm thấy hải sản phù hợp").first()).toBeVisible();
    await expect(page.getByText("Xem tất cả hải sản").first()).toBeVisible();
  });

  test("a product page shows the name, the price and the buy buttons", async ({ page }) => {
    await page.goto(`/products?q=${encodeURIComponent(PRODUCTS.shrimp.search)}`);
    await page.locator("a[href^='/products/']", { hasText: PRODUCTS.shrimp.search }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(PRODUCTS.shrimp.search);
    await expect(page.getByText(/\d[\d.]*\s?đ/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mua ngay" })).toBeVisible();
  });

  test("an unknown product address shows a not-found message", async ({ page }) => {
    await page.goto("/products/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText(/không tìm thấy|không tồn tại/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng" })).toHaveCount(0);
  });
});
