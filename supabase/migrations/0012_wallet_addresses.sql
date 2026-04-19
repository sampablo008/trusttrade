create table public.wallet_addresses (
  id uuid primary key default gen_random_uuid(),
  token_symbol text not null,
  network text not null,
  address text not null,
  memo text,
  min_deposit_cents bigint not null default 1000,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wallet_addresses_min_deposit_positive check (min_deposit_cents > 0),
  constraint wallet_addresses_token_network_unique unique (token_symbol, network)
);

create trigger wallet_addresses_set_updated_at
  before update on public.wallet_addresses
  for each row execute function public.set_updated_at();

alter table public.wallet_addresses enable row level security;

-- Admins can do everything; regular users cannot read wallet addresses directly
-- (they use the /api/wallets endpoint which returns only enabled addresses)
create policy "admin_wallet_addresses_all"
  on public.wallet_addresses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
