-- ---------------------------------------------------------------------------
-- Fix 0054: request_withdrawal must move amount FROM free balance INTO locked.
-- The original 0054 only credited locked_balance without debiting balance, so
-- the free column never dropped on submit.
--
-- This migration:
--   1. Replaces the four lifecycle RPCs with the corrected logic.
--   2. Reconciles existing pending withdrawals created via the buggy version
--      by debiting their amounts from balance (capped at zero), so future
--      approve/reject paths arrive at consistent totals.
-- ---------------------------------------------------------------------------

-- 1. Reconcile data drift from the buggy 0054.
update public.user_token_balances ub
set balance    = greatest(ub.balance - sub.total_pending, 0),
    updated_at = now()
from (
  select user_id, token_id, sum(amount) as total_pending
  from public.withdrawals
  where status = 'pending' and token_id is not null and amount is not null
  group by user_id, token_id
) sub
where ub.user_id = sub.user_id and ub.token_id = sub.token_id;

-- 2. Replace request_withdrawal: debit free balance, credit locked.
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
  v_token         record;
  v_token_bal     record;
  v_fee_bps       integer;
  v_fee           numeric(38, 18);
  v_net           numeric(38, 18);
  v_withdrawal    public.withdrawals;
  v_flags         public.withdrawal_flag[] := '{}';
  v_trade_vol     bigint;
  v_prev_count    integer;
  v_days_old      integer;
  v_primary_addr  text;
begin
  if p_destination_address is null or p_destination_address = '' then
    raise exception 'DEST_REQUIRED' using hint = 'Destination address is required.';
  end if;

  select id, symbol, decimals, min_withdrawal
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

  select address into v_primary_addr
  from public.user_primary_withdrawal_addresses
  where user_id = p_user_id
    and token_id = p_token_id
    and network = p_network;

  if v_primary_addr is null then
    raise exception 'PRIMARY_ADDRESS_NOT_SET'
      using hint = 'Bind a primary withdrawal address for this token and network first.';
  end if;

  if v_primary_addr <> p_destination_address then
    raise exception 'DEST_MISMATCH'
      using hint = 'Destination must match the bound primary address for this token.';
  end if;

  select balance, locked_balance into v_token_bal
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_token_id
  for update;

  if not found or v_token_bal.balance < p_amount then
    raise exception 'INSUFFICIENT_TOKEN_BALANCE';
  end if;

  select withdraw_fee_bps into v_fee_bps from public.app_config limit 1;
  v_fee := round(p_amount * coalesce(v_fee_bps, 0)::numeric / 10000.0,
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

  -- Move from free to locked. Total holdings unchanged; only available drops.
  update public.user_token_balances
  set balance        = balance - p_amount,
      locked_balance = locked_balance + p_amount,
      updated_at     = now()
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

  return v_withdrawal;
end;
$$;

-- 3. approve_withdrawal: drain locked permanently (free was debited at submit).
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

  if v_withdrawal.token_id is not null and v_withdrawal.amount is not null then
    update public.user_token_balances
    set locked_balance = greatest(locked_balance - v_withdrawal.amount, 0),
        updated_at     = now()
    where user_id = v_withdrawal.user_id and token_id = v_withdrawal.token_id;
  end if;

  update public.withdrawals
  set status      = 'approved',
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

-- 4. reject_withdrawal: restore free + clear lock (pending) or refund (approved).
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
  v_was_status public.withdrawal_status;
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

  v_was_status := v_withdrawal.status;

  if v_withdrawal.token_id is not null and v_withdrawal.amount is not null then
    if v_was_status = 'pending' then
      update public.user_token_balances
      set balance        = balance + v_withdrawal.amount,
          locked_balance = greatest(locked_balance - v_withdrawal.amount, 0),
          updated_at     = now()
      where user_id = v_withdrawal.user_id and token_id = v_withdrawal.token_id;
    else
      update public.user_token_balances
      set balance    = balance + v_withdrawal.amount,
          updated_at = now()
      where user_id = v_withdrawal.user_id and token_id = v_withdrawal.token_id;
    end if;
  end if;

  update public.withdrawals
  set status      = 'rejected',
      admin_note  = p_note,
      reviewed_by = p_admin_user_id,
      reviewed_at = now(),
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

-- 5. cancel_withdrawal: only valid while pending; restore free + clear lock.
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

  if v_withdrawal.token_id is not null and v_withdrawal.amount is not null then
    update public.user_token_balances
    set balance        = balance + v_withdrawal.amount,
        locked_balance = greatest(locked_balance - v_withdrawal.amount, 0),
        updated_at     = now()
    where user_id = p_user_id and token_id = v_withdrawal.token_id;
  end if;

  update public.withdrawals
  set status     = 'cancelled',
      updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return v_withdrawal;
end;
$$;
