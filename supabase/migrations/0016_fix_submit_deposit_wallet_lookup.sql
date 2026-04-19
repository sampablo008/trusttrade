-- wallet_addresses uses token_symbol, not token_id.
-- Resolve the symbol from tokens and match on that column.
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
  v_token_symbol text;
  v_wallet  record;
  v_deposit public.deposits;
begin
  select symbol
  into v_token_symbol
  from public.tokens
  where id = p_token_id;

  if not found then
    raise exception 'TOKEN_NOT_FOUND'
      using hint = 'Token id does not exist.';
  end if;

  select id
  into v_wallet
  from public.wallet_addresses
  where token_symbol = v_token_symbol
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
