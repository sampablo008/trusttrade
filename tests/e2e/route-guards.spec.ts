import { expect, test } from "@playwright/test";

test.describe("Unauthenticated route guards", () => {
  test("GET /trade redirects to /login with next param", async ({ page }) => {
    await page.goto("/trade");
    await expect(page).toHaveURL(/\/login\?next=%2Ftrade/);
  });

  test("GET /admin redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /wallet redirects to /login", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /referrals redirects to /login", async ({ page }) => {
    await page.goto("/referrals");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /me redirects to /login", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /portfolio redirects to /login", async ({ page }) => {
    await page.goto("/portfolio");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Public routes accessible without auth", () => {
  test("GET / returns 200 (landing page)", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("GET /login returns 200", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
  });

  test("GET /signup returns 200", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Admin routes — regular user session", () => {
  test("POST /api/admin/codes/mint returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/admin/codes/mint", {
      data: { count: 1, expiresAt: null, note: "guard test" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/trades returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/admin/trades");
    expect(response.status()).toBe(401);
  });

  test("GET /api/admin/users returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/admin/users");
    expect(response.status()).toBe(401);
  });
});

test.describe("Public API endpoints", () => {
  test("GET /api/tokens returns 200 with items array", async ({ request }) => {
    const response = await request.get("/api/tokens");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty("items");
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  test("GET /api/periods returns 200 with items array", async ({ request }) => {
    const response = await request.get("/api/periods");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty("items");
  });

  test("GET /api/promo/slots returns 200", async ({ request }) => {
    const response = await request.get("/api/promo/slots");
    expect(response.status()).toBe(200);
  });

  test("GET /api/invites/validate with no code returns 400", async ({ request }) => {
    const response = await request.get("/api/invites/validate");
    expect(response.status()).toBe(400);
  });

  test("GET /api/invites/validate with unknown code returns valid=false", async ({ request }) => {
    const response = await request.get("/api/invites/validate?code=UNKNOWN999");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.isValid).toBe(false);
  });
});
