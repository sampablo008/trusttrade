// @ts-nocheck — Deno types
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // expire_bonus_tickets is a security-definer function that:
  //   SELECT locked tickets WHERE expires_at < now()
  //   UPDATE status = 'expired'
  //   UPDATE user_balances: balance_cents -= amount, locked_bonus_cents -= amount
  //   INSERT transactions (bonus_expire debit) per ticket
  const { data, error } = await supabase.rpc("expire_bonus_tickets");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expired: number = (data as number | null) ?? 0;
  return new Response(JSON.stringify({ expired }), {
    headers: { "Content-Type": "application/json" },
  });
});
