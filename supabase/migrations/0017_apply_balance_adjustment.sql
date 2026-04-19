create or replace function public.apply_balance_adjustment(
  p_user_id              uuid,
  p_delta_cents          bigint,
  p_memo                 text,
  p_unlock_trades_cents  bigint default 0
)
returns public.user_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.user_balances;
begin
  update public.user_balances
  set
    balance_cents          = balance_cents + p_delta_cents,
    locked_in_trades_cents = greatest(0, locked_in_trades_cents - p_unlock_trades_cents),
    updated_at             = timezone('utc', now())
  where user_id = p_user_id
  returning * into v_balance;

  if not found then
    raise exception 'BALANCE_NOT_FOUND'
      using hint = 'user_balances row missing for user';
  end if;

  insert into public.transactions (
    user_id, kind, amount_cents, balance_after_cents, reference_type, memo
  )
  values (
    p_user_id,
    case when p_delta_cents >= 0 then 'admin_credit' else 'admin_debit' end,
    p_delta_cents,
    v_balance.balance_cents,
    'admin_adjustment',
    p_memo
  );

  return v_balance;
end;
$$;
