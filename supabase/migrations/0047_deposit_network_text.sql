-- ---------------------------------------------------------------------------
-- Drop the deposit_network enum in favour of free-form text. Admin-managed
-- wallet_addresses already store the network as text, so any new network
-- (TON, SOL, ETH, …) added there must be accepted by submit_deposit without
-- a schema change.
-- ---------------------------------------------------------------------------

drop function if exists public.submit_deposit(uuid, uuid, public.deposit_network, numeric, text, text);
drop function if exists public.submit_deposit(uuid, uuid, public.deposit_network, bigint, text, text);

alter table public.deposits
  alter column network type text using network::text;

drop type if exists public.deposit_network;

create or replace function public.submit_deposit(
  p_user_id    uuid,
  p_token_id   uuid,
  p_network    text,
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

  if p_network is null or btrim(p_network) = '' then
    raise exception 'WALLET_DISABLED'
      using hint = 'Network is required.';
  end if;

  select id
  into v_wallet_id
  from public.wallet_addresses
  where token_symbol = v_token.symbol
    and network = p_network
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
