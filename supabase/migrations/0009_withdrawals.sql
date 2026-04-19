-- ---------------------------------------------------------------------------
-- Sprint 4 — Withdrawals: withdrawals table + full lifecycle functions
-- ---------------------------------------------------------------------------

create type public.withdrawal_status as enum (
  'pending',    -- user submitted, admin review needed
  'approved',   -- admin approved, awaiting payment
  'paid',       -- admin marked as paid with tx hash
  'rejected',   -- admin rejected, balance refunded
  'cancelled'   -- user cancelled while pending
);

create type public.withdrawal_flag as enum (
  'NEW_USER',
  'LOW_TRADE_VOLUME',
  'ADDRESS_REUSE',
  'RAPID',
  'POST_BONUS',
  'FIRST_WITHDRAW'
);

-- ---------------------------------------------------------------------------
-- withdrawals — user withdrawal requests (two-phase admin flow)
-- ---------------------------------------------------------------------------
create table public.withdrawals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (user_id) on delete restrict,
  amount_cents        bigint not null check (amount_cents > 0),
  fee_cents           bigint not null default 0 check (fee_cents >= 0),
  net_amount_cents    bigint not null check (net_amount_cents >= 0),
  token_symbol        text not null,
  network             text not null,
  destination_address text not null,
  status              public.withdrawal_status not null default 'pending',
  flags               public.withdrawal_flag[] not null default '{}',
  admin_note          text,
  payout_tx_hash      text,
  reviewed_by         uuid references public.profiles (user_id) on delete set null,
  reviewed_at         timestamptz,
  paid_by             uuid references public.profiles (user_id) on delete set null,
  paid_at             timestamptz,
  hold_tx_id          uuid references public.transactions (id) on delete set null,
  refund_tx_id        uuid references public.transactions (id) on delete set null,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  constraint withdrawals_net_lte_amount check (net_amount_cents <= amount_cents)
);

create index withdrawals_user_status_idx
  on public.withdrawals (user_id, status, created_at desc);
create index withdrawals_status_created_idx
  on public.withdrawals (status, created_at desc);

create trigger withdrawals_updated_at
  before update on public.withdrawals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- request_withdrawal: debit balance (hold), create pending withdrawal
