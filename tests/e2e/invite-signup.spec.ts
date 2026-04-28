import { expect, test, type BrowserContext, type Page } from "@playwright/test";

interface MintInviteCodeOptions {
  expiresAt?: string | null;
  note?: string | null;
}

interface SignupPayload {
  code: string;
  email: string;
  password: string;
  username: string;
}

const createIdentity = (prefix: string) => {
  const compactPrefix = prefix.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  const token = `${compactPrefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return {
    email: `${token}@trusttrade.pro`,
    username: token.slice(0, 24),
  };
};

const signInAsAdmin = async (page: Page) => {
  await page.goto("/login?next=%2Fadmin");
  await page.getByLabel("Email").fill("ops.admin@trusttrade.pro");
  await page.getByLabel("Password").fill("previewpass");
  await page.getByRole("button", { name: /open control room/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
};

const mintInviteCode = async (
  context: BrowserContext,
  options: MintInviteCodeOptions = {},
) => {
  const response = await context.request.post("/api/admin/codes/mint", {
    data: {
      count: 1,
      expiresAt: options.expiresAt ?? null,
      note: options.note ?? "E2E invite batch",
    },
  });

  expect(response.status()).toBe(201);

  const payload = (await response.json()) as {
    data: {
      batch: Array<{
        code: string;
      }>;
    };
  };

  return payload.data.batch[0]?.code ?? "";
};

const submitSignupRequest = async (context: BrowserContext, payload: SignupPayload) =>
  context.request.post("/api/auth/signup", {
    data: payload,
  });

test("signup stays locked without a valid code", async ({ page }) => {
  await page.goto("/signup");

  await expect(
    page.getByRole("heading", {
      name: /waiting on valid code/i,
    }),
  ).toBeVisible();

  await page.getByLabel("Invitation code").fill("BAD");
  await expect(page.getByText(/invite code is too short/i)).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveCount(0);
});

test("valid invite code creates an account and redirects to login", async ({ page }) => {
  const identity = createIdentity("signup-ui");

  await page.goto("/signup?ref=REF_ATLAS");
  await expect(page.getByText(/valid referral invite/i)).toBeVisible();

  await page.getByLabel("Username").fill(identity.username);
  await page.getByLabel("Email").fill(identity.email);
  await page.getByLabel("Password").fill("previewpass");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/login\?next=\/trade&signup=1&mode=preview$/);
  await expect(page.getByText(/account created/i)).toBeVisible();
});

test("single-use invite works once and then rejects reuse", async ({ page, context }) => {
  await signInAsAdmin(page);

  const inviteCode = await mintInviteCode(context, {
    note: "single-use coverage",
  });
  const firstIdentity = createIdentity("single-first");
  const secondIdentity = createIdentity("single-second");

  const firstResponse = await submitSignupRequest(context, {
    code: inviteCode,
    email: firstIdentity.email,
    password: "previewpass",
    username: firstIdentity.username,
  });

  expect(firstResponse.status()).toBe(201);

  const secondResponse = await submitSignupRequest(context, {
    code: inviteCode,
    email: secondIdentity.email,
    password: "previewpass",
    username: secondIdentity.username,
  });

  expect(secondResponse.status()).toBe(409);
  const secondPayload = (await secondResponse.json()) as {
    error: {
      code: string;
    };
  };

  expect(secondPayload.error.code).toBe("CODE_INACTIVE");
});

test("revoked invite code fails validation", async ({ page, context }) => {
  await signInAsAdmin(page);

  const inviteCode = await mintInviteCode(context, {
    note: "revoke coverage",
  });

  const revokeResponse = await context.request.post(
    `/api/admin/codes/${encodeURIComponent(inviteCode)}/revoke`,
  );

  expect(revokeResponse.status()).toBe(200);

  const validateResponse = await context.request.get(
    `/api/invites/validate?code=${encodeURIComponent(inviteCode)}`,
  );

  expect(validateResponse.status()).toBe(200);
  const validatePayload = (await validateResponse.json()) as {
    data: {
      code: string;
      isValid: boolean;
      status: string;
    };
  };

  expect(validatePayload.data).toMatchObject({
    code: inviteCode,
    isValid: false,
    status: "revoked",
  });
});

test("expired invite code auto-flips during validation", async ({ page, context }) => {
  await signInAsAdmin(page);

  const inviteCode = await mintInviteCode(context, {
    expiresAt: "2024-01-01T00:00:00.000Z",
    note: "expiry coverage",
  });

  const validateResponse = await context.request.get(
    `/api/invites/validate?code=${encodeURIComponent(inviteCode)}`,
  );

  expect(validateResponse.status()).toBe(200);
  const validatePayload = (await validateResponse.json()) as {
    data: {
      code: string;
      isValid: boolean;
      status: string;
    };
  };

  expect(validatePayload.data).toMatchObject({
    code: inviteCode,
    isValid: false,
    status: "expired",
  });
});

test("concurrent signup requests only consume a single-use code once", async ({
  page,
  context,
}) => {
  await signInAsAdmin(page);

  const inviteCode = await mintInviteCode(context, {
    note: "race coverage",
  });
  const firstIdentity = createIdentity("race-first");
  const secondIdentity = createIdentity("race-second");

  const responses = await Promise.all([
    submitSignupRequest(context, {
      code: inviteCode,
      email: firstIdentity.email,
      password: "previewpass",
      username: firstIdentity.username,
    }),
    submitSignupRequest(context, {
      code: inviteCode,
      email: secondIdentity.email,
      password: "previewpass",
      username: secondIdentity.username,
    }),
  ]);

  const statusCodes = responses
    .map((response) => response.status())
    .sort((left, right) => left - right);

  expect(statusCodes).toEqual([201, 409]);
});
