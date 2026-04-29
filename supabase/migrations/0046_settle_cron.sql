-- ---------------------------------------------------------------------------
-- The settle-expired-trades cron was added to migration 0034 after 0034 had
-- already been applied to remote, so the wrapper function and pg_cron
-- schedule never landed. Without it, expired trades sit at status='active'
-- forever — only the per-user SSE settler clears them, and only while the
-- user has the page open.
--
-- This migration creates the wrapper + the 5-second schedule. Direct SQL
-- (no edge function), so it doesn't need the Vault service-role secret.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;

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

-- Idempotent: drop any prior schedule with this name before creating.
do $$
declare
  j record;
begin
  for j in select jobid, jobname from cron.job
           where jobname = 'settle_expired_trades_5s'
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'settle_expired_trades_5s',
  '5 seconds',
  $$ select public.settle_expired_trades_cron(); $$
);
