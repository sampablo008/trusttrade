-- ---------------------------------------------------------------------------
-- Fix double-counted payout on winning trades.
--
-- payout_bps is the TOTAL-return multiplier in basis points (10000 = 1.0×,
-- 11500 = 1.15× = 15% profit) — see lib/utils/money.ts (calcTotalPayout,
-- bpsToMultiplierLabel "18500 → 1.85×") and components/trade/PayoutPreview.tsx,
-- which promise the user a profit of (payout_bps/10000 - 1).
--
-- The previous settle_trade (0048) computed the credit as
--     stake + stake × payout_bps/10000
-- i.e. it treated payout_bps as PROFIT-only bps and added the stake on top of
-- a total that already includes it. For a configured 10-15% payout this credited
-- ~111-115% profit instead of 10-15%, and the portfolio "Rate of Return" showed
-- 111% instead of 11%. Correct credit is simply the total:
--     stake × payout_bps/10000
--
-- Identical to 0048 except the win branch (v_payout_token).
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
  v_delta_bps    int;
  v_exit         bigint;
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
    -- payout_bps is the TOTAL-return multiplier; the result already includes
    -- the stake. Do NOT add stake_token_amount again.
    v_payout_token := v_trade.stake_token_amount * v_trade.payout_bps / 10000.0;
    v_memo := 'Trade won';
  elsif p_outcome = 'void' then
    v_payout_token := v_trade.stake_token_amount;
    v_memo := 'Trade voided';
  else
    v_payout_token := 0;
    v_memo := 'Trade lost';
  end if;

  -- Coherent exit price: small random pip, sign chosen by outcome+direction.
  v_delta_bps := 1 + floor(random() * 50)::int; -- 1-50 bps
  if p_outcome = 'void' then
    v_exit := v_trade.entry_price_cents;
  elsif (p_outcome = 'win'  and v_trade.direction = 'long')
     or (p_outcome = 'lose' and v_trade.direction = 'short') then
    v_exit := v_trade.entry_price_cents
            + greatest((v_trade.entry_price_cents * v_delta_bps / 10000)::bigint, 1::bigint);
  else
    v_exit := v_trade.entry_price_cents
            - greatest((v_trade.entry_price_cents * v_delta_bps / 10000)::bigint, 1::bigint);
    if v_exit < 1 then
      v_exit := 1;
    end if;
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
      exit_price_cents   = v_exit,
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
      'payout_amount',  v_payout_token::text,
      'exit_price_cents', v_exit
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
