import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ tokenId: string }>;
}

const hardSetSchema = z.object({
  priceCents: z.number().int().positive("Price must be positive."),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { tokenId } = await context.params;
    const payload = await request.json();
    const { priceCents } = hardSetSchema.parse(payload);

    if (!getOptionalServerEnv()) {
      return Response.json({ data: { priceCents, tokenId } });
    }

    const adminClient = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await adminClient
      .from("tokens")
      .update({
        feed_source: "frozen",
        freeze_price_cents: priceCents,
        last_price_cents: priceCents,
        last_price_at: now,
      })
      .eq("id", tokenId)
      .select("id, symbol, feed_source, freeze_price_cents, last_price_cents")
      .maybeSingle();

    if (error) {
      throw new ApiClientError(error.message, 500, "HARD_SET_FAILED", error);
    }

    if (!data) {
      throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
    }

    return Response.json({ data });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "HARD_SET_BAD_REQUEST", message: "Hard-set failed." } },
      { status: 400 },
    );
  }
}
