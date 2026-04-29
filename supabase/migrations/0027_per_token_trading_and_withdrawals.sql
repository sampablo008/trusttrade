-- ---------------------------------------------------------------------------
-- Per-token trade locks + per-token withdrawals
-- ---------------------------------------------------------------------------
-- Trades now lock the equivalent native-token amount of the staked USD from
-- user_token_balances.locked_balance. Settlement is token-pure: win returns
-- locked_tokens × (1 + payout_bps/10000) to free balance; lose forfeits;
-- void refunds. Withdrawals are now per-token in native units.
--
-- USD trading balance (user_balances.balance_cents) is kept ONLY as the
-- bonus pool (signup_bonus etc.), drainable via the swap engine. New trade
-- and withdrawal flows do not read or write balance_cents.
-- ---------------------------------------------------------------------------

-- 1. Per-token locked_balance for in-flight trade holds + active withdrawals
alter table public.user_token_balances
  add column if not exists locked_balance numeric(38, 18) not null default 0;

alter table public.user_token_balances
  add constraint user_token_balances_locked_non_negative check (locked_balance >= 0);

-- 2. user_trades extension for token-based stakes
alter table public.user_trades
  add column if not exists stake_token_amount numeric(38, 18),
  add column if not exists lock_price_usd_cents bigint;

create index if not exists user_trades_token_active_idx
  on public.user_trades (token_id, status)
  where status = 'active';

-- 3. Per-token withdrawal config
alter table public.tokens
  add column if not exists min_withdrawal numeric(38, 18) not null default 0,
  add column if not exists withdraw_fee_bps integer not null default 0;

alter table public.tokens
  add constraint tokens_min_withdrawal_non_negative check (min_withdrawal >= 0),
  add constraint tokens_withdraw_fee_range check (withdraw_fee_bps between 0 and 5000);

-- 4. withdrawals: add native amount + token reference
alter table public.withdrawals
  add column if not exists token_id uuid references public.tokens (id) on delete restrict,
  add column if not exists amount numeric(38, 18),
  add column if not exists fee_amount numeric(38, 18),
  add column if not exists net_amount numeric(38, 18);

alter table public.withdrawals
  alter column amount_cents drop not null,
  alter column net_amount_cents drop not null;

alter table public.withdrawals
  drop constraint if exists withdrawals_amount_cents_check,
  drop constraint if exists withdrawals_fee_cents_check,
  drop constraint if exists withdrawals_net_amount_cents_check,
  drop constraint if exists withdrawals_net_lte_amount;

alter table public.withdrawals
  add constraint withdrawals_native_or_legacy check (
    -- legacy USD row
    (token_id is null and amount is null and amount_cents is not null and amount_cents > 0
      and net_amount_cents is not null and net_amount_cents <= amount_cents)
    or
    -- new token-native row
    (token_id is not null and amount is not null and amount > 0
      and fee_amount is not null and fee_amount >= 0
      and net_amount is not null and net_amount > 0 and net_amount <= amount)
  );

-- 5. place_trade — token-based locking
drop function if exists public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint);

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
  v_lock_price   bigint;
  v_stake_token  numeric(38, 18);
  v_end_time     timestamptz;
  v_trade        public.user_trades;
