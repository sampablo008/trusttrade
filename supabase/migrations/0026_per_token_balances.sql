-- ---------------------------------------------------------------------------
-- Per-token balances + token-native deposits + swap engine
-- ---------------------------------------------------------------------------
-- Switches deposits and user wallet balances from a single USD figure to
-- per-token native amounts. Adds a swap engine so users can convert between
-- tokens (and between any token and the USD trading balance which still backs
-- the trade flow). The existing user_balances.balance_cents column is kept as
-- the USD trading balance and zeroed out as part of this migration.
-- ---------------------------------------------------------------------------

-- 1. Extend tokens with per-token deposit/swap config -------------------------
alter table public.tokens
  add column if not exists decimals smallint not null default 8,
  add column if not exists min_deposit numeric(38, 18) not null default 0,
  add column if not exists swap_fee_bps integer not null default 100,
  add column if not exists coingecko_id text;

alter table public.tokens
  add constraint tokens_decimals_range check (decimals between 0 and 30),
  add constraint tokens_min_deposit_non_negative check (min_deposit >= 0),
  add constraint tokens_swap_fee_range check (swap_fee_bps between 0 and 5000);

-- Seed sane defaults for known coins
update public.tokens set decimals = 8,  coingecko_id = 'bitcoin'        where symbol = 'BTC'  and coingecko_id is null;
update public.tokens set decimals = 18, coingecko_id = 'ethereum'       where symbol = 'ETH'  and coingecko_id is null;
update public.tokens set decimals = 18, coingecko_id = 'binancecoin'    where symbol = 'BNB'  and coingecko_id is null;
update public.tokens set decimals = 6,  coingecko_id = 'ripple'         where symbol = 'XRP'  and coingecko_id is null;
update public.tokens set decimals = 9,  coingecko_id = 'solana'         where symbol = 'SOL'  and coingecko_id is null;
update public.tokens set decimals = 8,  coingecko_id = 'dogecoin'       where symbol = 'DOGE' and coingecko_id is null;
update public.tokens set decimals = 6,  coingecko_id = 'cardano'        where symbol = 'ADA'  and coingecko_id is null;
update public.tokens set decimals = 18, coingecko_id = 'avalanche-2'    where symbol = 'AVAX' and coingecko_id is null;
update public.tokens set decimals = 18, coingecko_id = 'chainlink'      where symbol = 'LINK' and coingecko_id is null;
update public.tokens set decimals = 9,  coingecko_id = 'the-open-network' where symbol = 'TON' and coingecko_id is null;
update public.tokens set decimals = 6,  coingecko_id = 'tether'         where symbol = 'USDT' and coingecko_id is null;
update public.tokens set decimals = 6,  coingecko_id = 'usd-coin'       where symbol = 'USDC' and coingecko_id is null;

-- 2. user_token_balances ------------------------------------------------------
create table public.user_token_balances (
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  token_id   uuid not null references public.tokens (id) on delete restrict,
  balance    numeric(38, 18) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, token_id),
  constraint user_token_balances_non_negative check (balance >= 0)
);

create index user_token_balances_token_idx
  on public.user_token_balances (token_id);

create trigger user_token_balances_set_updated_at
  before update on public.user_token_balances
  for each row execute function public.set_updated_at();

alter table public.user_token_balances enable row level security;

create policy "user_token_balances_select_own_or_admin"
  on public.user_token_balances
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- 3. swaps --------------------------------------------------------------------
-- One side of a swap can be USD (the trading balance); we represent that by
-- nulling the corresponding token_id and using a *_symbol = 'USD' marker.
create table public.swaps (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (user_id) on delete restrict,
  from_token_id   uuid references public.tokens (id) on delete restrict,
  from_symbol     text not null,
  to_token_id     uuid references public.tokens (id) on delete restrict,
  to_symbol       text not null,
  from_amount     numeric(38, 18) not null,
  fee_amount      numeric(38, 18) not null,
  to_amount       numeric(38, 18) not null,
  fee_bps_applied integer not null,
  from_price_usd_cents bigint not null,
  to_price_usd_cents   bigint not null,
  created_at      timestamptz not null default timezone('utc', now()),
  constraint swaps_from_amount_positive check (from_amount > 0),
  constraint swaps_fee_non_negative check (fee_amount >= 0),
  constraint swaps_to_amount_positive check (to_amount > 0),
  constraint swaps_distinct_sides check (from_symbol <> to_symbol)
);

create index swaps_user_created_idx
  on public.swaps (user_id, created_at desc);

alter table public.swaps enable row level security;

