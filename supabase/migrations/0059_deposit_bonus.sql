-- ---------------------------------------------------------------------------
-- Deposit bonus, part 2/2: config, claim gate, and approve_deposit hook.
--
-- Mirrors the signup bonus (one-shot, routed through credit_bonus) but the
-- amount is derived from the deposit instead of a flat figure:
--
--   bonus = round(deposit_usd_value_cents * deposit_bonus_pct_bps / 10000)
--   if deposit_bonus_max_cents > 0:  bonus = least(bonus, deposit_bonus_max_cents)
--
-- "max" is a CAP (whichever is lower). A max of 0 means "no cap", so an admin
-- who sets only a percentage still pays out. Credited as USDT via credit_bonus
-- with kind='deposit'. One-shot: the first APPROVED deposit per user, gated by
-- profiles.deposit_bonus_claimed_at (same pattern as signup_bonus_claimed_at).
-- ---------------------------------------------------------------------------

-- 1. Config: percentage (basis points) + cap (cents). Defaults = disabled.
alter table public.app_config
  add column if not exists deposit_bonus_pct_bps   integer not null default 0,
  add column if not exists deposit_bonus_max_cents bigint  not null default 0;

-- 2. One-shot claim gate. NULL = eligible. Existing users keep NULL: a deposit
--    bonus is forward-looking, so their next approved deposit can earn it.
alter table public.profiles
  add column if not exists deposit_bonus_claimed_at timestamptz;

-- 3. approve_deposit — same body as 0026, plus the deposit-bonus hook.
create or replace function public.approve_deposit(
  p_deposit_id      uuid,
  p_admin_user_id   uuid,
  p_note            text default null,
  p_amount          numeric default null,
  p_usd_value_cents bigint  default 0
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit     public.deposits;
  v_amount      numeric(38, 18);
  v_min_dep     bigint;
  v_pct_bps     integer;
  v_max_cents   bigint;
  v_bonus_cents bigint;
  v_claimed_at  timestamptz;
begin
  select * into v_deposit
  from public.deposits
  where id = p_deposit_id
  for update;

  if not found then
    raise exception 'DEPOSIT_NOT_FOUND'
      using hint = 'Deposit record does not exist.';
  end if;

  if v_deposit.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED'
      using hint = 'This deposit has already been reviewed.';
  end if;

  v_amount := coalesce(p_amount, v_deposit.amount);

  if v_amount is null or v_amount <= 0 then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount must be positive.';
  end if;

  if v_amount <> coalesce(v_deposit.amount, 0) then
    update public.deposits
    set amount     = v_amount,
        updated_at = now()
    where id = p_deposit_id;
  end if;

  insert into public.user_token_balances (user_id, token_id, balance)
  values (v_deposit.user_id, v_deposit.token_id, v_amount)
  on conflict (user_id, token_id)
  do update set balance = public.user_token_balances.balance + excluded.balance,
                updated_at = now();

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo, metadata
  )
  values (
    v_deposit.user_id,
    'deposit_credit',
    coalesce(p_usd_value_cents, 0),
    'deposits',
    v_deposit.id,
    'Deposit approved',
    jsonb_build_object('token_id', v_deposit.token_id, 'native_amount', v_amount::text)
  );

  update public.deposits
  set
    status      = 'approved',
    admin_note  = p_note,
    reviewed_by = p_admin_user_id,
    reviewed_at = now(),
    updated_at  = now()
  where id = p_deposit_id
  returning * into v_deposit;

  select coalesce(ref_min_deposit_cents, 1000),
         coalesce(deposit_bonus_pct_bps, 0),
         coalesce(deposit_bonus_max_cents, 0)
  into v_min_dep, v_pct_bps, v_max_cents
  from public.app_config limit 1;

  if coalesce(p_usd_value_cents, 0) >= v_min_dep then
    perform public.record_deposit_commissions(
      v_deposit.user_id,
      v_deposit.id,
      p_usd_value_cents
    );
  end if;

  -- Deposit bonus: one-shot on the first approved deposit. Lock the profile
  -- row so two concurrent approvals can't both pay the bonus.
  if v_pct_bps > 0 and coalesce(p_usd_value_cents, 0) > 0 then
    select deposit_bonus_claimed_at into v_claimed_at
    from public.profiles
    where user_id = v_deposit.user_id
    for update;

    if v_claimed_at is null then
      v_bonus_cents := floor(p_usd_value_cents::numeric * v_pct_bps / 10000);
      if v_max_cents > 0 then
        v_bonus_cents := least(v_bonus_cents, v_max_cents);
      end if;

      if v_bonus_cents > 0 then
        perform public.credit_bonus(
          v_deposit.user_id,
          v_bonus_cents,
          'deposit',
          'deposits',
          v_deposit.id,
          'Deposit bonus'
        );

        update public.profiles
        set deposit_bonus_claimed_at = now(),
            updated_at               = now()
        where user_id = v_deposit.user_id;
      end if;
    end if;
  end if;

  insert into public.admin_actions (
    admin_user_id, action_type, target_type, target_id, note
  )
  values (
    p_admin_user_id, 'approve_deposit', 'deposits', p_deposit_id, p_note
  );

  return v_deposit;
end;
$$;