begin
  select global_trade_freeze, rate_limit_per_10s
  into v_config from public.app_config limit 1;

  if v_config.global_trade_freeze then
    raise exception 'TRADING_FROZEN' using hint = 'Trading is currently disabled.';
  end if;

  select id, symbol, is_enabled, base_price_cents, last_price_cents, decimals
  into v_token from public.tokens where id = p_token_id;

  if not found or not v_token.is_enabled then
    raise exception 'TOKEN_UNAVAILABLE' using hint = 'This token is not available for trading.';
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
  v_lock_price  := coalesce(p_lock_price_usd_cents, v_entry_price);

  if v_lock_price is null or v_lock_price <= 0 then
    raise exception 'PRICE_UNAVAILABLE' using hint = 'No live price for trade lock.';
  end if;

  -- stake_token = stake_usd / lock_price_usd (both in cents → unit-cancels)
  v_stake_token := round(
    p_amount_cents::numeric / v_lock_price::numeric,
    least(coalesce(v_token.decimals, 8)::integer, 18)
  );

  if v_stake_token <= 0 then
    raise exception 'STAKE_TOO_SMALL' using hint = 'Stake rounds to zero in token units.';
  end if;

  -- Lock the user's token balance row
  select balance, locked_balance into v_token_bal
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_token_id
  for update;

  if not found or v_token_bal.balance < v_stake_token then
    raise exception 'INSUFFICIENT_TOKEN_BALANCE'
      using hint = 'Insufficient token balance to cover this trade stake.';
  end if;

  v_end_time := now() + (v_period.duration_seconds * interval '1 second');

  update public.user_token_balances
  set balance        = balance - v_stake_token,
      locked_balance = locked_balance + v_stake_token,
      updated_at     = now()
  where user_id = p_user_id and token_id = p_token_id;

  insert into public.user_trades (
    user_id, token_id, trade_period_id, direction,
    stake_cents, payout_bps, entry_price_cents, end_time, status,
    stake_token_amount, lock_price_usd_cents
  )
  values (
    p_user_id, p_token_id, p_period_id, p_direction,
    p_amount_cents, v_period.payout_bps, v_entry_price, v_end_time, 'active',
    v_stake_token, v_lock_price
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
      'token_id', p_token_id,
      'stake_token', v_stake_token::text,
      'lock_price_cents', v_lock_price
    )
  );

  return v_trade;
end;
$$;

-- 6. settle_trade — dual-path (token-based for new trades, USD for legacy)
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
  v_memo         text;
begin
  select * into v_trade from public.user_trades where id = p_trade_id for update;
  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'No trade with that ID.';
  end if;
  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_ACTIVE' using hint = 'Trade is already settled.';
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

  if v_trade.stake_token_amount is not null then
    -- TOKEN-BASED settlement (new flow)
    if p_outcome = 'win' then
      v_payout_token := round(
        v_trade.stake_token_amount * (v_trade.payout_bps::numeric / 10000.0),
        18
      );
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          balance        = balance + v_payout_token,
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_trade.token_id;
      v_memo := 'Trade won — ' || v_payout_token::text || ' tokens credited';
    elsif p_outcome = 'void' then
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          balance        = balance + v_trade.stake_token_amount,
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_trade.token_id;
      v_memo := 'Trade voided — stake refunded';
    else
      update public.user_token_balances
      set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
          updated_at     = now()
      where user_id = v_trade.user_id and token_id = v_trade.token_id;
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
        'token_id', v_trade.token_id,
        'stake_token', v_trade.stake_token_amount::text
      )
    );
  else
    -- LEGACY USD settlement (unchanged behavior for pre-migration trades)
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

-- 7. request_withdrawal — per-token version (replaces signature)
drop function if exists public.request_withdrawal(uuid, bigint, text, text, text);

