-- ---------------------------------------------------------------------------
-- Fix: settle_trade (rewritten in 0044) and cancel_trade (added in 0040)
-- did not populate settled_at / settled_by / settled_reason. The
-- user_trades_settlement_consistency check constraint requires:
--   status = 'settled'   → outcome IS NOT NULL AND settled_at IS NOT NULL
--   status = 'cancelled' → settled_at IS NOT NULL
-- so every settle attempt threw constraint 23514 and rolled back. Trades
-- got stuck at "Settling…" because settle_due_trades swallows exceptions.
-- ---------------------------------------------------------------------------

create or replace function public.settle_trade(
  p_trade_id  uuid,
  p_outcome   public.trade_outcome,
  p_admin_id  uuid,
  p_reason    text default null
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade        public.user_trades;
  v_lock_token   uuid;
  v_payout_token numeric(38, 18);
  v_memo         text;
begin
  select * into v_trade
  from public.user_trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'Trade does not exist.';
  end if;

  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_SETTLEABLE'
      using hint = 'Trade is not in an active state.';
  end if;

  v_lock_token := v_trade.lock_token_id;

  if v_lock_token is null then
    raise exception 'LEGACY_USD_TRADE_UNSUPPORTED'
      using hint = 'This trade was placed before per-token funding and has no token to credit.';
  end if;

  if p_outcome = 'win' then
    v_payout_token := v_trade.stake_token_amount
                    + (v_trade.stake_token_amount * v_trade.payout_bps / 10000.0);
    v_memo := 'Trade won';
  elsif p_outcome = 'void' then
    v_payout_token := v_trade.stake_token_amount;
    v_memo := 'Trade voided';
  else
    v_payout_token := 0;
    v_memo := 'Trade lost';
  end if;

  update public.user_token_balances
  set locked_balance = greatest(locked_balance - v_trade.stake_token_amount, 0),
      balance        = balance + v_payout_token,
      updated_at     = now()
  where user_id = v_trade.user_id and token_id = v_lock_token;

  update public.user_trades
  set status             = 'settled',
      outcome            = p_outcome,
      strike_price_cents = coalesce(v_trade.strike_price_cents, v_trade.entry_price_cents),
      settled_at         = now(),
      settled_by         = p_admin_id,
      settled_reason     = coalesce(p_reason, p_outcome::text),
      updated_at         = now()
  where id = p_trade_id
  returning * into v_trade;

  insert into public.transactions (
    user_id, kind, amount_cents,
    reference_type, reference_id, memo, metadata
  )
  values (
    v_trade.user_id,
    case p_outcome when 'win' then 'trade_win'
                   when 'void' then 'trade_void'
                   else 'trade_lose' end,
    0,
    'user_trades', p_trade_id, v_memo,
    jsonb_build_object(
      'outcome',        p_outcome::text,
      'lock_token_id',  v_lock_token,
      'stake_amount',   v_trade.stake_token_amount::text,
      'payout_amount',  v_payout_token::text
    )
  );

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, after_state, note
  )
  values (
    p_admin_id, 'settle_trade', 'user_trades', p_trade_id,
    to_jsonb(v_trade), coalesce(p_reason, p_outcome::text)
  );

  return v_trade;
end;
$$;

-- cancel_trade also needs settled_at populated for the cancelled status.
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
  set status         = 'cancelled',
      settled_at     = now(),
      settled_reason = 'cancelled_by_user',
      updated_at     = now()
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
