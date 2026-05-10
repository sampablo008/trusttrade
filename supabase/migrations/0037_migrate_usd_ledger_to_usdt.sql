-- ---------------------------------------------------------------------------
-- Phase 0 of "remove USD as user-held currency" refactor.
--
-- Converts every user's legacy USD ledger (user_balances.{balance_cents,
-- locked_in_trades_cents, locked_bonus_cents}) into a USDT credit on
-- user_token_balances at 1:1 (1 USD-cent = 0.01 USDT). Zeros out the
-- legacy ledger and writes a transactions audit row.
--
-- Phase 1 (services) will stop writing to user_balances. Phase 4 will drop
-- the table. Until then, this migration is also a no-op safety net for any
-- residual writes that land between phases — re-running it is idempotent
-- because the loop only picks up rows with non-zero values.
--
-- Notes on locked balances:
--   The legacy locked_in_trades_cents / locked_bonus_cents columns reflect
--   funds reserved for in-flight legacy USD-denominated trades or bonuses.
--   Post-migration 0026+ trades fund from user_token_balances directly, so
--   these columns should be zero in practice. We collapse them into the
--   USDT free balance because there's no longer a USD-side concept of "lock".
-- ---------------------------------------------------------------------------

do $$
declare
  v_usdt_id     uuid;
  v_row         record;
  v_total_cents bigint;
  v_usdt_amount numeric(38, 18);
  v_migrated    int := 0;
  v_pending     int;
begin
  -- Short-circuit: if there is no legacy USD ledger to migrate (e.g. a fresh
  -- prod deploy where tokens haven't been seeded yet), skip entirely. The
  -- USDT row is only required when we actually have something to credit.
  select count(*) into v_pending
  from public.user_balances
  where balance_cents > 0
     or locked_in_trades_cents > 0
     or locked_bonus_cents > 0;

  if v_pending = 0 then
    raise notice 'Migration 0037: no legacy USD balances to migrate — skipping.';
    return;
  end if;

  select id into v_usdt_id from public.tokens where symbol = 'USDT';
  if v_usdt_id is null then
    raise exception 'USDT token row missing — cannot migrate USD ledger.';
  end if;

  for v_row in
    select user_id, balance_cents, locked_in_trades_cents, locked_bonus_cents
    from public.user_balances
    where balance_cents > 0
       or locked_in_trades_cents > 0
       or locked_bonus_cents > 0
    for update
  loop
    v_total_cents := v_row.balance_cents
                   + v_row.locked_in_trades_cents
                   + v_row.locked_bonus_cents;
    v_usdt_amount := v_total_cents::numeric / 100;

    insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
    values (v_row.user_id, v_usdt_id, v_usdt_amount, 0)
    on conflict (user_id, token_id) do update
      set balance    = public.user_token_balances.balance + excluded.balance,
          updated_at = now();

    insert into public.transactions (
      user_id, kind, amount_cents, memo, reference_type, metadata
    )
    values (
      v_row.user_id,
      'usd_to_usdt_migration',
      -v_total_cents,
      'Migrated USD ledger to USDT token balance (Phase 0)',
      'migration',
      jsonb_build_object(
        'migration',                '0037',
        'usd_balance_cents',        v_row.balance_cents,
        'usd_locked_trades_cents',  v_row.locked_in_trades_cents,
        'usd_locked_bonus_cents',   v_row.locked_bonus_cents,
        'usdt_credited',            v_usdt_amount::text
      )
    );

    update public.user_balances
    set balance_cents          = 0,
        locked_in_trades_cents = 0,
        locked_bonus_cents     = 0,
        updated_at             = now()
    where user_id = v_row.user_id;

    v_migrated := v_migrated + 1;
  end loop;

  raise notice 'Migration 0037: converted % user(s) USD ledger → USDT.', v_migrated;
end $$;