-- ---------------------------------------------------------------------------
create or replace function public.request_withdrawal(
  p_user_id             uuid,
  p_amount_cents        bigint,
  p_token_symbol        text,
  p_network             text,
  p_destination_address text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config      record;
  v_balance     record;
  v_withdrawable bigint;
  v_fee         bigint;
  v_net         bigint;
  v_hold_tx     public.transactions;
  v_withdrawal  public.withdrawals;
  v_flags       public.withdrawal_flag[] := '{}';
  v_trade_vol   bigint;
  v_prev_count  integer;
  v_days_old    integer;
begin
  select withdraw_min_cents, withdraw_fee_cents
  into v_config
  from public.app_config limit 1;

  if p_destination_address is null or p_destination_address = '' then
    raise exception 'DEST_REQUIRED'
      using hint = 'Destination address is required.';
  end if;

  if p_amount_cents < v_config.withdraw_min_cents then
    raise exception 'BELOW_MIN_WITHDRAW'
      using hint = 'Amount is below the minimum withdrawal threshold.';
  end if;

  select balance_cents, locked_in_trades_cents, locked_bonus_cents
  into v_balance
  from public.user_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'INTERNAL_ERROR' using hint = 'Balance record not found.';
  end if;

  v_withdrawable := v_balance.balance_cents
                    - v_balance.locked_in_trades_cents
                    - v_balance.locked_bonus_cents;

  if p_amount_cents > v_withdrawable then
    raise exception 'INSUFFICIENT_WITHDRAWABLE'
      using hint = 'Requested amount exceeds withdrawable balance.';
  end if;

  v_fee := v_config.withdraw_fee_cents;
  if v_fee >= p_amount_cents then
    raise exception 'FEE_EXCEEDS_AMOUNT'
      using hint = 'Withdrawal fee equals or exceeds the requested amount.';
  end if;
  v_net := p_amount_cents - v_fee;

  -- ---- Auto-flag logic ----
  -- NEW_USER: account < 7 days old
  select extract(day from (now() - created_at))::integer
  into v_days_old
  from public.profiles where user_id = p_user_id;

  if v_days_old < 7 then
    v_flags := v_flags || 'NEW_USER'::public.withdrawal_flag;
  end if;

  -- LOW_TRADE_VOLUME: total settled stake < withdrawal amount
  select coalesce(sum(stake_cents), 0)
  into v_trade_vol
  from public.user_trades
  where user_id = p_user_id and status = 'settled';

  if v_trade_vol < p_amount_cents then
    v_flags := v_flags || 'LOW_TRADE_VOLUME'::public.withdrawal_flag;
  end if;

  -- ADDRESS_REUSE: another user has used the same address
  if exists (
    select 1 from public.withdrawals
    where destination_address = p_destination_address
      and user_id <> p_user_id
      and status in ('approved', 'paid')
    limit 1
  ) then
    v_flags := v_flags || 'ADDRESS_REUSE'::public.withdrawal_flag;
  end if;

  -- RAPID: user has another withdrawal in the last 24h
  if exists (
    select 1 from public.withdrawals
    where user_id = p_user_id
      and created_at > now() - interval '24 hours'
    limit 1
  ) then
    v_flags := v_flags || 'RAPID'::public.withdrawal_flag;
  end if;

  -- FIRST_WITHDRAW: this is their first withdrawal request
  select count(*)::integer into v_prev_count
  from public.withdrawals where user_id = p_user_id;

  if v_prev_count = 0 then
    v_flags := v_flags || 'FIRST_WITHDRAW'::public.withdrawal_flag;
  end if;

  -- POST_BONUS: user has released bonus tickets in the last 30 days
  if exists (
    select 1 from public.bonus_tickets
    where user_id = p_user_id
      and status = 'released'
      and released_at > now() - interval '30 days'
    limit 1
  ) then
    v_flags := v_flags || 'POST_BONUS'::public.withdrawal_flag;
  end if;

  -- Debit balance (hold)
  update public.user_balances
  set
    balance_cents = balance_cents - p_amount_cents,
    updated_at    = now()
  where user_id = p_user_id;

  -- Log hold transaction
  insert into public.transactions (
    user_id, kind, amount_cents, memo, reference_type
  )
  values (
    p_user_id,
    'withdrawal_hold',
    -p_amount_cents,
    'Withdrawal hold: ' || p_token_symbol || ' ' || p_network,
    'withdrawals'
  )
  returning * into v_hold_tx;

  -- Insert withdrawal record
  insert into public.withdrawals (
    user_id, amount_cents, fee_cents, net_amount_cents,
    token_symbol, network, destination_address,
    flags, hold_tx_id
  )
  values (
    p_user_id, p_amount_cents, v_fee, v_net,
    p_token_symbol, p_network, p_destination_address,
    v_flags, v_hold_tx.id
  )
  returning * into v_withdrawal;

  -- Back-fill the reference_id on the transaction
  update public.transactions
  set reference_id = v_withdrawal.id
  where id = v_hold_tx.id;

  return v_withdrawal;
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_withdrawal: phase 1 — admin approves, status → approved
-- ---------------------------------------------------------------------------
create or replace function public.approve_withdrawal(
  p_withdrawal_id uuid,
  p_admin_user_id uuid,
  p_note          text default null
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals;
begin
  select * into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Withdrawal not found.';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'NOT_PENDING' using hint = 'Withdrawal is not in pending state.';
  end if;

  update public.withdrawals
  set
    status      = 'approved',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    updated_at  = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (p_admin_user_id, 'approve_withdrawal', 'withdrawals', p_withdrawal_id, p_note);

  return v_withdrawal;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_withdrawal_paid: phase 2 — admin pastes tx hash → status → paid
-- ---------------------------------------------------------------------------
create or replace function public.mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_admin_user_id uuid,
  p_tx_hash       text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawals;
begin
  if p_tx_hash is null or p_tx_hash = '' then
    raise exception 'TX_HASH_REQUIRED' using hint = 'Transaction hash is required to mark as paid.';
  end if;

  select * into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Withdrawal not found.';
  end if;

  if v_withdrawal.status <> 'approved' then
    raise exception 'NOT_APPROVED' using hint = 'Withdrawal must be approved before marking paid.';
  end if;

  update public.withdrawals
  set
    status         = 'paid',
    payout_tx_hash = p_tx_hash,
    paid_by        = p_admin_user_id,
    paid_at        = now(),
    updated_at     = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id,
    after_state
  )
  values (
    p_admin_user_id, 'mark_withdrawal_paid', 'withdrawals', p_withdrawal_id,
    jsonb_build_object('tx_hash', p_tx_hash)
  );

  return v_withdrawal;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_withdrawal: refund held amount to user balance
-- ---------------------------------------------------------------------------
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
    raise exception 'NOT_REFUNDABLE' using hint = 'Withdrawal cannot be rejected in its current state.';
  end if;

  -- Refund the held balance
  update public.user_balances
  set
    balance_cents = balance_cents + v_withdrawal.amount_cents,
    updated_at    = now()
  where user_id = v_withdrawal.user_id;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo
  )
  values (
    v_withdrawal.user_id,
    'withdrawal_refund',
    v_withdrawal.amount_cents,
    'withdrawals',
    v_withdrawal.id,
    'Withdrawal rejected: ' || coalesce(p_note, 'No reason given')
  )
  returning * into v_refund_tx;

  update public.withdrawals
  set
    status      = 'rejected',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    refund_tx_id = v_refund_tx.id,
    updated_at  = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (p_admin_user_id, 'reject_withdrawal', 'withdrawals', p_withdrawal_id, p_note);

  return v_withdrawal;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_withdrawal: user cancels while still pending — refund hold
-- ---------------------------------------------------------------------------
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
  where id = p_withdrawal_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'NOT_FOUND' using hint = 'Withdrawal not found.';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'NOT_CANCELLABLE' using hint = 'Only pending withdrawals can be cancelled.';
  end if;

  -- Refund the held balance
  update public.user_balances
  set
    balance_cents = balance_cents + v_withdrawal.amount_cents,
    updated_at    = now()
  where user_id = p_user_id;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo
  )
  values (
    p_user_id,
    'withdrawal_refund',
    v_withdrawal.amount_cents,
    'withdrawals',
    v_withdrawal.id,
    'Withdrawal cancelled by user'
  )
  returning * into v_refund_tx;

  update public.withdrawals
  set
    status       = 'cancelled',
    refund_tx_id = v_refund_tx.id,
    updated_at   = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return v_withdrawal;
end;
$$;
