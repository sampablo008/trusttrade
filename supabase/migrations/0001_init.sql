create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.token_feed_source as enum ('synthetic', 'shadow', 'replay');
create type public.trade_direction as enum ('long', 'short');
create type public.trade_status as enum ('active', 'settled', 'cancelled');
create type public.trade_outcome as enum ('win', 'lose', 'void');
create type public.expiry_policy as enum (
  'auto_lose',
  'auto_win',
  'void',
  'leave_pending'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'user',
  username text not null unique,
  display_name text,
  avatar_path text,
  is_frozen boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format check (
    username ~ '^[a-z0-9_][a-z0-9._-]{2,31}$'
  )
);

create table public.user_balances (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  balance_cents bigint not null default 0,
  locked_in_trades_cents bigint not null default 0,
  locked_bonus_cents bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_balances_balance_non_negative check (balance_cents >= 0),
  constraint user_balances_locked_trades_non_negative check (locked_in_trades_cents >= 0),
  constraint user_balances_locked_bonus_non_negative check (locked_bonus_cents >= 0)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  kind text not null,
  amount_cents bigint not null,
  balance_after_cents bigint,
  reference_type text,
  reference_id uuid,
  memo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  icon_path text,
  base_price_cents bigint not null,
  volatility_factor numeric(8, 4) not null default 1.0000,
  shadow_symbol text,
  feed_source public.token_feed_source not null default 'shadow',
  price_scale numeric(12, 6) not null default 1.000000,
  price_offset_cents bigint not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tokens_symbol_format check (symbol ~ '^[A-Z0-9]{2,12}$'),
  constraint tokens_base_price_positive check (base_price_cents > 0),
  constraint tokens_scale_positive check (price_scale > 0),
  constraint tokens_volatility_positive check (volatility_factor > 0)
);

create table public.trade_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  duration_seconds integer not null,
  min_amount_cents bigint not null,
  max_amount_cents bigint not null,
  payout_bps integer not null default 18500,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trade_periods_duration_positive check (duration_seconds > 0),
  constraint trade_periods_min_amount_positive check (min_amount_cents > 0),
  constraint trade_periods_max_amount_valid check (max_amount_cents >= min_amount_cents),
  constraint trade_periods_payout_positive check (payout_bps > 0)
);

create table public.user_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  token_id uuid not null references public.tokens (id) on delete restrict,
  trade_period_id uuid not null references public.trade_periods (id) on delete restrict,
  direction public.trade_direction not null,
  stake_cents bigint not null,
  payout_bps integer not null,
  entry_price_cents bigint not null,
  strike_price_cents bigint,
  status public.trade_status not null default 'active',
  outcome public.trade_outcome,
  started_at timestamptz not null default timezone('utc', now()),
  end_time timestamptz not null,
  settled_at timestamptz,
  settled_by uuid references public.profiles (user_id) on delete set null,
  settled_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_trades_stake_positive check (stake_cents > 0),
  constraint user_trades_payout_positive check (payout_bps > 0),
  constraint user_trades_entry_positive check (entry_price_cents > 0),
  constraint user_trades_strike_positive check (
    strike_price_cents is null or strike_price_cents > 0
  ),
  constraint user_trades_settlement_consistency check (
    (status = 'active' and outcome is null and settled_at is null)
    or
    (status = 'settled' and outcome is not null and settled_at is not null)
    or
    (status = 'cancelled' and settled_at is not null)
  )
);

create table public.candles_1s (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'shadow',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_1s_open_positive check (open_cents > 0),
  constraint candles_1s_high_positive check (high_cents > 0),
  constraint candles_1s_low_positive check (low_cents > 0),
  constraint candles_1s_close_positive check (close_cents > 0),
  constraint candles_1s_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
) partition by range (bucket_start);

do $$
declare
  month_start timestamptz := date_trunc('month', timezone('utc', now()));
  month_end timestamptz := month_start + interval '1 month';
  next_month_end timestamptz := month_start + interval '2 month';
begin
  execute format(
    'create table if not exists public.%I partition of public.candles_1s for values from (%L) to (%L)',
    'candles_1s_' || to_char(month_start, 'YYYY_MM'),
    month_start,
    month_end
  );

  execute format(
    'create table if not exists public.%I partition of public.candles_1s for values from (%L) to (%L)',
    'candles_1s_' || to_char(month_end, 'YYYY_MM'),
    month_end,
    next_month_end
  );
