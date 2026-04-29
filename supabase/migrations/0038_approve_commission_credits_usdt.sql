-- ---------------------------------------------------------------------------
-- Phase 1 of "remove USD as user-held currency": referral commissions.
--
-- Before: approve_commission only flipped the commission's status to
-- 'approved' and left the beneficiary uncredited. The numeric value
-- (commission_cents) was a USD-cent amount with no actual payout path.
--
-- After: approving a commission credits the beneficiary's USDT balance in
-- user_token_balances by commission_cents / 100 (1:1 USD-cent → USDT).
-- Also writes a transactions audit row so the credit is traceable.
--
-- The commission_cents column itself is left as-is (column rename deferred
-- to Phase 4). Treat it as "USDT × 100" going forward.
-- ---------------------------------------------------------------------------

create or replace function public.approve_commission(
  p_commission_id uuid,
  p_admin_id      uuid,
  p_note          text default null
)
returns public.referral_commissions
language plpgsql
security definer
set search_path = public
as $$
declare
  comm          public.referral_commissions%rowtype;
  v_usdt_id     uuid;
  v_usdt_amount numeric(38, 18);
begin
  select * into comm
  from public.referral_commissions
  where id = p_commission_id
  for update;

  if not found then
    raise exception 'Commission not found.'
      using errcode = 'P0001', detail = 'COMMISSION_NOT_FOUND';
  end if;

  if comm.status <> 'pending' then
    raise exception 'Commission already reviewed.'
      using errcode = 'P0001', detail = 'ALREADY_REVIEWED';
  end if;

  select id into v_usdt_id from public.tokens where symbol = 'USDT';
  if v_usdt_id is null then
    raise exception 'USDT token row missing — cannot pay commission.'
      using errcode = 'P0001', detail = 'USDT_TOKEN_MISSING';
  end if;

  -- Flip to approved
  update public.referral_commissions
  set status               = 'approved',
      reviewed_by_admin_id = p_admin_id,
      reviewed_at          = timezone('utc', now()),
      review_note          = p_note,
      updated_at           = timezone('utc', now())
  where id = p_commission_id
  returning * into comm;

  -- Credit beneficiary's USDT balance
  v_usdt_amount := comm.commission_cents::numeric / 100;

  if v_usdt_amount > 0 then
    insert into public.user_token_balances (user_id, token_id, balance, locked_balance)
    values (comm.beneficiary_user_id, v_usdt_id, v_usdt_amount, 0)
    on conflict (user_id, token_id) do update
      set balance    = public.user_token_balances.balance + excluded.balance,
          updated_at = now();

    insert into public.transactions (
      user_id, kind, amount_cents, memo, reference_type, reference_id, metadata
    ) values (
      comm.beneficiary_user_id,
      'commission_credit',
      comm.commission_cents,
      'Referral commission paid in USDT',
      'referral_commissions',
      comm.id,
      jsonb_build_object(
        'commission_id',    comm.id,
        'referee_user_id',  comm.referee_user_id,
        'level',            comm.level,
        'bps_applied',      comm.bps_applied,
        'usdt_credited',    v_usdt_amount::text
      )
    );
  end if;

  -- Audit
  insert into public.admin_actions (
    admin_id, action, target_type, target_id,
    after_json, notes
  ) values (
    p_admin_id,
    'approve_commission',
    'referral_commission',
    p_commission_id::text,
    to_jsonb(comm),
    p_note
  );

  return comm;
end;
$$;
