import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPreviewMarketTokens } from "@/lib/markets/preview-data";

interface RouteContext {
  params: Promise<{ tokenId: string }>;
}

const patchSchema = z.object({
  driftBiasBps: z.number().int().optional(),
  feedSource: z.enum(["synthetic", "shadow", "replay", "frozen"]).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { tokenId } = await context.params;
    const payload = await request.json();
    const input = patchSchema.parse(payload);

    if (!getOptionalServerEnv()) {
      // Preview: return a dummy success
      const tokens = getPreviewMarketTokens();
      const token = tokens.items.find((t) => t.id === tokenId);
      return Response.json({
        data: {
          feedSource: input.feedSource ?? token?.feedSource ?? "synthetic",
          tokenId,
          tokenSymbol: token?.symbol ?? "PREVIEW",
        },
      });
    }

    const adminClient = createSupabaseAdminClient();
    const updateFields: Record<string, unknown> = {};

    if (input.feedSource !== undefined) updateFields.feed_source = input.feedSource;
    if (input.driftBiasBps !== undefined) updateFields.drift_bias_bps = input.driftBiasBps;

    const { data, error } = await adminClient
      .from("tokens")
      .update(updateFields)
      .eq("id", tokenId)
      .select("id, symbol, feed_source, drift_bias_bps, last_price_cents, last_shadow_price_cents, freeze_price_cents")
      .maybeSingle();

    if (error) {
      throw new ApiClientError(error.message, 500, "CANDLE_CONTROLLER_UPDATE_FAILED", error);
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
      { error: { code: "CANDLE_CONTROLLER_BAD_REQUEST", message: "Candle controller update failed." } },
      { status: 400 },
    );
  }
}
