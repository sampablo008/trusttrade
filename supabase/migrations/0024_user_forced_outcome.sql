-- Per-user forced outcome. Admin can pin a user to always win or always lose.
-- Precedence at settlement time:
--   user_trades.admin_forced_outcome   (per-trade, highest)
--   profiles.forced_outcome            (per-user)
--   app_config.expiry_policy default   (global, lowest)

alter table public.profiles
  add column if not exists forced_outcome public.trade_outcome;

comment on column public.profiles.forced_outcome is
  'Per-user settlement override. Takes precedence over app_config.expiry_policy but is overridden by user_trades.admin_forced_outcome.';

create or replace function public.settle_due_trades(
  p_default_outcome public.trade_outcome default null,
  p_user_id         uuid default null,
  p_limit           int  default 500
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    record;
  v_outcome public.trade_outcome;
  v_count  int := 0;
begin
  for v_row in
    select t.id,
           t.admin_forced_outcome,
           p.forced_outcome as user_forced_outcome
    from public.user_trades t
    left join public.profiles p on p.user_id = t.user_id
    where t.status = 'active'
      and t.end_time <= now()
      and (p_user_id is null or t.user_id = p_user_id)
    order by t.end_time
    limit p_limit
    for update of t skip locked
  loop
    v_outcome := coalesce(
      v_row.admin_forced_outcome,
      v_row.user_forced_outcome,
      p_default_outcome
    );

    if v_outcome is null then
      continue;
    end if;

    begin
      perform public.settle_trade(
        v_row.id,
        v_outcome,
        null,
        case
          when v_row.admin_forced_outcome is not null then 'auto_admin_forced'
          when v_row.user_forced_outcome is not null then 'auto_user_forced'
          else 'auto_expired'
        end
      );
      v_count := v_count + 1;
    exception
      when others then
        null;
    end;
  end loop;

  return v_count;
end;
$$;
