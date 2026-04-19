create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_balances enable row level security;
alter table public.transactions enable row level security;
alter table public.tokens enable row level security;
alter table public.trade_periods enable row level security;
alter table public.user_trades enable row level security;
alter table public.candles_1s enable row level security;
alter table public.app_config enable row level security;
alter table public.admin_actions enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "user_balances_select_own_or_admin"
on public.user_balances
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "transactions_select_own_or_admin"
on public.transactions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "tokens_public_select_enabled"
on public.tokens
for select
to anon, authenticated
using (
  is_enabled
  or public.is_admin()
);

create policy "tokens_admin_insert"
on public.tokens
for insert
to authenticated
with check (public.is_admin());

create policy "tokens_admin_update"
on public.tokens
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "tokens_admin_delete"
on public.tokens
for delete
to authenticated
using (public.is_admin());

create policy "trade_periods_public_select_enabled"
on public.trade_periods
for select
to anon, authenticated
using (
  is_enabled
  or public.is_admin()
);

create policy "trade_periods_admin_insert"
on public.trade_periods
for insert
to authenticated
with check (public.is_admin());

create policy "trade_periods_admin_update"
on public.trade_periods
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "trade_periods_admin_delete"
on public.trade_periods
for delete
to authenticated
using (public.is_admin());

create policy "user_trades_select_own_or_admin"
on public.user_trades
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "candles_public_select"
on public.candles_1s
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tokens tokens
    where tokens.id = candles_1s.token_id
      and tokens.is_enabled
  )
  or public.is_admin()
);

create policy "app_config_select_authenticated"
on public.app_config
for select
to authenticated
using (true);

create policy "app_config_admin_update"
on public.app_config
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_actions_select_admin_only"
on public.admin_actions
for select
to authenticated
using (public.is_admin());
