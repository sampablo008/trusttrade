import { expect, test } from "@playwright/test";

test("unauthenticated trade route redirects to login", async ({ page }) => {
  await page.goto("/trade");

  await expect(page).toHaveURL(/\/login\?next=%2Ftrade$/);
  await expect(
    page.getByRole("heading", {
      name: /login shell wired for sprint 0 route guards/i,
    }),
  ).toBeVisible();
});
