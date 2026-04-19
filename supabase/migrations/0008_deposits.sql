-- ---------------------------------------------------------------------------
-- Sprint 4 — Deposits: deposits table + submit/approve/reject functions
-- ---------------------------------------------------------------------------

create type public.deposit_status as enum ('pending', 'approved', 'rejected');
create type public.deposit_network as enum ('TRC20', 'ERC20', 'BEP20', 'BTC');

-- ---------------------------------------------------------------------------
-- deposits — user-submitted deposit claims
-- ---------------------------------------------------------------------------
create table public.deposits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (user_id) on delete restrict,
  token_id       uuid not null references public.tokens (id) on delete restrict,
  network        public.deposit_network not null,
  amount_cents   bigint not null check (amount_cents > 0),
  proof_path     text not null,
  tx_hash        text,
  status         public.deposit_status not null default 'pending',
  admin_note     text,
  reviewed_by    uuid references public.profiles (user_id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  constraint deposits_tx_hash_unique unique (tx_hash),
  constraint deposits_reviewed_consistency check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or
    (status in ('approved', 'rejected') and reviewed_at is not null)
  )
);

create index deposits_user_status_idx
  on public.deposits (user_id, status, created_at desc);
create index deposits_status_created_idx
  on public.deposits (status, created_at desc);
create index deposits_tx_hash_idx
  on public.deposits (tx_hash)
  where tx_hash is not null;

-- Patch referral_commissions to add FK now that deposits table exists
alter table public.referral_commissions
  add constraint referral_commissions_deposit_fk
  foreign key (deposit_id) references public.deposits (id) on delete set null;

create trigger deposits_updated_at
  before update on public.deposits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- submit_deposit: create a pending deposit record
-- ---------------------------------------------------------------------------
create or replace function public.submit_deposit(
  p_user_id    uuid,
  p_token_id   uuid,
  p_network    public.deposit_network,
  p_amount_cents bigint,
  p_proof_path text,
  p_tx_hash    text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet  record;
  v_deposit public.deposits;
begin
  -- Verify the wallet address is active for this token/network
  select id
  into v_wallet
  from public.wallet_addresses
  where token_id = p_token_id
    and network = p_network::text
    and is_enabled = true
  limit 1;

  if not found then
    raise exception 'WALLET_DISABLED'
      using hint = 'No active deposit address for this token and network.';
  end if;

  if p_amount_cents <= 0 then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount must be positive.';
  end if;

  if p_proof_path is null or p_proof_path = '' then
    raise exception 'PROOF_REQUIRED'
      using hint = 'Deposit proof screenshot is required.';
  end if;

  -- Dedup tx hash if provided
  if p_tx_hash is not null and p_tx_hash <> '' then
    if exists (select 1 from public.deposits where tx_hash = p_tx_hash) then
      raise exception 'DUPLICATE_TX_HASH'
        using hint = 'A deposit with this transaction hash already exists.';
    end if;
  end if;

  insert into public.deposits (
    user_id, token_id, network, amount_cents, proof_path, tx_hash
  )
  values (
    p_user_id, p_token_id, p_network, p_amount_cents,
    p_proof_path,
    case when p_tx_hash = '' then null else p_tx_hash end
  )
  returning * into v_deposit;

  return v_deposit;
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_deposit: credit balance, fire referral commissions
-- ---------------------------------------------------------------------------
create or replace function public.approve_deposit(
  p_deposit_id    uuid,
  p_admin_user_id uuid,
  p_note          text default null
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit public.deposits;
  v_config  record;
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

  -- Credit user balance
  update public.user_balances
  set
    balance_cents = balance_cents + v_deposit.amount_cents,
    updated_at    = now()
  where user_id = v_deposit.user_id;

  -- Log the credit transaction
  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo
  )
  values (
    v_deposit.user_id,
    'deposit_credit',
    v_deposit.amount_cents,
    'deposits',
    v_deposit.id,
    'Deposit approved'
  );

  -- Mark deposit approved
  update public.deposits
  set
    status      = 'approved',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    updated_at  = now()
  where id = p_deposit_id
  returning * into v_deposit;

  -- Fire referral commissions if deposit meets minimum threshold
  select ref_min_deposit_cents into v_config
  from public.app_config limit 1;

  if v_deposit.amount_cents >= v_config.ref_min_deposit_cents then
    perform public.record_deposit_commissions(
      v_deposit.user_id,
      v_deposit.id,
      v_deposit.amount_cents
    );
  end if;

  -- Log admin action
  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (
    p_admin_user_id, 'approve_deposit', 'deposits', p_deposit_id, p_note
  );

  return v_deposit;
end;
$$;

-- ---------------------------------------------------------------------------
-- reject_deposit: mark rejected, no balance change
-- ---------------------------------------------------------------------------
create or replace function public.reject_deposit(
  p_deposit_id    uuid,
  p_admin_user_id uuid,
  p_note          text
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit public.deposits;
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

  update public.deposits
  set
    status      = 'rejected',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    updated_at  = now()
  where id = p_deposit_id
  returning * into v_deposit;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (
    p_admin_user_id, 'reject_deposit', 'deposits', p_deposit_id, p_note
  );

  return v_deposit;
end;
$$;
