// @ts-nocheck — Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: config } = await supabase
    .from("app_config")
    .select("expiry_policy")
    .eq("id", 1)
    .maybeSingle();

  const policy: string =
    (config as { expiry_policy?: string } | null)?.expiry_policy ?? "auto_lose";

  // `leave_pending` → only trades with admin_forced_outcome settle (null default).
  const defaultOutcome: string | null =
    policy === "auto_win" ? "win"
    : policy === "auto_lose" ? "lose"
    : policy === "void" ? "void"
    : null;

  const { data, error } = await supabase.rpc("settle_due_trades", {
    p_default_outcome: defaultOutcome,
    p_user_id: null,
    p_limit: 500,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ settled: data ?? 0, policy }), {
    headers: { "Content-Type": "application/json" },
  });
});