create or replace function public.request_withdrawal(
  p_user_id             uuid,
  p_token_id            uuid,
  p_amount              numeric,
  p_network             text,
  p_destination_address text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token       record;
  v_token_bal   record;
  v_fee         numeric(38, 18);
  v_net         numeric(38, 18);
  v_withdrawal  public.withdrawals;
  v_flags       public.withdrawal_flag[] := '{}';
  v_trade_vol   bigint;
  v_prev_count  integer;
  v_days_old    integer;
begin
  if p_destination_address is null or p_destination_address = '' then
    raise exception 'DEST_REQUIRED' using hint = 'Destination address is required.';
  end if;

  select id, symbol, decimals, min_withdrawal, withdraw_fee_bps
  into v_token from public.tokens where id = p_token_id;

  if not found then
    raise exception 'TOKEN_NOT_FOUND';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'AMOUNT_INVALID';
  end if;

  if p_amount < coalesce(v_token.min_withdrawal, 0) then
    raise exception 'BELOW_MIN_WITHDRAW'
      using hint = 'Amount is below the minimum withdrawal for this token.';
  end if;

  select balance, locked_balance into v_token_bal
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_token_id
  for update;

  if not found or v_token_bal.balance < p_amount then
    raise exception 'INSUFFICIENT_TOKEN_BALANCE';
  end if;

  v_fee := round(p_amount * coalesce(v_token.withdraw_fee_bps, 0)::numeric / 10000.0,
                 least(coalesce(v_token.decimals, 8)::integer, 18));
  if v_fee >= p_amount then
    raise exception 'FEE_EXCEEDS_AMOUNT';
  end if;
  v_net := p_amount - v_fee;

  -- Auto-flags
  select extract(day from (now() - created_at))::integer into v_days_old
  from public.profiles where user_id = p_user_id;
  if v_days_old < 7 then
    v_flags := v_flags || 'NEW_USER'::public.withdrawal_flag;
  end if;

  select coalesce(sum(stake_cents), 0) into v_trade_vol
  from public.user_trades where user_id = p_user_id and status = 'settled';
  if v_trade_vol = 0 then
    v_flags := v_flags || 'LOW_TRADE_VOLUME'::public.withdrawal_flag;
  end if;

  if exists (
    select 1 from public.withdrawals
    where destination_address = p_destination_address
      and user_id <> p_user_id
      and status in ('approved', 'paid')
    limit 1
  ) then
    v_flags := v_flags || 'ADDRESS_REUSE'::public.withdrawal_flag;
  end if;

  if exists (
    select 1 from public.withdrawals
    where user_id = p_user_id
      and created_at > now() - interval '24 hours'
    limit 1
  ) then
    v_flags := v_flags || 'RAPID'::public.withdrawal_flag;
  end if;

  select count(*)::integer into v_prev_count
  from public.withdrawals where user_id = p_user_id;
  if v_prev_count = 0 then
    v_flags := v_flags || 'FIRST_WITHDRAW'::public.withdrawal_flag;
  end if;

  -- Hold token balance
  update public.user_token_balances
  set balance    = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id and token_id = p_token_id;

  insert into public.withdrawals (
    user_id, token_id, amount, fee_amount, net_amount,
    amount_cents, fee_cents, net_amount_cents,
    token_symbol, network, destination_address, flags
  )
  values (
    p_user_id, p_token_id, p_amount, v_fee, v_net,
    null, 0, null,
    v_token.symbol, p_network, p_destination_address, v_flags
  )
  returning * into v_withdrawal;

  insert into public.transactions (
    user_id, kind, amount_cents, memo, reference_type, reference_id, metadata
  )
  values (
    p_user_id, 'withdrawal_hold', 0,
    'Withdrawal hold: ' || v_token.symbol || ' ' || p_network,
    'withdrawals', v_withdrawal.id,
    jsonb_build_object('token_id', p_token_id, 'amount', p_amount::text)
  );

  return v_withdrawal;
end;
$$;

-- 8. reject_withdrawal — dual-path refund
create or replace function public.reject_withdrawal(
  p_withdrawal_id uuid,
  p_admin_user_id uuid,
  p_note          text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals;
  v_refund_tx  public.transactions;
begin
  select * into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Withdrawal not found.';
  end if;

  if v_withdrawal.status not in ('pending', 'approved') then
    raise exception 'NOT_REFUNDABLE'
      using hint = 'Withdrawal cannot be rejected in its current state.';
  end if;

  if v_withdrawal.token_id is not null then
    update public.user_token_balances
    set balance    = balance + v_withdrawal.amount,
        updated_at = now()
    where user_id = v_withdrawal.user_id and token_id = v_withdrawal.token_id;

    insert into public.transactions (
      user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
    )
    values (
      v_withdrawal.user_id, 'withdrawal_refund', 0,
      'withdrawals', v_withdrawal.id,
      'Withdrawal rejected: ' || coalesce(p_note, 'No reason given'),
      jsonb_build_object('token_id', v_withdrawal.token_id, 'amount', v_withdrawal.amount::text)
    )
    returning * into v_refund_tx;
  else
    update public.user_balances
    set balance_cents = balance_cents + v_withdrawal.amount_cents,
        updated_at    = now()
    where user_id = v_withdrawal.user_id;

    insert into public.transactions (
      user_id, kind, amount_cents, reference_type, reference_id, memo
    )
    values (
      v_withdrawal.user_id, 'withdrawal_refund',
      v_withdrawal.amount_cents,
      'withdrawals', v_withdrawal.id,
      'Withdrawal rejected: ' || coalesce(p_note, 'No reason given')
    )
    returning * into v_refund_tx;
  end if;

  update public.withdrawals
  set status       = 'rejected',
      admin_note   = p_note,
      reviewed_by  = p_admin_user_id,
      reviewed_at  = now(),
      refund_tx_id = v_refund_tx.id,
      updated_at   = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (p_admin_user_id, 'reject_withdrawal', 'withdrawals', p_withdrawal_id, p_note);

  return v_withdrawal;
end;
$$;

-- 9. cancel_withdrawal — dual-path refund
create or replace function public.cancel_withdrawal(
  p_withdrawal_id uuid,
  p_user_id       uuid
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals;
  v_refund_tx  public.transactions;
begin
  select * into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Withdrawal not found.';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'NOT_CANCELLABLE'
      using hint = 'Only pending withdrawals can be cancelled.';
  end if;

  if v_withdrawal.token_id is not null then
    update public.user_token_balances
    set balance    = balance + v_withdrawal.amount,
        updated_at = now()
    where user_id = p_user_id and token_id = v_withdrawal.token_id;

    insert into public.transactions (
      user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
    )
    values (
      p_user_id, 'withdrawal_refund', 0,
      'withdrawals', v_withdrawal.id,
      'Withdrawal cancelled by user',
      jsonb_build_object('token_id', v_withdrawal.token_id, 'amount', v_withdrawal.amount::text)
    )
    returning * into v_refund_tx;
  else
    update public.user_balances
    set balance_cents = balance_cents + v_withdrawal.amount_cents,
        updated_at    = now()
    where user_id = p_user_id;

    insert into public.transactions (
      user_id, kind, amount_cents, reference_type, reference_id, memo
    )
    values (
      p_user_id, 'withdrawal_refund', v_withdrawal.amount_cents,
      'withdrawals', v_withdrawal.id,
      'Withdrawal cancelled by user'
    )
    returning * into v_refund_tx;
  end if;

  update public.withdrawals
  set status       = 'cancelled',
      refund_tx_id = v_refund_tx.id,
      updated_at   = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return v_withdrawal;
end;
$$;

-- 10. Block to-USD swaps (no consumer with USD trading balance retired)
create or replace function public.execute_swap(
  p_user_id              uuid,
  p_from_token_id        uuid,
  p_to_token_id          uuid,
  p_from_amount          numeric,
  p_from_price_usd_cents bigint,
  p_to_price_usd_cents   bigint
)
returns public.swaps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_symbol     text;
  v_to_symbol       text;
  v_fee_bps         integer;
  v_fee_amount      numeric(38, 18);
  v_net_amount      numeric(38, 18);
  v_to_amount       numeric(38, 18);
  v_to_decimals     smallint := 8;
  v_from_balance    numeric(38, 18);
  v_usd_balance     bigint;
  v_swap            public.swaps;
  v_debit_usd_cents bigint;
begin
  if p_from_amount is null or p_from_amount <= 0 then
    raise exception 'AMOUNT_INVALID' using hint = 'Swap amount must be positive.';
  end if;

  if p_from_price_usd_cents <= 0 or p_to_price_usd_cents <= 0 then
    raise exception 'PRICE_INVALID' using hint = 'Live prices unavailable for swap.';
  end if;

  if p_to_token_id is null then
    raise exception 'TO_USD_DISABLED'
      using hint = 'Swapping into the USD bonus pool is disabled.';
  end if;

  if (p_from_token_id is not distinct from p_to_token_id) then
    raise exception 'SAME_SIDE' using hint = 'Cannot swap between identical sides.';
  end if;

  if p_from_token_id is null then
    v_from_symbol := 'USD';
    select coalesce(usd_swap_fee_bps, 0) into v_fee_bps
    from public.app_config limit 1;
  else
    select symbol, swap_fee_bps into v_from_symbol, v_fee_bps
    from public.tokens where id = p_from_token_id;
    if not found then
      raise exception 'FROM_TOKEN_NOT_FOUND';
    end if;
  end if;

  select symbol, decimals into v_to_symbol, v_to_decimals
  from public.tokens where id = p_to_token_id;
  if not found then
    raise exception 'TO_TOKEN_NOT_FOUND';
  end if;

  v_fee_amount := round((p_from_amount * v_fee_bps) / 10000.0, 18);
  v_net_amount := p_from_amount - v_fee_amount;
  if v_net_amount <= 0 then
    raise exception 'AMOUNT_BELOW_FEE';
  end if;

  v_to_amount := round(
    (v_net_amount * p_from_price_usd_cents::numeric) / p_to_price_usd_cents::numeric,
    least(coalesce(v_to_decimals, 8)::integer, 18)
  );
  if v_to_amount <= 0 then
    raise exception 'AMOUNT_TOO_SMALL';
  end if;

  if p_from_token_id is null then
    -- USD (bonus pool) debit
    v_debit_usd_cents := ceil(p_from_amount)::bigint;
    select balance_cents into v_usd_balance
    from public.user_balances where user_id = p_user_id for update;

    if v_usd_balance is null or v_usd_balance < v_debit_usd_cents then
      raise exception 'INSUFFICIENT_USD_BALANCE';
    end if;

    -- Drain balance + clamp bonus tracking proportionally
    update public.user_balances
    set balance_cents      = balance_cents - v_debit_usd_cents,
        locked_bonus_cents = least(locked_bonus_cents, balance_cents - v_debit_usd_cents),
        updated_at         = now()
    where user_id = p_user_id;
  else
    select balance into v_from_balance
    from public.user_token_balances
    where user_id = p_user_id and token_id = p_from_token_id
    for update;

    if v_from_balance is null or v_from_balance < p_from_amount then
      raise exception 'INSUFFICIENT_TOKEN_BALANCE';
    end if;

    update public.user_token_balances
    set balance    = balance - p_from_amount,
        updated_at = now()
    where user_id = p_user_id and token_id = p_from_token_id;
  end if;

  insert into public.user_token_balances (user_id, token_id, balance)
  values (p_user_id, p_to_token_id, v_to_amount)
  on conflict (user_id, token_id)
  do update set balance    = public.user_token_balances.balance + excluded.balance,
                updated_at = now();

  insert into public.swaps (
    user_id, from_token_id, from_symbol, to_token_id, to_symbol,
    from_amount, fee_amount, to_amount, fee_bps_applied,
    from_price_usd_cents, to_price_usd_cents
  )
  values (
    p_user_id, p_from_token_id, v_from_symbol, p_to_token_id, v_to_symbol,
    p_from_amount, v_fee_amount, v_to_amount, v_fee_bps,
    p_from_price_usd_cents, p_to_price_usd_cents
  )
  returning * into v_swap;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  )
  values (
    p_user_id, 'swap',
    case when p_from_token_id is null then -v_debit_usd_cents else 0 end,
    'swaps', v_swap.id,
    format('Swap %s -> %s', v_from_symbol, v_to_symbol),
    jsonb_build_object(
      'from_amount', p_from_amount::text,
      'to_amount',   v_to_amount::text,
      'fee_amount',  v_fee_amount::text,
      'fee_bps',     v_fee_bps
    )
  );

  return v_swap;
end;
$$;

grant execute on function public.execute_swap(uuid, uuid, uuid, numeric, bigint, bigint) to authenticated;
grant execute on function public.place_trade(uuid, uuid, uuid, public.trade_direction, bigint, bigint) to authenticated;
