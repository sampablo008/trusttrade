import { getOptionalServerEnv } from "@/lib/env/server";
import { getAppSession } from "@/lib/auth/session";
import { listAdminTrades } from "@/lib/admin/trades-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const HEARTBEAT_INTERVAL_MS = 25_000;

function encodeEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await getAppSession();

  if (!session.isAuthenticated || !session.isAdmin) {
    return new Response("Forbidden", { status: 403 });
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

      enqueue(encodeEvent("hello", { role: "admin" }));

      // Send initial snapshot of active trades
      try {
        const trades = await listAdminTrades({ status: "active", limit: 200 });
        enqueue(encodeEvent("snapshot", { trades }));
      } catch {
        enqueue(encodeEvent("error", { code: "SNAPSHOT_FAILED" }));
      }

      const heartbeatTimer = setInterval(() => {
        enqueue(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      let unsubscribe: (() => void) | null = null;

      if (getOptionalServerEnv()) {
        const client = await createSupabaseServerClient();

        const channel = client
          .channel("admin:broadcast")
          // All trade changes
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "user_trades" },
            (payload) => enqueue(encodeEvent("trade", payload.new)),
          )
          .subscribe();

        unsubscribe = () => {
          client.removeChannel(channel).catch(() => null);
        };
      } else {
        // Preview: simulate a trade settling after 5s
        const timer = setTimeout(() => {
          enqueue(
            encodeEvent("trade", {
              id: "00000000-0000-4000-8000-0000000000t1",
              outcome: "win",
              status: "settled",
            }),
          );
        }, 5_000);

        unsubscribe = () => clearTimeout(timer);
      }

      return () => {
        clearInterval(heartbeatTimer);
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
