-- ---------------------------------------------------------------------------
-- Phase 1: cancel_trade RPC.
--
-- Replaces the previous JS-side cancel flow that called
-- apply_balance_adjustment to refund stake_cents to the legacy USD ledger.
-- Trades are token-funded (place_trade locks chart-token native amount in
-- user_token_balances), so cancel must reverse that lock — not credit USD.
--
-- Atomicity: lock the trade row, validate, unlock the token, mark cancelled,
-- write audit, all inside one PL/pgSQL block.
-- ---------------------------------------------------------------------------

create or replace function public.cancel_trade(
  p_user_id  uuid,
  p_trade_id uuid
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade        public.user_trades;
  v_age_ms       bigint;
  v_token_amount numeric(38, 18);
  v_lock_token   uuid;
begin
  select * into v_trade
  from public.user_trades
  where id = p_trade_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'Trade does not exist.';
  end if;

  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_ACTIVE' using hint = 'Trade is not active.';
  end if;

  v_age_ms := extract(epoch from (now() - v_trade.started_at)) * 1000;
  if v_age_ms > 2000 then
    raise exception 'CANCEL_WINDOW_EXPIRED'
      using hint = 'Cancel window has expired.';
  end if;

  v_token_amount := coalesce(v_trade.stake_token_amount, 0);
  v_lock_token   := coalesce(v_trade.lock_token_id, v_trade.token_id);

  if v_token_amount > 0 then
    update public.user_token_balances
    set balance        = balance + v_token_amount,
        locked_balance = greatest(locked_balance - v_token_amount, 0),
        updated_at     = now()
    where user_id = p_user_id and token_id = v_lock_token;
  end if;

  update public.user_trades
  set status     = 'cancelled',
      updated_at = now()
  where id = p_trade_id
  returning * into v_trade;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  ) values (
    p_user_id,
    'trade_cancel_refund',
    v_trade.stake_cents,
    'user_trades',
    p_trade_id,
    'Trade cancelled within grace window — token stake refunded',
    jsonb_build_object(
      'token_id',     v_lock_token,
      'token_amount', v_token_amount::text
    )
  );

  return v_trade;
end;
$$;

grant execute on function public.cancel_trade(uuid, uuid) to authenticated;
