-- ---------------------------------------------------------------------------
-- Single low-frequency cron that powers all stored candle data.
--
-- Schedule:
--   aggregate_candles — once per minute. Pulls 1m klines from Binance for
--                       each enabled shadow/replay token, upserts candles_1m,
--                       rolls up 5m/15m/1h/4h/1d, refreshes
--                       tokens.last_price_cents + last_shadow_price_cents.
--
-- Why no high-freq cron:
--   - Trade execution: lib/trades/service.ts hits Binance live and writes
--     back to last_shadow_price_cents on every place_trade.
--   - Wallet/admin reads: same pattern via getWalletBalances.
--   - Sub-minute charting: client-side Binance WebSocket
--     (see hooks/useBinanceTicker etc).
--   - Stored candles_1s table is no longer populated. The /api/stream/candles
--     1s/15s timeframes will need to be served from Binance WS directly or
--     dropped from the UI — flagged as a separate change.
--
-- Vault prerequisite (set once):
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'supabase_service_role_key');
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

create or replace function public.invoke_edge_function(p_name text)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_project_url text := current_setting('app.settings.supabase_url', true);
  v_key         text;
begin
  begin
    select decrypted_secret into v_key
      from vault.decrypted_secrets
     where name = 'supabase_service_role_key'
     limit 1;
  exception
    when undefined_table then
      v_key := current_setting('app.settings.service_role_key', true);
  end;

  if v_project_url is null or v_project_url = '' then
    v_project_url := current_setting('app.settings.supabase_url', true);
  end if;

  if v_key is null or v_key = '' then
    raise notice 'invoke_edge_function: service role key not configured';
    return;
  end if;

  perform net.http_post(
    url     := v_project_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
end;
$$;

-- Settle expired trades directly via the existing in-DB SQL function. No
-- edge-function roundtrip means this is essentially free even at 5s cadence.
-- The expiry_policy column on app_config decides the default outcome for
-- trades that didn't get an admin-forced outcome.
create or replace function public.settle_expired_trades_cron()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy text;
  v_default public.trade_outcome;
  v_settled int;
begin
  select expiry_policy into v_policy from public.app_config limit 1;

  v_default := case v_policy
    when 'auto_win'  then 'win'::public.trade_outcome
    when 'auto_lose' then 'lose'::public.trade_outcome
    when 'void'      then 'void'::public.trade_outcome
    else null
  end;

  select public.settle_due_trades(v_default, null, 500) into v_settled;
  return v_settled;
end;
$$;

-- Idempotent: drop any prior schedules from earlier iterations of this
-- migration (or the higher-frequency design) before recreating.
do $$
declare
  j record;
begin
  for j in select jobid, jobname from cron.job
           where jobname in (
             'aggregate_candles_1m',
             'settle_expired_trades_5s',
             'shadow_fetch_5s',
             'tick_candles_1s'
           )
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'aggregate_candles_1m',
  '* * * * *',
  $$ select public.invoke_edge_function('aggregate_candles'); $$
);

select cron.schedule(
  'settle_expired_trades_5s',
  '5 seconds',
  $$ select public.settle_expired_trades_cron(); $$
);
