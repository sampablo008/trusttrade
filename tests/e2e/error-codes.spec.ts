import { expect, test } from "@playwright/test";

test.describe("Error envelope contract", () => {
  test("unauthenticated user API returns typed error envelope", async ({ request }) => {
    const response = await request.get("/api/me");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
    expect(typeof body.error.code).toBe("string");
    expect(typeof body.error.message).toBe("string");
  });

  test("POST /api/trades without auth returns 401 with error envelope", async ({ request }) => {
    const response = await request.post("/api/trades", {
      data: { amountCents: 10_000, direction: "long", periodId: "x", tokenId: "y" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  test("GET /api/candles with missing params returns 400", async ({ request }) => {
    const response = await request.get("/api/candles");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBeDefined();
  });
});
