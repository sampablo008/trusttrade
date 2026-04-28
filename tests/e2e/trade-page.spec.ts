import { expect, test } from "@playwright/test";

test.describe("Trade page redirect logic", () => {
  test("/trade redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/trade");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/trade/BTC redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/trade/BTC");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Trade page — preview session (admin login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ops.admin@trusttrade.pro");
    await page.getByLabel("Password").fill("previewpass");
    await page.getByRole("button", { name: /open control room/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("/trade redirects to first enabled token symbol", async ({ page }) => {
    await page.goto("/trade");
    await expect(page).toHaveURL(/\/trade\/\w+/);
  });

  test("/trade/BTC renders chart container", async ({ page }) => {
    await page.goto("/trade/BTC");
    await expect(page).toHaveURL(/\/trade\/BTC/);
    await expect(page.locator(".tv-lightweight-charts, canvas").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("/trade/BTC renders order ticket", async ({ page }) => {
    await page.goto("/trade/BTC");
    await expect(
      page.getByRole("button", { name: /long/i }).or(page.getByRole("button", { name: /short/i })),
    ).toBeVisible({ timeout: 10_000 });
  });
});
