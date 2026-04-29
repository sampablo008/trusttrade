-- ---------------------------------------------------------------------------
-- USDT-funded trading: kill the abstract USD pool, fold balance_cents into
-- the user's USDT token balance, and switch place_trade / settle_trade to
-- lock from USDT instead of the chart token. Stablecoins (USDT, USDC) are
-- still depositable, withdrawable, and swappable, but no longer chartable
-- (filtered client-side).
-- ---------------------------------------------------------------------------

-- 1. user_trades: track which token was actually locked for the stake. Pre-0027
--    rows have stake_token_amount = NULL and lock_token_id = NULL (USD-cents
--    legacy). 0027-era rows had their chart token locked, so lock_token_id =
--    token_id. From this migration onward, every new row gets
--    lock_token_id = USDT.id.
alter table public.user_trades
  add column if not exists lock_token_id uuid references public.tokens (id) on delete restrict;

-- Backfill: 0027-era trades had chart token locked
update public.user_trades
set lock_token_id = token_id
where stake_token_amount is not null
  and lock_token_id is null;

-- 2. Migrate every user's USD bonus pool (balance_cents) into their USDT
--    token balance. After this step, balance_cents and locked_bonus_cents go
--    to zero; they remain on the table for legacy in-flight USD trades only.
do $$
declare
  v_usdt_id uuid;
begin
  select id into v_usdt_id from public.tokens where symbol = 'USDT' limit 1;
  if v_usdt_id is null then
    raise notice 'USDT token row not found — skipping bonus migration. Add USDT to tokens and re-run.';
    return;
  end if;

  insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
  select ub.user_id, v_usdt_id, ub.balance_cents::numeric / 100.0, 0
  from public.user_balances ub
  where ub.balance_cents > 0
  on conflict (user_id, token_id)
  do update set balance    = public.user_token_balances.balance + excluded.balance,
                updated_at = now();

  update public.user_balances
  set balance_cents      = 0,
      locked_bonus_cents = 0,
      updated_at         = now()
  where balance_cents > 0 or locked_bonus_cents > 0;
end;
$$;

-- 3. Update handle_new_user so the signup bonus credits USDT directly.
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

  -- Keep an empty user_balances row so legacy code paths that lookup the row
  -- don't blow up. Real value lives in user_token_balances now.
  insert into public.user_balances (
    user_id, balance_cents, locked_in_trades_cents, locked_bonus_cents
  )
  values (new.id, 0, 0, 0)
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

-- 4. place_trade — always lock USDT. The chart token (p_token_id) is purely
--    the price reference for the binary bet.
drop function if exists public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint, bigint);

create or replace function public.place_trade(
  p_user_id              uuid,
  p_token_id             uuid,
  p_period_id            uuid,
  p_direction            public.trade_direction,
  p_amount_cents         bigint,
  p_lock_price_usd_cents bigint default null  -- ignored; kept for compat
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
  v_usdt         record;
  v_token_bal    record;
  v_entry_price  bigint;
  v_stake_usdt   numeric(38, 18);
  v_end_time     timestamptz;
  v_trade        public.user_trades;
begin
  select global_trade_freeze, rate_limit_per_10s
  into v_config from public.app_config limit 1;

  if v_config.global_trade_freeze then
    raise exception 'TRADING_FROZEN' using hint = 'Trading is currently disabled.';
  end if;

  select id, symbol, is_enabled, base_price_cents, last_price_cents
  into v_token from public.tokens where id = p_token_id;

  if not found or not v_token.is_enabled then
    raise exception 'TOKEN_UNAVAILABLE' using hint = 'This token is not available for trading.';
  end if;

  if v_token.symbol in ('USDT', 'USDC') then
    raise exception 'STABLE_NOT_TRADEABLE' using hint = 'Stablecoins are not chartable.';
  end if;

  select id, decimals
  into v_usdt from public.tokens where symbol = 'USDT';

  if not found then
    raise exception 'USDT_TOKEN_MISSING' using hint = 'USDT token row is required.';
  end if;

  select id, duration_seconds, min_amount_cents, max_amount_cents, payout_bps, is_enabled
  into v_period from public.trade_periods where id = p_period_id;

  if not found or not v_period.is_enabled then
    raise exception 'PERIOD_UNAVAILABLE' using hint = 'This trade period is not available.';
  end if;

  if p_amount_cents < v_period.min_amount_cents or p_amount_cents > v_period.max_amount_cents then
    raise exception 'AMOUNT_OUT_OF_RANGE'
      using hint = 'Amount must be between min and max for this period.';
  end if;

  v_entry_price := coalesce(v_token.last_price_cents, v_token.base_price_cents);
  v_stake_usdt  := round(p_amount_cents::numeric / 100.0, 6);  -- 1 USDT = $1

  if v_stake_usdt <= 0 then
    raise exception 'STAKE_TOO_SMALL';
  end if;

  select balance, locked_balance into v_token_bal
  from public.user_token_balances
  where user_id = p_user_id and token_id = v_usdt.id
  for update;

  if not found or v_token_bal.balance < v_stake_usdt then
    raise exception 'INSUFFICIENT_USDT_BALANCE'
      using hint = 'Insufficient USDT balance to cover this trade stake.';
  end if;

  v_end_time := now() + (v_period.duration_seconds * interval '1 second');

  update public.user_token_balances
  set balance        = balance - v_stake_usdt,
      locked_balance = locked_balance + v_stake_usdt,
      updated_at     = now()
  where user_id = p_user_id and token_id = v_usdt.id;

  insert into public.user_trades (
    user_id, token_id, trade_period_id, direction,
    stake_cents, payout_bps, entry_price_cents, end_time, status,
    stake_token_amount, lock_price_usd_cents, lock_token_id
  )
  values (
    p_user_id, p_token_id, p_period_id, p_direction,
    p_amount_cents, v_period.payout_bps, v_entry_price, v_end_time, 'active',
    v_stake_usdt, 100, v_usdt.id
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
      'chart_token_id', p_token_id,
      'lock_token_id', v_usdt.id,
      'stake_usdt', v_stake_usdt::text
    )
  );

  return v_trade;
