-- Admin pre-scheduled trade outcome
-- Admin picks win/lose/void while a trade is still active; outcome is applied
-- only when end_time passes, so the user's countdown never budges.

alter table public.user_trades
  add column if not exists admin_forced_outcome public.trade_outcome,
  add column if not exists admin_forced_by      uuid references public.profiles (user_id) on delete set null,
  add column if not exists admin_forced_reason  text,
  add column if not exists admin_forced_at      timestamptz;

alter table public.user_trades
  drop constraint if exists user_trades_settlement_consistency;

alter table public.user_trades
  add constraint user_trades_settlement_consistency check (
    (status = 'active' and outcome is null and settled_at is null)
    or
    (status = 'settled' and outcome is not null and settled_at is not null)
    or
    (status = 'cancelled' and settled_at is not null)
  );

-- force_trade_outcome: store a pre-scheduled outcome on an active trade.
-- If the trade has already crossed end_time, settle it immediately.
create or replace function public.force_trade_outcome(
  p_trade_id  uuid,
  p_outcome   public.trade_outcome,
  p_admin_id  uuid,
  p_reason    text default null
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.user_trades;
begin
  select * into v_trade
  from public.user_trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'No trade with that ID.';
  end if;

  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_ACTIVE'
      using hint = 'Trade is already settled, cancelled, or void.';
  end if;

  if v_trade.end_time <= now() then
    return public.settle_trade(p_trade_id, p_outcome, p_admin_id, coalesce(p_reason, 'admin_force_past_end'));
  end if;

  update public.user_trades
  set
    admin_forced_outcome = p_outcome,
    admin_forced_by      = p_admin_id,
    admin_forced_reason  = p_reason,
    admin_forced_at      = now()
  where id = p_trade_id
  returning * into v_trade;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id,
    after_state, note
  )
  values (
    p_admin_id,
    'force_trade_outcome',
    'user_trades',
    p_trade_id,
    to_jsonb(v_trade),
    coalesce(p_reason, p_outcome::text)
  );

  return v_trade;
end;
$$;

-- settle_due_trades: settle all active trades whose end_time has passed.
-- Prefers admin_forced_outcome; falls back to p_default_outcome for the rest.
-- When p_default_outcome is null, only trades with admin_forced_outcome are
-- settled (use this when the global expiry policy is `leave_pending`).
-- Called both from the settle_expired_trades edge function and inline from
-- the user SSE stream so settlement fires within a second of expiry.
create or replace function public.settle_due_trades(
  p_default_outcome public.trade_outcome default null,
  p_user_id         uuid default null,
  p_limit           int  default 500
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    record;
  v_outcome public.trade_outcome;
  v_count  int := 0;
begin
  for v_row in
    select id, admin_forced_outcome
    from public.user_trades
    where status = 'active'
      and end_time <= now()
      and (p_user_id is null or user_id = p_user_id)
    order by end_time
    limit p_limit
    for update skip locked
  loop
    v_outcome := coalesce(v_row.admin_forced_outcome, p_default_outcome);
    if v_outcome is null then
      continue;
    end if;

    begin
      perform public.settle_trade(
        v_row.id,
        v_outcome,
        null,
        case when v_row.admin_forced_outcome is not null
          then 'auto_admin_forced'
          else 'auto_expired'
        end
      );
      v_count := v_count + 1;
    exception
      when others then
        null;
    end;
  end loop;

  return v_count;
end;
$$;