create policy "swaps_select_own_or_admin"
  on public.swaps
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- 4. Extend deposits with native amount --------------------------------------
-- amount is the new authoritative field for new deposits; amount_cents is kept
-- so legacy approved rows still display correctly.
alter table public.deposits
  add column if not exists amount numeric(38, 18);

alter table public.deposits
  alter column amount_cents drop not null;

-- Drop the old positivity constraint on amount_cents now that it can be null
alter table public.deposits
  drop constraint if exists deposits_amount_cents_check;

-- Backfill amount for rows that already exist (legacy USD-denominated rows
-- treat amount_cents as the figure; we leave amount NULL to mark them legacy).
-- New deposits will always populate amount.

-- 5. App config: USD swap fee (when swapping FROM the USD trading balance) ---
alter table public.app_config
  add column if not exists usd_swap_fee_bps integer not null default 0;

alter table public.app_config
  add constraint app_config_usd_swap_fee_range check (usd_swap_fee_bps between 0 and 5000);

-- 6. Wipe USD trading balances (per refactor decision) -----------------------
-- Locked-in-trade and locked-bonus amounts are intentionally preserved so any
-- in-flight trade still settles correctly.
update public.user_balances set balance_cents = 0;

-- 7. submit_deposit — native amount + min validation -------------------------
drop function if exists public.submit_deposit(uuid, uuid, public.deposit_network, bigint, text, text);

