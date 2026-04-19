create type public.invitation_source as enum ('admin', 'user');
create type public.invitation_status as enum ('active', 'used', 'revoked', 'expired');

create table public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  source public.invitation_source not null,
  status public.invitation_status not null default 'active',
  owner_user_id uuid unique references public.profiles (user_id) on delete cascade,
  created_by_admin_id uuid references public.profiles (user_id) on delete set null,
  note text,
  is_single_use boolean not null default false,
  used_count integer not null default 0,
  used_by_user_id uuid references public.profiles (user_id) on delete set null,
  used_at timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invitation_codes_code_format check (
    code ~ '^[A-Z0-9._-]{4,64}$'
  ),
  constraint invitation_codes_used_count_non_negative check (used_count >= 0),
  constraint invitation_codes_user_source_owner check (
    (source = 'user' and owner_user_id is not null and is_single_use = false)
    or
    (source = 'admin' and owner_user_id is null and is_single_use = true)
  )
);

create index invitation_codes_status_idx
  on public.invitation_codes (status, source, created_at desc);

create index invitation_codes_owner_idx
  on public.invitation_codes (owner_user_id);

create trigger invitation_codes_set_updated_at
before update on public.invitation_codes
for each row
execute function public.set_updated_at();

create or replace function public.normalize_invite_code(raw_code text)
returns text
language sql
immutable
as $$
  select upper(trim(raw_code));
$$;

create or replace function public.sync_user_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
begin
  if new.username is null or new.username = '' then
    return new;
  end if;

  normalized_code := public.normalize_invite_code('REF_' || new.username);

  insert into public.invitation_codes (
    code,
    source,
    status,
    owner_user_id,
    is_single_use
  )
  values (
    normalized_code,
    'user',
    'active',
    new.user_id,
    false
  )
  on conflict (owner_user_id) do update
  set
    code = excluded.code,
    status = case
      when public.invitation_codes.status = 'revoked' then public.invitation_codes.status
      else 'active'
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists sync_user_invite_code_on_profile on public.profiles;

create trigger sync_user_invite_code_on_profile
after insert or update of username on public.profiles
for each row
execute function public.sync_user_invite_code();

insert into public.invitation_codes (
  code,
  source,
  status,
  owner_user_id,
  is_single_use
)
select
  public.normalize_invite_code('REF_' || profiles.username),
  'user',
  'active',
  profiles.user_id,
  false
from public.profiles
where profiles.username is not null
on conflict (owner_user_id) do nothing;

create or replace function public.refresh_invitation_code_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitation_codes
  set
    status = 'expired',
    updated_at = timezone('utc', now())
  where status = 'active'
    and expires_at is not null
    and expires_at <= timezone('utc', now());
end;
$$;

