import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env/server";
import { getPreviewCandles } from "@/lib/markets/preview-data";
import { publicCandlesQuerySchema } from "@/schemas/market";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;
const TF_TABLE_MAP: Record<string, string> = {
  "1m": "candles_1m",
  "5m": "candles_5m",
  "15m": "candles_15m",
  "1h": "candles_1h",
  "4h": "candles_4h",
  "1d": "candles_1d",
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = publicCandlesQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? "120",
    symbol: url.searchParams.get("symbol") ?? "BTC",
    tf: url.searchParams.get("tf") ?? "1m",
  });

  if (!parsed.success) {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } },
      { status: 400 },
    );
  }

  const { symbol, tf } = parsed.data;

  let env: ReturnType<typeof getServerEnv> | null = null;
  try {
    env = getServerEnv();
  } catch {
    // preview mode
  }

  if (!env) {
    return buildPreviewStream(symbol, tf);
  }

  return buildLiveStream(symbol, tf, env);
}

function buildPreviewStream(symbol: string, tf: string): Response {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let candleTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);

      controller.enqueue(encode("event: hello\ndata: {}\n\n"));

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      candleTimer = setInterval(() => {
        const result = getPreviewCandles(symbol, tf as Parameters<typeof getPreviewCandles>[1], 1);
        const candle = result.items[0];
        if (!candle) return;
        controller.enqueue(encode(`event: candle\ndata: ${JSON.stringify(candle)}\n\n`));
      }, 1000);
    },
    cancel() {
      if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
      if (candleTimer !== null) clearInterval(candleTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}

function buildLiveStream(
  symbol: string,
  tf: string,
  env: ReturnType<typeof getServerEnv>,
): Response {
  const adminClient = createSupabaseAdminClient();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);

      controller.enqueue(encode("event: hello\ndata: {}\n\n"));

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      const { data: tokenRow } = await adminClient
        .from("tokens")
        .select("id")
        .eq("symbol", symbol.toUpperCase())
        .maybeSingle();

      if (!tokenRow?.id) {
        controller.enqueue(
          encode(`event: error\ndata: ${JSON.stringify({ code: "TOKEN_NOT_FOUND" })}\n\n`),
        );
        controller.close();
        return;
      }

      const tokenId = tokenRow.id as string;

      // Use a separate client for Realtime subscriptions (avoids service-role leakage)
      const rtClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

      // Subscribe to 1s candles for this token
      rtClient
        .channel(`candles-1s:${symbol}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            filter: `token_id=eq.${tokenId}`,
            schema: "public",
            table: "candles_1s",
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as Record<string, unknown>;
            if (!row || (tf !== "1s" && tf !== "15s" && tf !== "1m")) return;

            const candle = {
              closeCents: row.close_cents,
              highCents: row.high_cents,
              lowCents: row.low_cents,
              openCents: row.open_cents,
              time: row.bucket_start,
              volume: row.volume,
            };
            controller.enqueue(encode(`event: candle\ndata: ${JSON.stringify(candle)}\n\n`));
          },
        )
        .subscribe();

      // For higher TF, also watch the aggregated table
      const higherTfTable = TF_TABLE_MAP[tf];
      if (higherTfTable) {
        rtClient
          .channel(`candles-tf:${symbol}:${tf}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              filter: `token_id=eq.${tokenId}`,
              schema: "public",
              table: higherTfTable,
            },
            (payload) => {
              const row = (payload.new ?? payload.old) as Record<string, unknown>;
              if (!row) return;
              const candle = {
                closeCents: row.close_cents,
                highCents: row.high_cents,
                lowCents: row.low_cents,
                openCents: row.open_cents,
                time: row.bucket_start,
                volume: row.volume,
              };
              controller.enqueue(encode(`event: candle\ndata: ${JSON.stringify(candle)}\n\n`));
            },
          )
          .subscribe();
      }
    },
    cancel() {
      if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
