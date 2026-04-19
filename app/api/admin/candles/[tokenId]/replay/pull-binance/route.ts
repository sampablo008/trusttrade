import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ tokenId: string }>;
}

const BINANCE_REST = "https://api.binance.com/api/v3/klines";
const LIMIT = 500;
const INTERVAL = "1m";

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

async function fetchBinanceKlines(symbol: string): Promise<BinanceKline[]> {
  const url = `${BINANCE_REST}?symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL}&limit=${LIMIT}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new ApiClientError(
      `Binance REST returned ${response.status}.`,
      502,
      "BINANCE_FETCH_FAILED",
    );
  }

  const raw = (await response.json()) as unknown[][];

  return raw.map((row) => ({
    close: String(row[4]),
    high: String(row[2]),
    low: String(row[3]),
    open: String(row[1]),
    openTime: Number(row[0]),
    volume: String(row[5]),
  }));
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { tokenId } = await context.params;

    if (!getOptionalServerEnv()) {
      return Response.json({ data: { imported: 500, tokenId } });
    }

    const adminClient = createSupabaseAdminClient();

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("tokens")
      .select("shadow_symbol")
      .eq("id", tokenId)
      .maybeSingle();

    if (tokenError) {
      throw new ApiClientError(tokenError.message, 500, "TOKEN_FETCH_FAILED", tokenError);
    }

    if (!tokenRow) {
      throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
    }

    const shadowSymbol = (tokenRow.shadow_symbol as string | null) ?? "";
    if (!shadowSymbol) {
      throw new ApiClientError(
        "Token has no shadow_symbol set — cannot pull from Binance.",
        400,
        "NO_SHADOW_SYMBOL",
      );
    }

    const klines = await fetchBinanceKlines(shadowSymbol);

    if (!klines.length) {
      return Response.json({ data: { imported: 0, tokenId } });
    }

    // Clear existing replay bank
    await adminClient.from("candle_replay_bank").delete().eq("token_id", tokenId);

    const insertRows = klines.map((kline, index) => ({
      close_cents: Math.round(parseFloat(kline.close) * 100),
      high_cents: Math.round(parseFloat(kline.high) * 100),
      low_cents: Math.max(1, Math.round(parseFloat(kline.low) * 100)),
      open_cents: Math.round(parseFloat(kline.open) * 100),
      row_index: index,
      source_time: new Date(kline.openTime).toISOString(),
      token_id: tokenId,
      volume: parseFloat(kline.volume),
    }));

    const BATCH_SIZE = 250;
    for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
      const { error } = await adminClient
        .from("candle_replay_bank")
        .insert(insertRows.slice(i, i + BATCH_SIZE));
      if (error) {
        throw new ApiClientError(error.message, 500, "REPLAY_INSERT_FAILED", error);
      }
    }

    // Reset replay state
    await adminClient.from("token_replay_state").upsert(
      {
        cursor_index: 0,
        replay_speed: 1,
        status: "idle",
        token_id: tokenId,
      },
      { onConflict: "token_id" },
    );

    return Response.json({ data: { imported: insertRows.length, tokenId } });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "PULL_BINANCE_BAD_REQUEST", message: "Binance pull failed." } },
      { status: 400 },
    );
  }
}