create or replace function public.validate_invite(p_code text)
returns table (
  valid boolean,
  code text,
  source public.invitation_source,
  owner_user_id uuid,
  expires_at timestamptz,
  status public.invitation_status,
  is_single_use boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invitation_codes%rowtype;
  normalized_code text := public.normalize_invite_code(p_code);
begin
  perform public.refresh_invitation_code_statuses();

  select *
  into invite_row
  from public.invitation_codes
  where invitation_codes.code = normalized_code;

  if not found then
    return query
    select false, normalized_code, null::public.invitation_source, null::uuid, null::timestamptz, null::public.invitation_status, null::boolean;
    return;
  end if;

  return query
  select
    (
      invite_row.status = 'active'
      and (invite_row.expires_at is null or invite_row.expires_at > timezone('utc', now()))
    ) as valid,
    invite_row.code,
    invite_row.source,
    invite_row.owner_user_id,
    invite_row.expires_at,
    invite_row.status,
    invite_row.is_single_use;
end;
$$;

create or replace function public.consume_invite(
  p_user_id uuid,
  p_code text,
  p_ip inet default null,
  p_user_agent text default null
)
returns table (
  code text,
  source public.invitation_source,
  owner_user_id uuid,
  status public.invitation_status,
  used_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invitation_codes%rowtype;
  normalized_code text := public.normalize_invite_code(p_code);
  next_status public.invitation_status;
begin
  perform public.refresh_invitation_code_statuses();

  select *
  into invite_row
  from public.invitation_codes
  where invitation_codes.code = normalized_code
  for update;

  if not found then
    raise exception 'Invite code not found.'
      using errcode = 'P0001', detail = 'INVITE_NOT_FOUND';
  end if;

  if invite_row.status <> 'active' then
    raise exception 'Invite code is not active.'
      using errcode = 'P0001', detail = 'CODE_INACTIVE';
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at <= timezone('utc', now()) then
    update public.invitation_codes
    set
      status = 'expired',
      updated_at = timezone('utc', now())
    where id = invite_row.id;

    raise exception 'Invite code has expired.'
      using errcode = 'P0001', detail = 'CODE_EXPIRED';
  end if;

  if invite_row.source = 'user' and invite_row.owner_user_id = p_user_id then
    raise exception 'Users cannot consume their own referral code.'
      using errcode = 'P0001', detail = 'SELF_REFERRAL_BLOCKED';
  end if;

  next_status := case
    when invite_row.is_single_use then 'used'::public.invitation_status
    else 'active'::public.invitation_status
  end;

  update public.invitation_codes
  set
    status = next_status,
    used_count = used_count + 1,
    used_by_user_id = p_user_id,
    used_at = case
      when invite_row.is_single_use then timezone('utc', now())
      else used_at
    end,
    last_used_at = timezone('utc', now()),
    metadata = jsonb_strip_nulls(
      coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_ip', p_ip::text,
        'last_user_agent', p_user_agent
      )
    ),
    updated_at = timezone('utc', now())
  where id = invite_row.id;

  return query
  select
    invitation_codes.code,
    invitation_codes.source,
    invitation_codes.owner_user_id,
    invitation_codes.status,
    invitation_codes.used_count
  from public.invitation_codes
  where id = invite_row.id;
end;
$$;

create or replace function public.mint_invite_codes(
  p_count integer,
  p_expires_at timestamptz default null,
  p_note text default null
)
returns table (
  code text,
  expires_at timestamptz,
  note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_user_id uuid := auth.uid();
  generated_code text;
  created_count integer := 0;
begin
  if admin_user_id is null or not public.is_admin() then
    raise exception 'Admin access required.'
      using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  if p_count < 1 or p_count > 1000 then
    raise exception 'Mint count must be between 1 and 1000.'
      using errcode = 'P0001', detail = 'INVALID_BATCH_SIZE';
  end if;

  while created_count < p_count loop
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    begin
      insert into public.invitation_codes (
        code,
        source,
        status,
        created_by_admin_id,
        note,
        is_single_use,
        expires_at
      )
      values (
        generated_code,
        'admin',
        'active',
        admin_user_id,
        p_note,
        true,
        p_expires_at
      );

      created_count := created_count + 1;

      return query
      select generated_code, p_expires_at, p_note;
    exception
      when unique_violation then
        continue;
    end;
  end loop;
end;
$$;

create or replace function public.revoke_invite(p_code text)
returns table (
  code text,
  status public.invitation_status,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_user_id uuid := auth.uid();
  normalized_code text := public.normalize_invite_code(p_code);
begin
  if admin_user_id is null or not public.is_admin() then
    raise exception 'Admin access required.'
      using errcode = '42501', detail = 'FORBIDDEN';
  end if;

  update public.invitation_codes
  set
    status = 'revoked',
    revoked_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where invitation_codes.code = normalized_code
    and invitation_codes.status <> 'used'
  returning
    invitation_codes.code,
    invitation_codes.status,
    invitation_codes.revoked_at
  into code, status, revoked_at;

  if code is null then
    raise exception 'Invite code could not be revoked.'
      using errcode = 'P0001', detail = 'INVITE_REVOKE_FAILED';
  end if;

  return next;
end;
$$;

alter table public.invitation_codes enable row level security;

create policy "invitation_codes_select_own_or_admin"
on public.invitation_codes
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or created_by_admin_id = auth.uid()
  or public.is_admin()
);

insert into public.invitation_codes (
  code,
  source,
  status,
  created_by_admin_id,
  note,
  is_single_use
)
select
  'K7X9M2PQ4R',
  'admin',
  'active',
  null,
  'Preview root invite',
  true
where not exists (
  select 1
  from public.invitation_codes
  where code = 'K7X9M2PQ4R'
);