end;
$$;

create table public.app_config (
  id smallint primary key default 1,
  expiry_policy public.expiry_policy not null default 'auto_lose',
  global_trade_freeze boolean not null default false,
  signup_bonus_cents bigint not null default 1000,
  rate_limit_per_10s integer not null default 5,
  bonus_wager_multiplier numeric(5, 2) not null default 3.00,
  bonus_ticket_ttl_days integer not null default 90,
  ref_default_l1_bps integer not null default 500,
  ref_default_l2_bps integer not null default 300,
  ref_default_l3_bps integer not null default 200,
  ref_default_l4_bps integer not null default 100,
  ref_default_l5_bps integer not null default 50,
  ref_min_deposit_cents bigint not null default 1000,
  withdraw_min_cents bigint not null default 5000,
  withdraw_fee_cents bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_config_singleton check (id = 1),
  constraint app_config_signup_bonus_non_negative check (signup_bonus_cents >= 0),
  constraint app_config_trade_limit_positive check (rate_limit_per_10s > 0),
  constraint app_config_bonus_multiplier_positive check (bonus_wager_multiplier > 0),
  constraint app_config_bonus_ttl_positive check (bonus_ticket_ttl_days > 0),
  constraint app_config_ref_min_non_negative check (ref_min_deposit_cents >= 0),
  constraint app_config_withdraw_min_non_negative check (withdraw_min_cents >= 0),
  constraint app_config_withdraw_fee_non_negative check (withdraw_fee_cents >= 0)
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles (user_id) on delete set null,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index profiles_role_idx on public.profiles (role);
create index profiles_username_idx on public.profiles (username);

create index transactions_user_created_idx
  on public.transactions (user_id, created_at desc);
create index transactions_reference_idx
  on public.transactions (reference_type, reference_id);

create index tokens_enabled_symbol_idx on public.tokens (is_enabled, symbol);

create index trade_periods_enabled_duration_idx
  on public.trade_periods (is_enabled, duration_seconds);

create index user_trades_user_status_idx
  on public.user_trades (user_id, status, end_time desc);
create index user_trades_status_end_time_idx
  on public.user_trades (status, end_time asc);
create index user_trades_token_status_idx
  on public.user_trades (token_id, status, end_time asc);

create index candles_1s_bucket_idx
  on public.candles_1s (token_id, bucket_start desc);

create index admin_actions_admin_created_idx
  on public.admin_actions (admin_user_id, created_at desc);
create index admin_actions_target_idx
  on public.admin_actions (target_type, target_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger user_balances_set_updated_at
before update on public.user_balances
for each row
execute function public.set_updated_at();

create trigger tokens_set_updated_at
before update on public.tokens
for each row
execute function public.set_updated_at();

create trigger trade_periods_set_updated_at
before update on public.trade_periods
for each row
execute function public.set_updated_at();

create trigger user_trades_set_updated_at
before update on public.user_trades
for each row
execute function public.set_updated_at();

create trigger app_config_set_updated_at
before update on public.app_config
for each row
execute function public.set_updated_at();

insert into public.app_config (
  id,
  expiry_policy,
  global_trade_freeze,
  signup_bonus_cents,
  rate_limit_per_10s,
  bonus_wager_multiplier,
  bonus_ticket_ttl_days,
  ref_default_l1_bps,
  ref_default_l2_bps,
  ref_default_l3_bps,
  ref_default_l4_bps,
  ref_default_l5_bps,
  ref_min_deposit_cents,
  withdraw_min_cents,
  withdraw_fee_cents
)
values (
  1,
  'auto_lose',
  false,
  1000,
  5,
  3.00,
  90,
  500,
  300,
  200,
  100,
  50,
  1000,
  5000,
  0
)
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_email text := lower(coalesce(new.email, ''));
  derived_username text := 'user_' || left(replace(new.id::text, '-', ''), 12);
  derived_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (
    user_id,
    email,
    role,
    username,
    display_name
  )
  values (
    new.id,
    derived_email,
    'user',
    derived_username,
    coalesce(derived_display_name, split_part(derived_email, '@', 1))
  )
  on conflict (user_id) do nothing;

  insert into public.user_balances (
    user_id,
    balance_cents,
    locked_in_trades_cents,
    locked_bonus_cents
  )
  values (
    new.id,
    0,
    0,
    0
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
