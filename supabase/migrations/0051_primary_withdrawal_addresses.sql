-- ---------------------------------------------------------------------------
-- Per-token primary withdrawal addresses
-- ---------------------------------------------------------------------------
-- A user binds a primary destination address per (token, network). Once set,
-- request_withdrawal enforces the destination matches. Setting / changing /
-- removing the binding is gated by the withdrawal PIN at the service layer.
-- ---------------------------------------------------------------------------

create table public.user_primary_withdrawal_addresses (
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  token_id   uuid not null references public.tokens (id) on delete cascade,
  network    text not null,
  address    text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, token_id, network),
  constraint user_primary_addr_address_nonempty check (length(btrim(address)) >= 8),
  constraint user_primary_addr_network_nonempty check (length(btrim(network)) > 0)
);

create index user_primary_withdrawal_addresses_user_idx
  on public.user_primary_withdrawal_addresses (user_id);

create trigger user_primary_withdrawal_addresses_set_updated_at
  before update on public.user_primary_withdrawal_addresses
  for each row execute function public.set_updated_at();

alter table public.user_primary_withdrawal_addresses enable row level security;

-- All access is via service role through the API. No client policies.

-- ---------------------------------------------------------------------------
-- request_withdrawal: enforce primary address match for (user, token, network)
-- ---------------------------------------------------------------------------
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

  -- Primary address binding: required for this (user, token, network) and
  -- the destination must match it exactly.
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

  return v_withdrawal;
end;
$$;
