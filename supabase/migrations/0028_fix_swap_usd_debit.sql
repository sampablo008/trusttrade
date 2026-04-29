-- ---------------------------------------------------------------------------
-- Fix: execute_swap was debiting only ceil(from_amount) cents when swapping
-- FROM USD. Since p_from_amount is expressed in dollars for the USD side
-- (e.g. 196.02 USD), it must be multiplied by 100 to convert to cents
-- before debiting balance_cents. The previous code deducted only ~$1.97
-- regardless of swap size.
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
    -- USD (bonus pool) debit. p_from_amount is in DOLLARS — convert to cents.
    v_debit_usd_cents := ceil(p_from_amount * 100)::bigint;

    select balance_cents into v_usd_balance
    from public.user_balances where user_id = p_user_id for update;

    if v_usd_balance is null or v_usd_balance < v_debit_usd_cents then
      raise exception 'INSUFFICIENT_USD_BALANCE';
    end if;

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
