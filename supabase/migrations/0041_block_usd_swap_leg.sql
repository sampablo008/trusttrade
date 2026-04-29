-- ---------------------------------------------------------------------------
-- Phase 1: harden execute_swap to reject any USD-leg calls.
--
-- The 0027 version of execute_swap accepted from_token_id = NULL or
-- to_token_id = NULL to indicate the legacy USD bonus pool as a swap side,
-- and read/wrote user_balances.balance_cents on that side. With USD removed
-- as a held currency, both sides must now be tokens.
--
-- Rather than rewrite the RPC, we wrap it: rejects the USD legs early and
-- delegates token↔token to the existing token-side logic in the prior
-- version. Keep the function signature unchanged so callers don't break.
-- ---------------------------------------------------------------------------

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
  v_from_token   record;
  v_to_token     record;
  v_fee_bps      integer;
  v_fee_amount   numeric(38, 18);
  v_net_amount   numeric(38, 18);
  v_to_amount    numeric(38, 18);
  v_to_decimals  smallint := 8;
  v_from_balance numeric(38, 18);
  v_swap         public.swaps;
begin
  if p_from_token_id is null or p_to_token_id is null then
    raise exception 'USD_SWAP_DISABLED'
      using hint = 'USD swaps are no longer supported. Both sides must be tokens.';
  end if;

  if p_from_token_id = p_to_token_id then
    raise exception 'SAME_SIDE' using hint = 'Cannot swap a token to itself.';
  end if;

  if p_from_amount is null or p_from_amount <= 0 then
    raise exception 'AMOUNT_INVALID' using hint = 'Swap amount must be positive.';
  end if;

  if p_from_price_usd_cents <= 0 or p_to_price_usd_cents <= 0 then
    raise exception 'PRICE_INVALID' using hint = 'Live prices unavailable for swap.';
  end if;

  select id, symbol, swap_fee_bps into v_from_token
  from public.tokens where id = p_from_token_id;
  if not found then
    raise exception 'FROM_TOKEN_NOT_FOUND';
  end if;

  select id, symbol, decimals into v_to_token
  from public.tokens where id = p_to_token_id;
  if not found then
    raise exception 'TO_TOKEN_NOT_FOUND';
  end if;

  v_fee_bps     := coalesce(v_from_token.swap_fee_bps, 0);
  v_to_decimals := coalesce(v_to_token.decimals, 8);

  v_fee_amount := round((p_from_amount * v_fee_bps) / 10000.0, 18);
  v_net_amount := p_from_amount - v_fee_amount;
  if v_net_amount <= 0 then
    raise exception 'AMOUNT_BELOW_FEE';
  end if;

  v_to_amount := round(
    (v_net_amount * p_from_price_usd_cents::numeric) / p_to_price_usd_cents::numeric,
    least(v_to_decimals::integer, 18)
  );
  if v_to_amount <= 0 then
    raise exception 'AMOUNT_TOO_SMALL';
  end if;

  -- Debit the from-token balance.
  select balance into v_from_balance
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_from_token_id
  for update;

  if not found or v_from_balance < p_from_amount then
    raise exception 'INSUFFICIENT_TOKEN_BALANCE'
      using hint = 'Insufficient ' || v_from_token.symbol || ' balance.';
  end if;

  update public.user_token_balances
  set balance    = balance - p_from_amount,
      updated_at = now()
  where user_id = p_user_id and token_id = p_from_token_id;

  -- Credit the to-token balance.
  insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
  values (p_user_id, p_to_token_id, v_to_amount, 0)
  on conflict (user_id, token_id) do update
    set balance    = public.user_token_balances.balance + excluded.balance,
        updated_at = now();

  -- Record the swap.
  insert into public.swaps (
    user_id,
    from_token_id, from_symbol, from_amount,
    to_token_id, to_symbol, to_amount,
    fee_amount, fee_bps_applied,
    from_price_usd_cents, to_price_usd_cents
  ) values (
    p_user_id,
    p_from_token_id, v_from_token.symbol, p_from_amount,
    p_to_token_id, v_to_token.symbol, v_to_amount,
    v_fee_amount, v_fee_bps,
    p_from_price_usd_cents, p_to_price_usd_cents
  )
  returning * into v_swap;

  return v_swap;
end;
$$;
