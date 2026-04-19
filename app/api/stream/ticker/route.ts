import { getOptionalServerEnv } from "@/lib/env/server";
import { getPreviewMarketTokens } from "@/lib/markets/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;
const TICK_INTERVAL_MS = 2_000;

export async function GET(): Promise<Response> {
  const isPreview = !getOptionalServerEnv();

  if (isPreview) {
    return buildPreviewTickerStream();
  }

  return buildLiveTickerStream();
}

function buildPreviewTickerStream(): Response {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s);
      controller.enqueue(encode("event: hello\ndata: {}\n\n"));

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      tickTimer = setInterval(() => {
        const result = getPreviewMarketTokens();
        const payload = result.items.map((t) => ({
          dayChangePercent: t.dayChangePercent,
          id: t.id,
          priceCents: t.priceCents,
          symbol: t.symbol,
        }));
        controller.enqueue(encode(`event: tick\ndata: ${JSON.stringify(payload)}\n\n`));
      }, TICK_INTERVAL_MS);
    },
    cancel() {
      if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
      if (tickTimer !== null) clearInterval(tickTimer);
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

function buildLiveTickerStream(): Response {
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s);
      const adminClient = createSupabaseAdminClient();

      controller.enqueue(encode("event: hello\ndata: {}\n\n"));

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      const channel = adminClient.channel("ticker:all");

      channel
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tokens" },
          async () => {
            const { data } = await adminClient
              .from("tokens")
              .select("id, symbol, last_price_cents, base_price_cents")
              .eq("is_enabled", true);

            if (!data) return;

            const payload = data.map((t) => {
              const priceCents = Number(t.last_price_cents ?? t.base_price_cents);
              const baseCents = Number(t.base_price_cents);
              return {
                dayChangePercent: Number(
                  (((priceCents - baseCents) / Math.max(baseCents, 1)) * 100).toFixed(2),
                ),
                id: t.id,
                priceCents,
                symbol: t.symbol,
              };
            });

            controller.enqueue(encode(`event: tick\ndata: ${JSON.stringify(payload)}\n\n`));
          },
        )
        .subscribe();
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
