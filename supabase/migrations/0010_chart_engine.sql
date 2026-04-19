alter type public.token_feed_source add value if not exists 'frozen';

create type public.replay_status as enum ('idle', 'running', 'paused', 'ended');

alter table public.tokens
  add column if not exists last_shadow_price_cents bigint,
  add column if not exists last_shadow_at timestamptz,
  add column if not exists last_price_cents bigint,
  add column if not exists last_price_at timestamptz,
  add column if not exists drift_bias_bps integer not null default 0,
  add column if not exists freeze_price_cents bigint;

alter table public.tokens
  add constraint tokens_last_shadow_positive check (
    last_shadow_price_cents is null or last_shadow_price_cents > 0
  ),
  add constraint tokens_last_price_positive check (
    last_price_cents is null or last_price_cents > 0
  ),
  add constraint tokens_freeze_price_positive check (
    freeze_price_cents is null or freeze_price_cents > 0
  );

create table public.candles_1m (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_1m_open_positive check (open_cents > 0),
  constraint candles_1m_high_positive check (high_cents > 0),
  constraint candles_1m_low_positive check (low_cents > 0),
  constraint candles_1m_close_positive check (close_cents > 0),
  constraint candles_1m_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candles_5m (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_5m_open_positive check (open_cents > 0),
  constraint candles_5m_high_positive check (high_cents > 0),
  constraint candles_5m_low_positive check (low_cents > 0),
  constraint candles_5m_close_positive check (close_cents > 0),
  constraint candles_5m_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candles_15m (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_15m_open_positive check (open_cents > 0),
  constraint candles_15m_high_positive check (high_cents > 0),
  constraint candles_15m_low_positive check (low_cents > 0),
  constraint candles_15m_close_positive check (close_cents > 0),
  constraint candles_15m_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candles_1h (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_1h_open_positive check (open_cents > 0),
  constraint candles_1h_high_positive check (high_cents > 0),
  constraint candles_1h_low_positive check (low_cents > 0),
  constraint candles_1h_close_positive check (close_cents > 0),
  constraint candles_1h_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candles_4h (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_4h_open_positive check (open_cents > 0),
  constraint candles_4h_high_positive check (high_cents > 0),
  constraint candles_4h_low_positive check (low_cents > 0),
  constraint candles_4h_close_positive check (close_cents > 0),
  constraint candles_4h_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candles_1d (
  token_id uuid not null references public.tokens (id) on delete cascade,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  source text not null default 'aggregate',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, bucket_start),
  constraint candles_1d_open_positive check (open_cents > 0),
  constraint candles_1d_high_positive check (high_cents > 0),
  constraint candles_1d_low_positive check (low_cents > 0),
  constraint candles_1d_close_positive check (close_cents > 0),
  constraint candles_1d_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  )
);

create table public.candle_replay_bank (
  token_id uuid not null references public.tokens (id) on delete cascade,
  source_key text not null,
  sequence_no integer not null,
  timeframe_seconds integer not null default 60,
  bucket_start timestamptz not null,
  open_cents bigint not null,
  high_cents bigint not null,
  low_cents bigint not null,
  close_cents bigint not null,
  volume numeric(20, 8) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (token_id, source_key, sequence_no),
  constraint candle_replay_bank_timeframe_positive check (timeframe_seconds > 0),
  constraint candle_replay_bank_sequence_non_negative check (sequence_no >= 0),
  constraint candle_replay_bank_open_positive check (open_cents > 0),
  constraint candle_replay_bank_high_positive check (high_cents > 0),
  constraint candle_replay_bank_low_positive check (low_cents > 0),
  constraint candle_replay_bank_close_positive check (close_cents > 0),
  constraint candle_replay_bank_ohlc_valid check (
    high_cents >= greatest(open_cents, close_cents)
    and low_cents <= least(open_cents, close_cents)
    and high_cents >= low_cents
  ),
  constraint candle_replay_bank_source_key_format check (
    source_key ~ '^[a-zA-Z0-9._:-]{2,96}$'
  ),
  constraint candle_replay_bank_unique_bucket unique (token_id, source_key, bucket_start)
);

create table public.token_replay_state (
  token_id uuid primary key references public.tokens (id) on delete cascade,
  source_key text,
  status public.replay_status not null default 'idle',
  cursor_sequence integer not null default 0,
  playback_speed numeric(8, 2) not null default 1.00,
  is_looping boolean not null default false,
  started_at timestamptz,
  last_advanced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint token_replay_state_cursor_non_negative check (cursor_sequence >= 0),
  constraint token_replay_state_speed_positive check (playback_speed > 0),
  constraint token_replay_state_source_key_format check (
    source_key is null or source_key ~ '^[a-zA-Z0-9._:-]{2,96}$'
  )
);

create index candles_1m_bucket_idx on public.candles_1m (token_id, bucket_start desc);
create index candles_5m_bucket_idx on public.candles_5m (token_id, bucket_start desc);
create index candles_15m_bucket_idx on public.candles_15m (token_id, bucket_start desc);
create index candles_1h_bucket_idx on public.candles_1h (token_id, bucket_start desc);
create index candles_4h_bucket_idx on public.candles_4h (token_id, bucket_start desc);
create index candles_1d_bucket_idx on public.candles_1d (token_id, bucket_start desc);
create index candle_replay_bank_lookup_idx
  on public.candle_replay_bank (token_id, source_key, bucket_start asc);
create index token_replay_state_status_idx
  on public.token_replay_state (status, updated_at desc);

create trigger token_replay_state_set_updated_at
before update on public.token_replay_state
for each row
execute function public.set_updated_at();

create or replace function public.can_read_market_token(p_token_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tokens tokens
    where tokens.id = p_token_id
      and tokens.is_enabled
  )
  or public.is_admin();
$$;

alter table public.candles_1m enable row level security;
alter table public.candles_5m enable row level security;
alter table public.candles_15m enable row level security;
alter table public.candles_1h enable row level security;
alter table public.candles_4h enable row level security;
alter table public.candles_1d enable row level security;
alter table public.candle_replay_bank enable row level security;
alter table public.token_replay_state enable row level security;

create policy "candles_1m_public_select"
on public.candles_1m
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candles_5m_public_select"
on public.candles_5m
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candles_15m_public_select"
on public.candles_15m
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candles_1h_public_select"
on public.candles_1h
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candles_4h_public_select"
on public.candles_4h
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candles_1d_public_select"
on public.candles_1d
for select
to anon, authenticated
using (public.can_read_market_token(token_id));

create policy "candle_replay_bank_admin_select"
on public.candle_replay_bank
for select
to authenticated
using (public.is_admin());

create policy "candle_replay_bank_admin_insert"
on public.candle_replay_bank
for insert
to authenticated
with check (public.is_admin());

create policy "candle_replay_bank_admin_update"
on public.candle_replay_bank
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "candle_replay_bank_admin_delete"
on public.candle_replay_bank
for delete
to authenticated
using (public.is_admin());

create policy "token_replay_state_admin_select"
on public.token_replay_state
for select
to authenticated
using (public.is_admin());

create policy "token_replay_state_admin_insert"
on public.token_replay_state
for insert
to authenticated
with check (public.is_admin());

create policy "token_replay_state_admin_update"
on public.token_replay_state
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "token_replay_state_admin_delete"
on public.token_replay_state
for delete
to authenticated
using (public.is_admin());
