-- ---------------------------------------------------------------------------
-- Phase 1 of "remove USD as user-held currency": bonuses.
--
-- Before:
--   credit_bonus            → locks user_balances.locked_bonus_cents.
--   expire_bonus_tickets    → debits user_balances.balance_cents and
--                             locked_bonus_cents on forfeit.
--   Wagering progress was advanced only by the legacy USD-funded place_trade
--   (migration 0002). Post-0026 trades are token-funded and don't touch
--   bonus_tickets, so wager_progress_cents was effectively dead code.
--
-- After:
--   credit_bonus            → creates a bonus_tickets row (status='released'
--                             immediately, since the wager mechanic is no
--                             longer enforced) and credits the user's USDT
--                             balance in user_token_balances.
--   expire_bonus_tickets    → only flips status on stale legacy 'locked'
--                             tickets. No balance change: the underlying
--                             locked_bonus_cents was migrated to free USDT
--                             in 0037.
-- ---------------------------------------------------------------------------

create or replace function public.credit_bonus(
  p_user_id        uuid,
  p_amount_cents   bigint,
  p_kind           public.bonus_ticket_kind,
  p_reference_type text default null,
  p_reference_id   uuid default null,
  p_note           text default null
)
returns public.bonus_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config      record;
  v_usdt_id     uuid;
  v_usdt_amount numeric(38, 18);
  v_ticket      public.bonus_tickets;
  v_wager_req   bigint;
  v_expires_at  timestamptz;
begin
  if p_amount_cents <= 0 then
    raise exception 'AMOUNT_INVALID' using hint = 'Bonus amount must be positive.';
  end if;

  select id into v_usdt_id from public.tokens where symbol = 'USDT';
  if v_usdt_id is null then
    raise exception 'USDT_TOKEN_MISSING' using hint = 'USDT token row missing.';
  end if;

  select bonus_wager_multiplier, bonus_ticket_ttl_days
  into v_config
  from public.app_config
  limit 1;

  v_wager_req  := ceil(p_amount_cents * v_config.bonus_wager_multiplier);
  v_expires_at := timezone('utc', now()) + (v_config.bonus_ticket_ttl_days * interval '1 day');

  -- Audit trail: store the bonus as a released ticket so its history is
  -- queryable even though the wager mechanic is no longer enforced.
  insert into public.bonus_tickets (
    user_id, kind, amount_cents, wager_required_cents, wager_progress_cents,
    reference_type, reference_id, note, expires_at, status, released_at
  ) values (
    p_user_id, p_kind, p_amount_cents, v_wager_req, v_wager_req,
    p_reference_type, p_reference_id, p_note, v_expires_at,
    'released', timezone('utc', now())
  )
  returning * into v_ticket;

  -- Credit USDT to the user's token balance.
  v_usdt_amount := p_amount_cents::numeric / 100;

  insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
  values (p_user_id, v_usdt_id, v_usdt_amount, 0)
  on conflict (user_id, token_id) do update
    set balance    = public.user_token_balances.balance + excluded.balance,
        updated_at = now();

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  ) values (
    p_user_id,
    'bonus_credit',
    p_amount_cents,
    'bonus_tickets',
    v_ticket.id,
    coalesce(p_note, 'Bonus credited as USDT'),
    jsonb_build_object(
      'bonus_kind',     p_kind,
      'usdt_credited',  v_usdt_amount::text
    )
  );

  return v_ticket;
end;
$$;

-- expire_bonus_tickets: only flip status on legacy locked tickets. No balance
-- mutation — locked_bonus_cents was migrated to USDT free balance in 0037,
-- and new tickets are created in 'released' status.
create or replace function public.expire_bonus_tickets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with stale as (
    update public.bonus_tickets
    set status     = 'expired',
        updated_at = now()
    where status = 'locked'
      and expires_at <= timezone('utc', now())
    returning id
  )
  select count(*) into v_count from stale;

  return v_count;
end;
$$;
