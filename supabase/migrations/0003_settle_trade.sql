-- settle_trade: admin resolves a trade outcome and adjusts user balance
-- Called from /api/admin/trades/:id/settle via service role
create or replace function public.settle_trade(
  p_trade_id   uuid,
  p_outcome    public.trade_outcome,
  p_admin_id   uuid,
  p_reason     text default null
)
returns public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade   public.user_trades;
  v_balance record;
  v_payout  bigint;
  v_delta   bigint;
  v_memo    text;
begin
  -- Lock the trade row
  select * into v_trade
  from public.user_trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'TRADE_NOT_FOUND' using hint = 'No trade with that ID.';
  end if;

  if v_trade.status <> 'active' then
    raise exception 'TRADE_NOT_ACTIVE'
      using hint = 'Trade is already settled, cancelled, or void.';
  end if;

  -- Lock balance row
  select balance_cents, locked_in_trades_cents
  into v_balance
  from public.user_balances
  where user_id = v_trade.user_id
  for update;

  if not found then
    raise exception 'INTERNAL_ERROR' using hint = 'Balance record not found.';
  end if;

  -- Compute delta based on outcome
  -- stake was already debited from balance_cents when trade was placed,
  -- and added to locked_in_trades_cents
  if p_outcome = 'win' then
    -- profit only (stake × payout_bps / 10000); stake stays as-is (it was debited)
    v_payout := (v_trade.stake_cents * v_trade.payout_bps) / 10000;
    v_delta  := v_trade.stake_cents + v_payout; -- full return: stake + profit
    v_memo   := 'Trade won: ' || v_trade.stake_cents::text || ' stake + ' || v_payout::text || ' profit';
  elsif p_outcome = 'void' then
    v_delta := v_trade.stake_cents;  -- full refund
    v_memo  := 'Trade voided — full stake refunded';
  else
    -- lose: house keeps the stake; unlock only, no credit
    v_delta := 0;
    v_memo  := 'Trade lost';
  end if;

  -- Settle the trade row
  update public.user_trades
  set
    status        = 'settled',
    outcome       = p_outcome,
    settled_at    = now(),
    settled_by    = p_admin_id,
    settled_reason = p_reason,
    strike_price_cents = coalesce(
      (select last_price_cents from public.tokens where id = v_trade.token_id),
      v_trade.entry_price_cents
    )
  where id = p_trade_id
  returning * into v_trade;

  -- Always release the locked stake amount
  update public.user_balances
  set
    locked_in_trades_cents = greatest(locked_in_trades_cents - v_trade.stake_cents, 0),
    balance_cents          = balance_cents + v_delta,
    updated_at             = now()
  where user_id = v_trade.user_id;

  -- Log the settlement transaction (only when money moves)
  if v_delta > 0 then
    insert into public.transactions (
      user_id, kind, amount_cents, balance_after_cents,
      reference_type, reference_id, memo
    )
    values (
      v_trade.user_id,
      case p_outcome when 'win' then 'trade_win' else 'trade_void' end,
      v_delta,
      v_balance.balance_cents + v_delta,
      'user_trades', p_trade_id,
      v_memo
    );
  end if;

  -- Write audit log
  insert into public.admin_actions (
    admin_id, action, target_type, target_id,
    after_json, notes
  )
  values (
    p_admin_id,
    'settle_trade',
    'user_trades',
    p_trade_id,
    to_jsonb(v_trade),
    coalesce(p_reason, p_outcome::text)
  );

  return v_trade;
end;
$$;

-- bulk_settle_trades: settle multiple trades in one call
create or replace function public.bulk_settle_trades(
  p_trade_ids uuid[],
  p_outcome   public.trade_outcome,
  p_admin_id  uuid,
  p_reason    text default null
)
returns setof public.user_trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  foreach v_id in array p_trade_ids loop
    begin
      return next (select settle_trade(v_id, p_outcome, p_admin_id, p_reason));
    exception
      when others then
        -- skip already-settled or missing trades in bulk
        null;
    end;
  end loop;
end;
$$;
