import { getOptionalServerEnv } from "@/lib/env/server";
import { getAppSession } from "@/lib/auth/session";
import { getBalance, listActiveTrades } from "@/lib/trades/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";
const HEARTBEAT_INTERVAL_MS = 25_000;

function encodeEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Connection closed
        }
      };

      // Resolve user ID
      let userId = PREVIEW_USER_ID;
      if (getOptionalServerEnv()) {
        const client = await createSupabaseServerClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          controller.close();
          return;
        }
        userId = user.id;
      }

      // Send hello + initial state
      enqueue(encodeEvent("hello", { userId }));

      try {
        const [trades, balance] = await Promise.all([
          listActiveTrades(userId),
          getBalance(userId),
        ]);
        enqueue(encodeEvent("snapshot", { trades, balance }));
      } catch {
        enqueue(encodeEvent("error", { code: "SNAPSHOT_FAILED" }));
      }

      // Heartbeat to keep connection alive
      const heartbeatTimer = setInterval(() => {
        enqueue(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      // Live mode: subscribe to Realtime
      let unsubscribe: (() => void) | null = null;

      if (getOptionalServerEnv()) {
        const client = await createSupabaseServerClient();
        const channel = client
          .channel(`user:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              filter: `user_id=eq.${userId}`,
              schema: "public",
              table: "user_trades",
            },
            (payload) => enqueue(encodeEvent("trade", payload.new)),
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              filter: `user_id=eq.${userId}`,
              schema: "public",
              table: "user_balances",
            },
            (payload) => enqueue(encodeEvent("balance", payload.new)),
          )
          .subscribe();

        unsubscribe = () => {
          client.removeChannel(channel).catch(() => null);
        };
      }

      // Preview mode: push a simulated trade settlement after 8s for demo
      let previewTimer: ReturnType<typeof setTimeout> | null = null;
      if (!getOptionalServerEnv()) {
        previewTimer = setTimeout(() => {
          enqueue(
            encodeEvent("trade", {
              id: "00000000-0000-4000-8000-0000000000t2",
              status: "settled",
              outcome: "win",
              strike_price_cents: 8_462_000,
            }),
          );
        }, 8_000);
      }

      // Cleanup on disconnect
      return () => {
        clearInterval(heartbeatTimer);
        if (previewTimer) clearTimeout(previewTimer);
        if (unsubscribe) unsubscribe();
        controller.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
