-- ---------------------------------------------------------------------------
-- Fix: record_deposit_commissions referenced a non-existent `value` column on
-- app_config. The correct schema exposes ref_min_deposit_cents as a direct
-- bigint column. Also extend approve_deposit so admins can override the
-- deposited amount at approval time (credits the edited amount to the user
-- balance and updates the deposit row).
-- ---------------------------------------------------------------------------

create or replace function public.record_deposit_commissions(
  p_referee_user_id uuid,
  p_deposit_id      uuid,
  p_amount_cents    bigint
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  upline_row    public.referral_upline%rowtype;
  bps           integer;
  comm_cents    bigint;
  min_deposit   bigint;
  created_count integer := 0;
begin
  select coalesce(ref_min_deposit_cents, 1000)
  into min_deposit
  from public.app_config
  limit 1;

  if p_amount_cents < coalesce(min_deposit, 1000) then
    return 0;
  end if;

  if exists (
    select 1 from public.referrals
    where referee_user_id = p_referee_user_id
      and first_deposit_fired = true
  ) then
    return 0;
  end if;

  update public.referrals
  set first_deposit_fired = true
  where referee_user_id = p_referee_user_id;

  for upline_row in
    select * from public.referral_upline
    where user_id = p_referee_user_id
    order by level
  loop
    bps        := public.get_commission_bps(upline_row.ancestor_id, upline_row.level);
    comm_cents := (p_amount_cents * bps) / 10000;

    if comm_cents > 0 then
      insert into public.referral_commissions (
        referee_user_id,
        beneficiary_user_id,
        deposit_id,
        level,
        bps_applied,
        base_amount_cents,
        commission_cents,
        status
      ) values (
        p_referee_user_id,
        upline_row.ancestor_id,
        p_deposit_id,
        upline_row.level,
        bps,
        p_amount_cents,
        comm_cents,
        'pending'
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_deposit with optional amount override
-- ---------------------------------------------------------------------------
create or replace function public.approve_deposit(
  p_deposit_id    uuid,
  p_admin_user_id uuid,
  p_note          text default null,
  p_amount_cents  bigint default null
)
returns public.deposits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deposit public.deposits;
  v_config  record;
  v_amount  bigint;
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

  v_amount := coalesce(p_amount_cents, v_deposit.amount_cents);

  if v_amount <= 0 then
    raise exception 'AMOUNT_BELOW_MIN'
      using hint = 'Deposit amount must be positive.';
  end if;

  if v_amount <> v_deposit.amount_cents then
    update public.deposits
    set amount_cents = v_amount,
        updated_at   = now()
    where id = p_deposit_id;
  end if;

  update public.user_balances
  set
    balance_cents = balance_cents + v_amount,
    updated_at    = now()
  where user_id = v_deposit.user_id;

  insert into public.transactions (
    user_id, kind, amount_cents, reference_type, reference_id, memo
  )
  values (
    v_deposit.user_id,
    'deposit_credit',
    v_amount,
    'deposits',
    v_deposit.id,
    'Deposit approved'
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

  select ref_min_deposit_cents into v_config
  from public.app_config limit 1;

  if v_deposit.amount_cents >= v_config.ref_min_deposit_cents then
    perform public.record_deposit_commissions(
      v_deposit.user_id,
      v_deposit.id,
      v_deposit.amount_cents
    );
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
