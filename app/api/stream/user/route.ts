import { getOptionalServerEnv } from "@/lib/env/server";
import { getAppSession } from "@/lib/auth/session";
import { getBalance, listActiveTrades } from "@/lib/trades/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";
const HEARTBEAT_INTERVAL_MS = 25_000;
const SETTLE_TICK_MS = 1_000;

type ExpiryPolicy = "auto_lose" | "auto_win" | "void" | "leave_pending";

const policyToDefaultOutcome = (policy: ExpiryPolicy | null | undefined) => {
  switch (policy) {
    case "auto_win": return "win";
    case "auto_lose": return "lose";
    case "void": return "void";
    default: return null;
  }
};

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
      let settleTimer: ReturnType<typeof setInterval> | null = null;

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
              event: "*",
              filter: `user_id=eq.${userId}`,
              schema: "public",
              table: "user_token_balances",
            },
            (payload) => enqueue(encodeEvent("token-balance", payload.new)),
          )
          .subscribe();

        unsubscribe = () => {
          client.removeChannel(channel).catch(() => null);
        };

        // Inline settler: every tick, settle this user's own expired active
        // trades so settlement fires within ~1s of end_time without waiting
        // for the global pg_cron job. settle_due_trades respects forced
        // outcomes and the global expiry_policy.
        const admin = createSupabaseAdminClient();
        let settleInFlight = false;

        const tick = async () => {
          if (settleInFlight) return;
          settleInFlight = true;
          try {
            const { data: configRow } = await admin
              .from("app_config")
              .select("expiry_policy")
              .eq("id", 1)
              .maybeSingle();

            const policy = (configRow as { expiry_policy?: ExpiryPolicy } | null)?.expiry_policy ?? "auto_lose";

            await admin.rpc("settle_due_trades", {
              p_default_outcome: policyToDefaultOutcome(policy),
              p_user_id: userId,
              p_limit: 50,
            });
          } catch {
            // Swallow; Realtime + next tick will recover.
          } finally {
            settleInFlight = false;
          }
        };

        settleTimer = setInterval(tick, SETTLE_TICK_MS);
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
        if (settleTimer) clearInterval(settleTimer);
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