end;
$$;

-- 5. settle_trade — three-way path: USDT (new), chart-token (0027-era), USD-cents (pre-0027)
create or replace function public.settle_trade(
  p_trade_id uuid,
  p_outcome  public.trade_outcome,
  p_admin_id uuid,
  p_reason   text default null
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade        public.user_trades;
  v_balance      record;
  v_payout_cents bigint;
  v_delta_cents  bigint;
  v_payout_token numeric(38, 18);
  v_lock_token   uuid;
  v_memo         text;
begin
  select * into v_trade from public.user_trades where id = p_trade_id for update;
  if not found then
    raise exception 'TRADE_NOT_FOUND';
  end if;
  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_ACTIVE';
  end if;

  update public.user_trades
  set
    status             = 'settled',
    outcome            = p_outcome,
    settled_at         = now(),
    settled_by         = p_admin_id,
    settled_reason     = p_reason,
    strike_price_cents = coalesce(
      (select last_price_cents from public.tokens where id = v_trade.token_id),
      v_trade.entry_price_cents
    )
  where id = p_trade_id
  returning * into v_trade;

  v_lock_token := coalesce(v_trade.lock_token_id, v_trade.token_id);

  if v_trade.stake_token_amount is not null then
    -- Token-based settlement (USDT for new trades, chart token for 0027-era)
    if p_outcome = 'win' then
      v_payout_token := round(
        v_trade.stake_token_amount * (v_trade.payout_bps::numeric / 10000.0),
        18
      );
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          balance        = balance + v_payout_token,
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_lock_token;
      v_memo := 'Trade won — ' || v_payout_token::text || ' credited';
    elsif p_outcome = 'void' then
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          balance        = balance + v_trade.stake_token_amount,
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_lock_token;
      v_memo := 'Trade voided — stake refunded';
    else
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_lock_token;
      v_memo := 'Trade lost';
    end if;

    insert into public.transactions (
      user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
    )
    values (
      v_trade.user_id,
      case p_outcome when 'win' then 'trade_win'
                     when 'void' then 'trade_void'
                     else 'trade_lose' end,
      0,
      'user_trades', p_trade_id, v_memo,
      jsonb_build_object(
        'outcome', p_outcome::text,
        'lock_token_id', v_lock_token,
        'stake_amount', v_trade.stake_token_amount::text
      )
    );
  else
    -- LEGACY USD-cents settlement (pre-0027)
    select balance_cents, locked_in_trades_cents into v_balance
    from public.user_balances
    where user_id = v_trade.user_id
    for update;

    if p_outcome = 'win' then
      v_payout_cents := (v_trade.stake_cents * v_trade.payout_bps) / 10000;
      v_delta_cents  := v_trade.stake_cents + v_payout_cents;
      v_memo := 'Trade won (legacy USD)';
    elsif p_outcome = 'void' then
      v_delta_cents := v_trade.stake_cents;
      v_memo := 'Trade voided (legacy USD)';
    else
      v_delta_cents := 0;
      v_memo := 'Trade lost (legacy USD)';
    end if;

    update public.user_balances
    set locked_in_trades_cents = greatest(locked_in_trades_cents - v_trade.stake_cents, 0),
        balance_cents          = balance_cents + v_delta_cents,
        updated_at             = now()
    where user_id = v_trade.user_id;

    if v_delta_cents > 0 then
      insert into public.transactions (
        user_id, kind, amount_cents, balance_after_cents,
        reference_type, reference_id, memo
      )
      values (
        v_trade.user_id,
        case p_outcome when 'win' then 'trade_win' else 'trade_void' end,
        v_delta_cents, v_balance.balance_cents + v_delta_cents,
        'user_trades', p_trade_id, v_memo
      );
    end if;
  end if;

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

grant execute on function public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint, bigint) to authenticated;
