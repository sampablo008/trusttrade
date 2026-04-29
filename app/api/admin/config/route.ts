import { NextResponse } from "next/server";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getAppConfig, updateAppConfig } from "@/lib/admin/config-service";
import { ApiClientError } from "@/lib/api/client";
import { z } from "zod";

const patchSchema = z.object({
  bonusTicketTtlDays: z.number().int().min(1).max(3650).optional(),
  bonusWagerMultiplier: z.number().min(1).max(100).optional(),
  expiryPolicy: z.enum(["auto_lose", "auto_win", "void", "leave_pending"]).optional(),
  globalTradeFreezeEnabled: z.boolean().optional(),
  refDefaultL1Bps: z.number().int().min(0).max(10000).optional(),
  refDefaultL2Bps: z.number().int().min(0).max(10000).optional(),
  refDefaultL3Bps: z.number().int().min(0).max(10000).optional(),
  refDefaultL4Bps: z.number().int().min(0).max(10000).optional(),
  refDefaultL5Bps: z.number().int().min(0).max(10000).optional(),
  refMinDepositCents: z.number().int().min(0).optional(),
  signupBonusCents: z.number().int().min(0).optional(),
  withdrawFeeCents: z.number().int().min(0).optional(),
  withdrawMinCents: z.number().int().min(0).optional(),
});

function internalError(err: unknown): NextResponse {
  if (err instanceof ApiClientError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected error." } }, { status: 500 });
}

export async function GET() {
  try {
    await assertAdminApi();
    const config = await getAppConfig();
    return NextResponse.json(config);
  } catch (err) {
    return internalError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    await assertAdminApi();
    const body = await req.json();
    const input = patchSchema.parse(body);
    const config = await updateAppConfig(input);
    return NextResponse.json(config);
  } catch (err) {
    return internalError(err);
  }
}
