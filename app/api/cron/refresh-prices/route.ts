import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getLiveUsdPrices } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface TokenRow {
  id: string;
  symbol: string;
  shadow_symbol: string | null;
}

const isAuthorized = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header === expected;
};

const handleRefresh = async (): Promise<Response> => {
  if (!getOptionalServerEnv()) {
    return Response.json({ data: { refreshed: 0, skipped: "no-env" } });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tokens")
    .select("id, symbol, shadow_symbol")
    .eq("is_enabled", true);

  if (error) {
    throw new ApiClientError(error.message, 500, "TOKEN_FETCH_FAILED", error);
  }

  const rows = (data ?? []) as TokenRow[];
  if (rows.length === 0) {
    return Response.json({ data: { refreshed: 0 } });
  }

  const lookups = rows.map((r) => ({ symbol: r.symbol, shadowSymbol: r.shadow_symbol }));
  const prices = await getLiveUsdPrices(lookups);

  const nowIso = new Date().toISOString();
  const updates = rows
    .map((r) => {
      const usd = prices[r.symbol];
      if (usd == null || usd <= 0) return null;
      return { id: r.id, cents: Math.round(usd * 100) };
    })
    .filter((u): u is { id: string; cents: number } => u != null);

  const results = await Promise.allSettled(
    updates.map((u) =>
      admin
        .from("tokens")
        .update({
          last_price_cents: u.cents,
          last_price_at: nowIso,
          last_shadow_price_cents: u.cents,
          last_shadow_at: nowIso,
        })
        .eq("id", u.id),
    ),
  );

  const refreshed = results.filter((r) => r.status === "fulfilled").length;
  return Response.json({
    data: {
      refreshed,
      attempted: updates.length,
      total: rows.length,
      at: nowIso,
    },
  });
};

const guard = (request: Request): Response | null => {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid cron secret." } },
      { status: 401 },
    );
  }
  return null;
};

export const POST = async (request: Request) => {
  const denied = guard(request);
  if (denied) return denied;

  try {
    return await handleRefresh();
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: {
          code: "REFRESH_FAILED",
          message: error instanceof Error ? error.message : "Refresh failed.",
        },
      },
      { status: 500 },
    );
  }
};

export const GET = POST;
