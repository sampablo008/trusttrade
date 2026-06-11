-- ---------------------------------------------------------------------------
-- Random payout per trade, sampled at place_trade time.
--
--   trade_periods.payout_bps (single value) → payout_min_bps + payout_max_bps.
--   place_trade samples a uniform integer in [min, max] for each trade and
--   writes it to user_trades.payout_bps. Settlement is unchanged — it reads
--   the trade's locked payout_bps, so randomness applies per-trade with no
--   forced retro-fix for in-flight trades.
--
--   payout_bps is preserved on trade_periods as the midpoint for back-compat
--   readers (admin charts, old API consumers). Source of truth for new trades
--   is the [min, max] pair.
-- ---------------------------------------------------------------------------

alter table public.trade_periods
  add column if not exists payout_min_bps integer,
  add column if not exists payout_max_bps integer;

update public.trade_periods
set payout_min_bps = payout_bps
where payout_min_bps is null;

update public.trade_periods
set payout_max_bps = payout_bps
where payout_max_bps is null;

alter table public.trade_periods
  alter column payout_min_bps set not null,
  alter column payout_max_bps set not null;

alter table public.trade_periods
  drop constraint if exists trade_periods_payout_range_check;

alter table public.trade_periods
  add constraint trade_periods_payout_range_check
  check (payout_min_bps > 0 and payout_max_bps >= payout_min_bps);

-- Rewrite place_trade to sample a random payout in the configured range.
drop function if exists public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint, bigint);

create or replace function public.place_trade(
  p_user_id              uuid,
  p_token_id             uuid,
  p_period_id            uuid,
  p_direction            public.trade_direction,
  p_amount_cents         bigint,
  p_lock_price_usd_cents bigint default null
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config       record;
  v_token        record;
  v_period       record;
  v_token_bal    record;
  v_entry_price  bigint;
  v_stake_amount numeric(38, 18);
  v_end_time     timestamptz;
  v_payout_bps   integer;
  v_trade        public.user_trades;
begin
  select global_trade_freeze, rate_limit_per_10s
  into v_config from public.app_config limit 1;

  if v_config.global_trade_freeze then
    raise exception 'TRADING_FROZEN' using hint = 'Trading is currently disabled.';
  end if;

  select id, symbol, is_enabled, base_price_cents, last_price_cents, last_shadow_price_cents
  into v_token from public.tokens where id = p_token_id;

  if not found or not v_token.is_enabled then
    raise exception 'TOKEN_UNAVAILABLE' using hint = 'This token is not available for trading.';
  end if;

  if v_token.symbol in ('USDT', 'USDC') then
    raise exception 'STABLE_NOT_TRADEABLE' using hint = 'Stablecoins are not chartable.';
  end if;

  select id, duration_seconds, min_amount_cents, max_amount_cents,
         payout_bps, payout_min_bps, payout_max_bps, is_enabled
  into v_period from public.trade_periods where id = p_period_id;

  if not found or not v_period.is_enabled then
    raise exception 'PERIOD_UNAVAILABLE' using hint = 'This trade period is not available.';
  end if;

  if p_amount_cents < v_period.min_amount_cents or p_amount_cents > v_period.max_amount_cents then
    raise exception 'AMOUNT_OUT_OF_RANGE'
      using hint = 'Amount must be between min and max for this period.';
  end if;

  -- Caller-supplied price wins. DB-cached columns are a last-resort safety net.
  v_entry_price := coalesce(
    nullif(p_lock_price_usd_cents, 0),
    nullif(v_token.last_price_cents, 0),
    nullif(v_token.last_shadow_price_cents, 0),
    v_token.base_price_cents
  );

  if v_entry_price is null or v_entry_price <= 0 then
    raise exception 'TOKEN_PRICE_UNAVAILABLE'
      using hint = 'Token has no valid price for stake calculation.';
  end if;

  v_stake_amount := round(p_amount_cents::numeric / v_entry_price::numeric, 18);

  if v_stake_amount <= 0 then
    raise exception 'STAKE_TOO_SMALL';
  end if;

  -- Sample uniform payout in [payout_min_bps, payout_max_bps]. If both equal,
  -- equivalent to the old fixed-payout behaviour.
  v_payout_bps := v_period.payout_min_bps
                  + floor(random() * (v_period.payout_max_bps - v_period.payout_min_bps + 1))::int;

  select balance, locked_balance into v_token_bal
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_token_id
  for update;

  if not found or v_token_bal.balance < v_stake_amount then
    raise exception 'INSUFFICIENT_TOKEN_BALANCE'
      using hint = 'Insufficient token balance to cover this trade stake.';
  end if;

  v_end_time := now() + (v_period.duration_seconds * interval '1 second');

  update public.user_token_balances
  set balance        = balance - v_stake_amount,
      locked_balance = locked_balance + v_stake_amount,
      updated_at     = now()
  where user_id = p_user_id and token_id = p_token_id;

  insert into public.user_trades (
    user_id, token_id, period_id, direction,
    stake_cents, payout_bps, entry_price_cents, end_time, status,
    stake_token_amount, lock_price_usd_cents, lock_token_id
  )
  values (
    p_user_id, p_token_id, p_period_id, p_direction,
    p_amount_cents, v_payout_bps, v_entry_price, v_end_time, 'active',
    v_stake_amount, v_entry_price, p_token_id
  )
  returning * into v_trade;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  )
  values (
    p_user_id, 'trade_debit', -p_amount_cents,
    'user_trades', v_trade.id,
    'Trade placed: ' || v_token.symbol || ' ' || p_direction::text,
    jsonb_build_object(
      'token_id',         p_token_id,
      'stake_amount',     v_stake_amount::text,
      'lock_price_cents', v_entry_price,
      'sampled_payout_bps', v_payout_bps,
      'payout_range',     jsonb_build_array(v_period.payout_min_bps, v_period.payout_max_bps)
    )
  );

  return v_trade;
end;
$$;

grant execute on function public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint, bigint) to authenticated;
