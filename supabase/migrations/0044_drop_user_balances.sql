-- ---------------------------------------------------------------------------
-- Phase 4: drop the legacy user_balances table.
--
-- All readers and writers have been migrated:
--   - User-facing services read user_token_balances; getBalance synthesises
--     the legacy UserBalance shape from token totals.
--   - Admin services no longer join user_balances.
--   - Streams subscribe to user_token_balances changes.
--   - place_trade / approve_deposit / approve_withdrawal / approve_commission
--     / credit_bonus / cancel_trade / execute_swap all touch
--     user_token_balances exclusively.
--
-- Two RPCs still referenced the table as a defensive shim and are updated
-- here before the drop:
--
--   handle_new_user    →  no longer inserts a zero row into user_balances.
--   settle_trade       →  legacy USD branch removed. A trade with
--                         lock_token_id IS NULL would now raise — but we
--                         verified there are no such active trades.
-- ---------------------------------------------------------------------------

-- 1. handle_new_user — drop the legacy user_balances row insertion.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_email        text := lower(coalesce(new.email, ''));
  derived_username     text := 'user_' || left(replace(new.id::text, '-', ''), 12);
  derived_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_usdt_id            uuid;
  v_signup_bonus_cents bigint;
begin
  insert into public.profiles (
    user_id, email, role, username, display_name
  )
  values (
    new.id,
    derived_email,
    'user',
    derived_username,
    coalesce(derived_display_name, split_part(derived_email, '@', 1))
  )
  on conflict (user_id) do nothing;

  select id into v_usdt_id from public.tokens where symbol = 'USDT' limit 1;
  select coalesce(signup_bonus_cents, 0) into v_signup_bonus_cents
    from public.app_config limit 1;

  if v_usdt_id is not null and v_signup_bonus_cents > 0 then
    insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
    values (new.id, v_usdt_id, v_signup_bonus_cents::numeric / 100.0, 0)
    on conflict (user_id, token_id)
    do update set balance    = public.user_token_balances.balance + excluded.balance,
                  updated_at = now();
  end if;

  return new;
end;
$$;

-- 2. settle_trade — drop the legacy USD branch. Pre-0027 trades with
--    NULL lock_token_id no longer have a settlement path; they would raise
--    a clear error if any still existed. (Verified: zero active legacy
--    trades on remote at migration time.)
create or replace function public.settle_trade(
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
  v_trade        public.user_trades;
  v_lock_token   uuid;
  v_payout_token numeric(38, 18);
  v_memo         text;
begin
  select * into v_trade
  from public.user_trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'Trade does not exist.';
  end if;

  if v_trade.status not in ('active') then
    raise exception 'TRADE_NOT_SETTLEABLE'
      using hint = 'Trade is not in an active state.';
  end if;

  v_lock_token := v_trade.lock_token_id;

  if v_lock_token is null then
    raise exception 'LEGACY_USD_TRADE_UNSUPPORTED'
      using hint = 'This trade was placed before per-token funding and has no token to credit.';
  end if;

  -- Token-funded settlement.
  if p_outcome = 'win' then
    v_payout_token := v_trade.stake_token_amount
                    + (v_trade.stake_token_amount * v_trade.payout_bps / 10000.0);
    v_memo := 'Trade won';
  elsif p_outcome = 'void' then
    v_payout_token := v_trade.stake_token_amount;
    v_memo := 'Trade voided';
  else
    v_payout_token := 0;
    v_memo := 'Trade lost';
  end if;

  update public.user_token_balances
  set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
      balance        = balance + v_payout_token,
      updated_at     = now()
  where user_id = v_trade.user_id and token_id = v_lock_token;

  update public.user_trades
  set status     = 'settled',
      outcome    = p_outcome,
      strike_price_cents = coalesce(v_trade.strike_price_cents, v_trade.entry_price_cents),
      updated_at = now()
  where id = p_trade_id
  returning * into v_trade;

  insert into public.transactions (
    user_id, kind, amount_cents,
    reference_type, reference_id, memo, metadata
  )
  values (
    v_trade.user_id,
    case p_outcome when 'win' then 'trade_win'
                   when 'void' then 'trade_void'
                   else 'trade_lose' end,
    0,
    'user_trades', p_trade_id, v_memo,
    jsonb_build_object(
      'outcome',        p_outcome::text,
      'lock_token_id',  v_lock_token,
      'stake_amount',   v_trade.stake_token_amount::text,
      'payout_amount',  v_payout_token::text
    )
  );

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, after_state, note
  )
  values (
    p_admin_id, 'settle_trade', 'user_trades', p_trade_id,
    to_jsonb(v_trade), coalesce(p_reason, p_outcome::text)
  );

  return v_trade;
end;
$$;

-- 3. Drop the legacy user_balances table.
--
-- RLS policies attached to the table are dropped automatically when the
-- table is dropped. No FKs reference user_balances (only the other way
-- around: it referenced profiles.user_id).
drop table if exists public.user_balances cascade;
