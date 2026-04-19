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

  const policy: string = (config as { expiry_policy?: string } | null)?.expiry_policy ?? "auto_lose";

  if (policy === "leave_pending") {
    return new Response(JSON.stringify({ settled: 0, policy }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: expired, error } = await supabase
    .from("user_trades")
    .select("id")
    .eq("status", "active")
    .lt("end_time", new Date().toISOString())
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const tradeIds: string[] = (expired ?? []).map((r: { id: string }) => r.id);
  let settled = 0;

  for (const id of tradeIds) {
    const { error: settleErr } = await supabase.rpc("settle_trade", {
      p_trade_id: id,
      p_outcome: policy === "auto_win" ? "win" : policy === "void" ? "void" : "lose",
      p_admin_id: null,
      p_reason: `auto_${policy}`,
    });

    if (!settleErr) settled++;
  }

  return new Response(JSON.stringify({ settled, policy, total: tradeIds.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