create or replace function public.submit_deposit(
  p_user_id    uuid,
  p_token_id   uuid,
  p_network    public.deposit_network,
  p_amount     numeric,
  p_proof_path text,
  p_tx_hash    text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token       record;
  v_wallet_id   uuid;
  v_deposit     public.deposits;
begin
  select id, symbol, min_deposit
  into v_token
  from public.tokens
  where id = p_token_id;

  if not found then
    raise exception 'TOKEN_NOT_FOUND'
      using hint = 'Token id does not exist.';
  end if;

  select id
  into v_wallet_id
  from public.wallet_addresses
  where token_symbol = v_token.symbol
    and network = p_network::text
    and is_enabled = true
  limit 1;

  if not found then
    raise exception 'WALLET_DISABLED'
      using hint = 'No active deposit address for this token and network.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount must be positive.';
  end if;

  if p_amount < coalesce(v_token.min_deposit, 0) then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount is below the minimum for this token.';
  end if;

  if p_proof_path is null or p_proof_path = '' then
    raise exception 'PROOF_REQUIRED'
      using hint = 'Deposit proof screenshot is required.';
  end if;

  if p_tx_hash is not null and p_tx_hash <> '' then
    if exists (select 1 from public.deposits where tx_hash = p_tx_hash) then
      raise exception 'DUPLICATE_TX_HASH'
        using hint = 'A deposit with this transaction hash already exists.';
    end if;
  end if;

  insert into public.deposits (
    user_id, token_id, network, amount, amount_cents, proof_path, tx_hash
  )
  values (
    p_user_id, p_token_id, p_network, p_amount, 0,
    p_proof_path,
    case when p_tx_hash = '' then null else p_tx_hash end
  )
  returning * into v_deposit;

  return v_deposit;
end;
$$;

-- 8. approve_deposit — credit per-token balance, fire commissions on USD value
drop function if exists public.approve_deposit(uuid, uuid, text, bigint);

create or replace function public.approve_deposit(
  p_deposit_id      uuid,
  p_admin_user_id   uuid,
  p_note            text default null,
  p_amount          numeric default null,
  p_usd_value_cents bigint  default 0
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit  public.deposits;
  v_amount   numeric(38, 18);
  v_min_dep  bigint;
begin
  select * into v_deposit
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'DEPOSIT_NOT_FOUND'
      using hint = 'Deposit record does not exist.';
  end if;

  if v_deposit.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED'
      using hint = 'This deposit has already been reviewed.';
  end if;

  v_amount := coalesce(p_amount, v_deposit.amount);

  if v_amount is null or v_amount <= 0 then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount must be positive.';
  end if;

  if v_amount <> coalesce(v_deposit.amount, 0) then
    update public.deposits
    set amount     = v_amount,
        updated_at = now()
    where id = p_deposit_id;
  end if;

  insert into public.user_token_balances (user_id, token_id, balance)
  values (v_deposit.user_id, v_deposit.token_id, v_amount)
  on conflict (user_id, token_id)
  do update set balance = public.user_token_balances.balance + excluded.balance,
                updated_at = now();

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  )
  values (
    v_deposit.user_id,
    'deposit_credit',
    coalesce(p_usd_value_cents, 0),
    'deposits',
    v_deposit.id,
    'Deposit approved',
    jsonb_build_object('token_id', v_deposit.token_id, 'native_amount', v_amount::text)
  );

  update public.deposits
  set
    status      = 'approved',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    updated_at  = now()
  where id = p_deposit_id
  returning * into v_deposit;

  select coalesce(ref_min_deposit_cents, 1000) into v_min_dep
  from public.app_config limit 1;

  if coalesce(p_usd_value_cents, 0) >= v_min_dep then
    perform public.record_deposit_commissions(
      v_deposit.user_id,
      v_deposit.id,
      p_usd_value_cents
    );
  end if;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (
    p_admin_user_id, 'approve_deposit', 'deposits', p_deposit_id, p_note
  );

  return v_deposit;
end;
$$;

-- 9. execute_swap — atomic swap between any two of (token, USD trading bal) --
create or replace function public.execute_swap(
  p_user_id              uuid,
  p_from_token_id        uuid,           -- null when from = USD trading balance
  p_to_token_id          uuid,           -- null when to   = USD trading balance
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
  v_to_decimals     smallint := 2;
  v_from_balance    numeric(38, 18);
  v_usd_balance     bigint;
  v_swap            public.swaps;
  v_debit_usd_cents bigint;
  v_credit_usd_cents bigint;
begin
  if p_from_amount is null or p_from_amount <= 0 then
    raise exception 'AMOUNT_INVALID' using hint = 'Swap amount must be positive.';
  end if;

  if p_from_price_usd_cents <= 0 or p_to_price_usd_cents <= 0 then
    raise exception 'PRICE_INVALID' using hint = 'Live prices unavailable for swap.';
  end if;

  if (p_from_token_id is null and p_to_token_id is null)
     or (p_from_token_id is not distinct from p_to_token_id) then
    raise exception 'SAME_SIDE' using hint = 'Cannot swap between identical sides.';
  end if;

  -- Resolve symbols + fee
  if p_from_token_id is null then
    v_from_symbol := 'USD';
    select coalesce(usd_swap_fee_bps, 0) into v_fee_bps from public.app_config limit 1;
  else
    select symbol, swap_fee_bps into v_from_symbol, v_fee_bps
    from public.tokens where id = p_from_token_id;
    if not found then
      raise exception 'FROM_TOKEN_NOT_FOUND';
    end if;
  end if;

  if p_to_token_id is null then
    v_to_symbol := 'USD';
    v_to_decimals := 2;
  else
    select symbol, decimals into v_to_symbol, v_to_decimals
    from public.tokens where id = p_to_token_id;
    if not found then
      raise exception 'TO_TOKEN_NOT_FOUND';
    end if;
  end if;

  -- Compute fee + converted amount
  v_fee_amount := round((p_from_amount * v_fee_bps) / 10000.0, 18);
  v_net_amount := p_from_amount - v_fee_amount;
  if v_net_amount <= 0 then
    raise exception 'AMOUNT_BELOW_FEE' using hint = 'Swap amount does not cover the fee.';
  end if;

  v_to_amount := round(
    (v_net_amount * p_from_price_usd_cents::numeric) / p_to_price_usd_cents::numeric,
    v_to_decimals
  );
  if v_to_amount <= 0 then
    raise exception 'AMOUNT_TOO_SMALL' using hint = 'Swap result rounds to zero. Increase amount.';
  end if;

  -- Debit FROM side
  if p_from_token_id is null then
    -- USD debit (trading balance)
    v_debit_usd_cents := ceil(p_from_amount)::bigint;
    select balance_cents into v_usd_balance
    from public.user_balances
    where user_id = p_user_id
    for update;

    if v_usd_balance is null or v_usd_balance < v_debit_usd_cents then
      raise exception 'INSUFFICIENT_USD_BALANCE';
    end if;

    update public.user_balances
    set balance_cents = balance_cents - v_debit_usd_cents,
        updated_at    = now()
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

  -- Credit TO side
  if p_to_token_id is null then
    v_credit_usd_cents := floor(v_to_amount)::bigint;
    if v_credit_usd_cents <= 0 then
      raise exception 'AMOUNT_TOO_SMALL' using hint = 'Swap result rounds to zero USD cents.';
    end if;
    update public.user_balances
    set balance_cents = balance_cents + v_credit_usd_cents,
        updated_at    = now()
    where user_id = p_user_id;
  else
    insert into public.user_token_balances (user_id, token_id, balance)
    values (p_user_id, p_to_token_id, v_to_amount)
    on conflict (user_id, token_id)
    do update set balance    = public.user_token_balances.balance + excluded.balance,
                  updated_at = now();
  end if;

  -- Record the swap
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
    p_user_id,
    'swap',
    case when p_from_token_id is null then -v_debit_usd_cents
         when p_to_token_id is null then v_credit_usd_cents
         else 0 end,
    'swaps',
    v_swap.id,
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
