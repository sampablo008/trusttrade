-- place_trade: debit balance, create active trade, log transaction
-- Called from /api/trades POST via service role
create or replace function public.place_trade(
  p_user_id uuid,
  p_token_id uuid,
  p_period_id uuid,
  p_direction public.trade_direction,
  p_amount_cents bigint
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_token record;
  v_period record;
  v_balance record;
  v_entry_price_cents bigint;
  v_end_time timestamptz;
  v_trade public.user_trades;
begin
  -- Load app config
  select global_trade_freeze, rate_limit_per_10s
  into v_config
  from public.app_config
  limit 1;

  if v_config.global_trade_freeze then
    raise exception 'TRADING_FROZEN' using hint = 'Trading is currently disabled.';
  end if;

  -- Validate token
  select id, symbol, is_enabled, base_price_cents, last_price_cents
  into v_token
  from public.tokens
  where id = p_token_id;

  if not found or not v_token.is_enabled then
    raise exception 'TOKEN_UNAVAILABLE' using hint = 'This token is not available for trading.';
  end if;

  -- Validate period
  select id, duration_seconds, min_amount_cents, max_amount_cents, payout_bps, is_enabled
  into v_period
  from public.trade_periods
  where id = p_period_id;

  if not found or not v_period.is_enabled then
    raise exception 'PERIOD_UNAVAILABLE' using hint = 'This trade period is not available.';
  end if;

  if p_amount_cents < v_period.min_amount_cents or p_amount_cents > v_period.max_amount_cents then
    raise exception 'AMOUNT_OUT_OF_RANGE'
      using hint = 'Amount must be between min and max for this period.';
  end if;

  -- Lock balance row and check funds
  select balance_cents, locked_in_trades_cents, locked_bonus_cents
  into v_balance
  from public.user_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'INTERNAL_ERROR' using hint = 'Balance record not found.';
  end if;

  if v_balance.balance_cents < p_amount_cents then
    raise exception 'INSUFFICIENT_FUNDS'
      using hint = 'Not enough balance to place this trade.';
  end if;

  -- Use last known price or fall back to base price
  v_entry_price_cents := coalesce(v_token.last_price_cents, v_token.base_price_cents);
  v_end_time := now() + (v_period.duration_seconds * interval '1 second');

  -- Debit balance, lock stake
  update public.user_balances
  set
    balance_cents = balance_cents - p_amount_cents,
    locked_in_trades_cents = locked_in_trades_cents + p_amount_cents,
    updated_at = now()
  where user_id = p_user_id;

  -- Insert active trade
  insert into public.user_trades (
    user_id, token_id, period_id, direction,
    stake_cents, payout_bps, entry_price_cents, end_time, status
  )
  values (
    p_user_id, p_token_id, p_period_id, p_direction,
    p_amount_cents, v_period.payout_bps, v_entry_price_cents, v_end_time, 'active'
  )
  returning * into v_trade;

  -- Log the transaction
  insert into public.transactions (
    user_id, kind, amount_cents, balance_after_cents,
    reference_type, reference_id, memo
  )
  values (
    p_user_id, 'trade_debit', -p_amount_cents,
    v_balance.balance_cents - p_amount_cents,
    'user_trades', v_trade.id,
    'Trade placed: ' || v_token.symbol || ' ' || p_direction::text
  );

  return v_trade;
end;
$$;

-- apply_wager_progress: advance bonus ticket wager progress on each stake
-- Called from place_trade after the trade insert
create or replace function public.apply_wager_progress(
  p_user_id uuid,
  p_stake_cents bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_remaining bigint;
  v_apply bigint;
  v_leftover bigint := p_stake_cents;
begin
  -- Walk open tickets oldest-first, FIFO fill
  for v_ticket in
    select id, amount_cents, wager_required_cents, wager_progress_cents
    from public.bonus_tickets
    where user_id = p_user_id
      and status = 'locked'
    order by created_at asc
    for update
  loop
    if v_leftover <= 0 then
      exit;
    end if;

    v_remaining := v_ticket.wager_required_cents - v_ticket.wager_progress_cents;
    v_apply := least(v_leftover, v_remaining);
    v_leftover := v_leftover - v_apply;

    update public.bonus_tickets
    set
      wager_progress_cents = wager_progress_cents + v_apply,
      status = case
        when wager_progress_cents + v_apply >= wager_required_cents then 'released'
        else 'locked'
      end,
      released_at = case
        when wager_progress_cents + v_apply >= wager_required_cents then now()
        else null
      end,
      updated_at = now()
    where id = v_ticket.id;

    -- If just released, unlock the bonus from balance
    if v_ticket.wager_progress_cents + v_apply >= v_ticket.wager_required_cents then
      update public.user_balances
      set
        locked_bonus_cents = greatest(locked_bonus_cents - v_ticket.amount_cents, 0),
        updated_at = now()
      where user_id = p_user_id;
    end if;
  end loop;
end;
$$;
