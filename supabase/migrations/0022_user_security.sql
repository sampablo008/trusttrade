-- ---------------------------------------------------------------------------
-- User security: withdrawal PIN + email/password verification codes
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists withdrawal_pin_hash text;

create type public.verification_purpose as enum (
  'email_verification',
  'password_reset',
  'login_code'
);

-- ---------------------------------------------------------------------------
-- verification_codes — single-use, time-bounded OTPs
-- Codes are stored hashed (bcrypt). At most one active (unconsumed, unexpired)
-- row per (email, purpose). Expired rows kept for audit until compaction.
-- ---------------------------------------------------------------------------
create table public.verification_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  purpose     public.verification_purpose not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  attempts    smallint not null default 0,
  created_at  timestamptz not null default timezone('utc', now()),
  constraint verification_codes_expires_future check (expires_at > created_at),
  constraint verification_codes_attempts_non_negative check (attempts >= 0)
);

create index verification_codes_email_purpose_idx
  on public.verification_codes (lower(email), purpose, created_at desc);

create index verification_codes_user_purpose_idx
  on public.verification_codes (user_id, purpose, created_at desc)
  where user_id is not null;

create index verification_codes_expires_idx
  on public.verification_codes (expires_at)
  where consumed_at is null;

-- RLS: only service role can read/write. Never exposed to client.
alter table public.verification_codes enable row level security;

-- ---------------------------------------------------------------------------
-- consume_verification_code: atomically verify and mark a code as used
-- Returns the consumed row if match, else raises.
-- ---------------------------------------------------------------------------
create or replace function public.consume_verification_code(
  p_email   text,
  p_purpose public.verification_purpose,
  p_code_hash text
)
returns public.verification_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.verification_codes%rowtype;
begin
  -- Grab the most recent unconsumed row for this email + purpose that matches hash.
  select *
    into v_row
  from public.verification_codes
  where lower(email) = lower(p_email)
    and purpose = p_purpose
    and consumed_at is null
    and expires_at > timezone('utc', now())
    and code_hash = p_code_hash
  order by created_at desc
  limit 1
  for update;

  if not found then
    -- Bump attempts on the most recent active row (if any) so we can rate-limit.
    update public.verification_codes
      set attempts = attempts + 1
    where id = (
      select id from public.verification_codes
      where lower(email) = lower(p_email)
        and purpose = p_purpose
        and consumed_at is null
        and expires_at > timezone('utc', now())
      order by created_at desc
      limit 1
    );
    raise exception 'CODE_INVALID';
  end if;

  update public.verification_codes
    set consumed_at = timezone('utc', now())
  where id = v_row.id;

  -- Invalidate other unconsumed codes for same email+purpose.
  update public.verification_codes
    set consumed_at = timezone('utc', now())
  where lower(email) = lower(p_email)
    and purpose = p_purpose
    and consumed_at is null
    and id <> v_row.id;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- invalidate_verification_codes: mark all active codes for email+purpose used
-- Called when issuing a new code to prevent stacking.
-- ---------------------------------------------------------------------------
create or replace function public.invalidate_verification_codes(
  p_email   text,
  p_purpose public.verification_purpose
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.verification_codes
    set consumed_at = timezone('utc', now())
  where lower(email) = lower(p_email)
    and purpose = p_purpose
    and consumed_at is null;
end;
$$;

revoke all on function public.consume_verification_code(text, public.verification_purpose, text) from public;
revoke all on function public.invalidate_verification_codes(text, public.verification_purpose) from public;
grant execute on function public.consume_verification_code(text, public.verification_purpose, text) to service_role;
grant execute on function public.invalidate_verification_codes(text, public.verification_purpose) to service_role;
