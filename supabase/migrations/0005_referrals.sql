-- ---------------------------------------------------------------------------
-- Sprint 3.5 — Referrals: 5-level pyramid, commissions, fraud flags
-- ---------------------------------------------------------------------------

-- Enums
create type public.commission_status as enum ('pending', 'approved', 'rejected', 'clawed_back');
create type public.referral_flag_kind as enum (
  'SAME_IP', 'VELOCITY', 'RAPID_CHAIN', 'SELF_REFERRAL_ATTEMPT', 'SUSPICIOUS_DEPOSIT'
);

-- ---------------------------------------------------------------------------
-- referrals — one row per (referee, referrer) edge
-- ---------------------------------------------------------------------------
create table public.referrals (
  id                  uuid primary key default gen_random_uuid(),
  referee_user_id     uuid not null references public.profiles (user_id) on delete cascade,
  referrer_user_id    uuid not null references public.profiles (user_id) on delete cascade,
  invited_via_code    text not null,
  first_deposit_fired boolean not null default false,
  created_at          timestamptz not null default timezone('utc', now()),
  constraint referrals_no_self_referral check (referee_user_id <> referrer_user_id),
  constraint referrals_referee_unique unique (referee_user_id)
);

create index referrals_referrer_idx on public.referrals (referrer_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- referral_upline — denormalized 5-level ancestor cache per user
-- ---------------------------------------------------------------------------
create table public.referral_upline (
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  ancestor_id uuid not null references public.profiles (user_id) on delete cascade,
  level      integer not null check (level between 1 and 5),
  created_at  timestamptz not null default timezone('utc', now()),
  primary key (user_id, level),
  constraint referral_upline_no_self check (user_id <> ancestor_id)
);

create index referral_upline_ancestor_idx on public.referral_upline (ancestor_id, level);

-- ---------------------------------------------------------------------------
-- referral_rates — per-user commission rate overrides (bps per level)
-- ---------------------------------------------------------------------------
create table public.referral_rates (
  user_id    uuid primary key references public.profiles (user_id) on delete cascade,
  l1_bps     integer not null default 500  check (l1_bps >= 0 and l1_bps <= 5000),
  l2_bps     integer not null default 300  check (l2_bps >= 0 and l2_bps <= 5000),
  l3_bps     integer not null default 200  check (l3_bps >= 0 and l3_bps <= 5000),
  l4_bps     integer not null default 100  check (l4_bps >= 0 and l4_bps <= 5000),
  l5_bps     integer not null default 50   check (l5_bps >= 0 and l5_bps <= 5000),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_admin_id uuid references public.profiles (user_id) on delete set null
);

-- ---------------------------------------------------------------------------
-- referral_commissions — one row per ancestor per qualifying deposit event
-- ---------------------------------------------------------------------------
create table public.referral_commissions (
  id                  uuid primary key default gen_random_uuid(),
  referee_user_id     uuid not null references public.profiles (user_id) on delete cascade,
  beneficiary_user_id uuid not null references public.profiles (user_id) on delete cascade,
  deposit_id          uuid,    -- nullable until deposits table exists
  level               integer not null check (level between 1 and 5),
  bps_applied         integer not null check (bps_applied >= 0),
  base_amount_cents   bigint  not null check (base_amount_cents > 0),
  commission_cents    bigint  not null check (commission_cents >= 0),
  status              public.commission_status not null default 'pending',
  reviewed_by_admin_id uuid references public.profiles (user_id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

create index referral_commissions_beneficiary_idx
  on public.referral_commissions (beneficiary_user_id, status, created_at desc);
create index referral_commissions_referee_idx
  on public.referral_commissions (referee_user_id, created_at desc);
create index referral_commissions_status_idx
  on public.referral_commissions (status, created_at desc);

create trigger referral_commissions_set_updated_at
  before update on public.referral_commissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- referral_flags — advisory fraud signals raised automatically
-- ---------------------------------------------------------------------------
create table public.referral_flags (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (user_id) on delete cascade,
  kind         public.referral_flag_kind not null,
  detail       jsonb not null default '{}'::jsonb,
  is_resolved  boolean not null default false,
  resolved_by_admin_id uuid references public.profiles (user_id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default timezone('utc', now())
);

create index referral_flags_user_idx on public.referral_flags (user_id, is_resolved, created_at desc);
create index referral_flags_kind_idx on public.referral_flags (kind, is_resolved, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.referrals              enable row level security;
alter table public.referral_upline        enable row level security;
alter table public.referral_rates         enable row level security;
alter table public.referral_commissions   enable row level security;
alter table public.referral_flags         enable row level security;

-- referrals: users see their own rows; admins see all
create policy "referrals_select_own"
  on public.referrals for select
  using (auth.uid() = referee_user_id or auth.uid() = referrer_user_id or public.is_admin());

-- referral_upline: own rows only (or admin)
create policy "referral_upline_select_own"
  on public.referral_upline for select
  using (auth.uid() = user_id or public.is_admin());

-- referral_rates: own row or admin
create policy "referral_rates_select_own"
  on public.referral_rates for select
  using (auth.uid() = user_id or public.is_admin());

-- referral_commissions: beneficiary sees their own pending/approved; admin sees all
create policy "referral_commissions_select_own"
  on public.referral_commissions for select
  using (auth.uid() = beneficiary_user_id or public.is_admin());

-- referral_flags: admin only
create policy "referral_flags_admin_only"
  on public.referral_flags for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helper: get effective bps for a user at a given level
-- ---------------------------------------------------------------------------
create or replace function public.get_commission_bps(p_user_id uuid, p_level integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case p_level
       when 1 then rr.l1_bps
       when 2 then rr.l2_bps
       when 3 then rr.l3_bps
       when 4 then rr.l4_bps
       when 5 then rr.l5_bps
     end
     from public.referral_rates rr
     where rr.user_id = p_user_id),
    case p_level
      when 1 then 500
      when 2 then 300
      when 3 then 200
      when 4 then 100
      when 5 then 50
      else 0
    end
  );
$$;

-- ---------------------------------------------------------------------------
-- bind_referral — called by consume_invite when source='user'
-- Inserts referrals row + builds 5-level upline cache
-- ---------------------------------------------------------------------------
create or replace function public.bind_referral(
  p_referee_user_id  uuid,
  p_referrer_user_id uuid,
  p_code             text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ancestor_row public.referral_upline%rowtype;
  lvl          integer;
  parent_id    uuid;
begin
  -- Insert direct referral edge (level 1)
  insert into public.referrals (referee_user_id, referrer_user_id, invited_via_code)
  values (p_referee_user_id, p_referrer_user_id, p_code)
  on conflict (referee_user_id) do nothing;

  -- Level 1: direct referrer
  insert into public.referral_upline (user_id, ancestor_id, level)
  values (p_referee_user_id, p_referrer_user_id, 1)
  on conflict (user_id, level) do nothing;

  -- Levels 2–5: walk referrer's own upline
  for lvl in 1..4 loop
    select ancestor_id into parent_id
    from public.referral_upline
    where user_id = p_referrer_user_id
      and level = lvl;

    exit when parent_id is null;

    insert into public.referral_upline (user_id, ancestor_id, level)
    values (p_referee_user_id, parent_id, lvl + 1)
    on conflict (user_id, level) do nothing;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_deposit_commissions — fired when admin approves a deposit
-- Creates up to 5 pending commission rows, one per upline ancestor
-- ---------------------------------------------------------------------------
create or replace function public.record_deposit_commissions(
  p_referee_user_id uuid,
  p_deposit_id      uuid,
  p_amount_cents    bigint
)
returns integer  -- number of commissions created
language plpgsql
security definer
set search_path = public
as $$
declare
  upline_row   public.referral_upline%rowtype;
  bps          integer;
  comm_cents   bigint;
  min_deposit  bigint;
  created_count integer := 0;
begin
  -- Read minimum deposit threshold from app_config (default 1000 = $10)
  select coalesce(
    (select (value::jsonb)->>'ref_min_deposit_cents'
     from public.app_config limit 1)::bigint,
    1000
  ) into min_deposit;

  if p_amount_cents < min_deposit then
    return 0;
  end if;

  -- Check this referee hasn't already fired commissions (first-deposit-only)
  if exists (
    select 1 from public.referrals
    where referee_user_id = p_referee_user_id
      and first_deposit_fired = true
  ) then
    return 0;
  end if;

  -- Mark fired
  update public.referrals
  set first_deposit_fired = true
  where referee_user_id = p_referee_user_id;

  -- Walk upline and create commission rows
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
-- check_referral_fraud — advisory only, never blocks
-- ---------------------------------------------------------------------------
create or replace function public.check_referral_fraud(
  p_user_id uuid,
  p_ip      inet default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_row public.referrals%rowtype;
  velocity_count integer;
begin
  select * into ref_row from public.referrals where referee_user_id = p_user_id;
  if not found then return; end if;

  -- Same-IP check
  if p_ip is not null then
    if exists (
      select 1 from public.referrals r2
      join public.referral_flags rf
        on rf.user_id = r2.referee_user_id
       and rf.kind = 'SAME_IP'
      where r2.referrer_user_id = ref_row.referrer_user_id
        and r2.referee_user_id <> p_user_id
        and (rf.detail->>'ip')::inet = p_ip
    ) then
      insert into public.referral_flags (user_id, kind, detail)
      values (p_user_id, 'SAME_IP', jsonb_build_object('ip', p_ip::text))
      on conflict do nothing;
    end if;

    -- Flag if same IP as referrer
    if exists (
      select 1 from public.profiles
      where user_id = ref_row.referrer_user_id
        and (metadata->>'signup_ip')::inet = p_ip
    ) then
      insert into public.referral_flags (user_id, kind, detail)
      values (p_user_id, 'SAME_IP', jsonb_build_object('ip', p_ip::text, 'same_as_referrer', true))
      on conflict do nothing;
    end if;
  end if;

  -- Velocity: referrer brought in 5+ users in 24h
  select count(*) into velocity_count
  from public.referrals
  where referrer_user_id = ref_row.referrer_user_id
    and created_at > now() - interval '24 hours';

  if velocity_count >= 5 then
    insert into public.referral_flags (user_id, kind, detail)
    values (
      ref_row.referrer_user_id,
      'VELOCITY',
      jsonb_build_object('referrals_in_24h', velocity_count)
    )
    on conflict do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- approve_commission — admin approves a pending commission
-- Returns commission row (caller should then credit_bonus)
-- ---------------------------------------------------------------------------
create or replace function public.approve_commission(
  p_commission_id  uuid,
  p_admin_id       uuid,
  p_note           text default null
)
returns public.referral_commissions
language plpgsql
security definer
set search_path = public
as $$
declare
  comm public.referral_commissions%rowtype;
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

  update public.referral_commissions
  set status                = 'approved',
      reviewed_by_admin_id  = p_admin_id,
      reviewed_at           = timezone('utc', now()),
      review_note           = p_note,
      updated_at            = timezone('utc', now())
  where id = p_commission_id
  returning * into comm;

  -- Insert audit action
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

-- ---------------------------------------------------------------------------
-- reject_commission — admin rejects a pending commission
-- ---------------------------------------------------------------------------
create or replace function public.reject_commission(
  p_commission_id  uuid,
  p_admin_id       uuid,
  p_note           text default null
)
returns public.referral_commissions
language plpgsql
security definer
set search_path = public
as $$
declare
  comm public.referral_commissions%rowtype;
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

  update public.referral_commissions
  set status                = 'rejected',
      reviewed_by_admin_id  = p_admin_id,
      reviewed_at           = timezone('utc', now()),
      review_note           = p_note,
      updated_at            = timezone('utc', now())
  where id = p_commission_id
  returning * into comm;

  insert into public.admin_actions (
    admin_id, action, target_type, target_id, after_json, notes
  ) values (
    p_admin_id, 'reject_commission', 'referral_commission',
    p_commission_id::text, to_jsonb(comm), p_note
  );

  return comm;
end;
$$;
