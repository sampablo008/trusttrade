-- ---------------------------------------------------------------------------
-- Admin RPC for adjusting a user's per-token balance.
--
-- The legacy admin "adjust balance" path operates on user_balances.balance_cents
-- (USD-cent balance). Now that trading is per-token (migration 0026+), admins
-- need a way to credit/debit a specific token in user_token_balances.
--
-- This function:
--   1. Validates token + delta + non-empty note.
--   2. Atomically upserts user_token_balances (locks if exists, fails if a
--      negative delta would push balance below zero).
--   3. Inserts a transactions row (kind = admin_credit / admin_debit) with
--      the token amount in metadata. amount_cents is left at 0 because this
--      adjustment isn't denominated in USD.
--   4. Inserts an admin_actions audit row.
-- ---------------------------------------------------------------------------

create or replace function public.admin_adjust_token_balance(
  p_user_id   uuid,
  p_token_id  uuid,
  p_delta     numeric,
  p_note      text,
  p_admin_id  uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token       record;
  v_current     numeric(38, 18);
  v_new_balance numeric(38, 18);
begin
  if p_delta = 0 then
    raise exception 'DELTA_ZERO' using hint = 'Delta must be non-zero.';
  end if;

  if p_note is null or length(trim(p_note)) < 3 then
    raise exception 'NOTE_REQUIRED' using hint = 'A reason note is required.';
  end if;

  select id, symbol into v_token from public.tokens where id = p_token_id;
  if not found then
    raise exception 'TOKEN_NOT_FOUND' using hint = 'Token does not exist.';
  end if;

  -- Lock the user's row (or insert a zero row to lock against).
  insert into public.user_token_balances (user_id, token_id, balance)
  values (p_user_id, p_token_id, 0)
  on conflict (user_id, token_id) do nothing;

  select balance into v_current
  from public.user_token_balances
  where user_id = p_user_id and token_id = p_token_id
  for update;

  v_new_balance := coalesce(v_current, 0) + p_delta;

  if v_new_balance < 0 then
    raise exception 'NEGATIVE_BALANCE'
      using hint = 'Adjustment would make the token balance negative.';
  end if;

  update public.user_token_balances
  set balance    = v_new_balance,
      updated_at = now()
  where user_id = p_user_id and token_id = p_token_id;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, memo, metadata
  )
  values (
    p_user_id,
    case when p_delta >= 0 then 'admin_credit' else 'admin_debit' end,
    0,
    'admin_adjustment',
    p_note,
    jsonb_build_object(
      'token_id',     p_token_id,
      'token_symbol', v_token.symbol,
      'delta',        p_delta::text,
      'new_balance',  v_new_balance::text
    )
  );

  insert into public.admin_actions (
    action_type, admin_user_id, target_id, target_type, note, after_state
  )
  values (
    'adjust_token_balance',
    p_admin_id,
    p_user_id,
    'user_token_balances',
    p_note,
    jsonb_build_object(
      'token_id',     p_token_id,
      'token_symbol', v_token.symbol,
      'delta',        p_delta::text,
      'new_balance',  v_new_balance::text
    )
  );

  return v_new_balance;
end;
$$;

grant execute on function public.admin_adjust_token_balance(uuid, uuid, numeric, text, uuid) to authenticated;
