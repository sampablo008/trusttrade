-- ---------------------------------------------------------------------------
-- Signup bonus is now an explicit claim, not an auto-credit.
--
-- Before:
--   handle_new_user → directly credited USDT into user_token_balances.
--   No bonus_tickets row was ever created for kind='signup'.
--
-- After:
--   handle_new_user only seeds the profile.
--   profiles.signup_bonus_claimed_at gates a one-shot claim.
--   claim_signup_bonus(user_id) → routes through credit_bonus(...,'signup',...)
--   so the bonus appears in bonus_tickets (audit trail + wager system) and
--   USDT is credited only after the user clicks claim.
-- ---------------------------------------------------------------------------

-- 1. Track claim state on the profile. Existing users (pre-migration) are
--    treated as already-claimed: their bonus was auto-credited under the old
--    trigger, so we backfill claimed_at to the row's created_at to prevent
--    a second free credit.
alter table public.profiles
  add column if not exists signup_bonus_claimed_at timestamptz;

update public.profiles
set signup_bonus_claimed_at = coalesce(signup_bonus_claimed_at, created_at)
where signup_bonus_claimed_at is null;

-- 2. Strip the auto-credit out of handle_new_user. Just seed the profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_email        text := lower(coalesce(new.email, ''));
  derived_username     text := 'user_' || left(replace(new.id::text, '-', ''), 12);
  derived_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (
    user_id, email, role, username, display_name, signup_bonus_claimed_at
  )
  values (
    new.id,
    derived_email,
    'user',
    derived_username,
    coalesce(derived_display_name, split_part(derived_email, '@', 1)),
    null
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 3. Claim RPC. Idempotent via signup_bonus_claimed_at gate.
create or replace function public.claim_signup_bonus(
  p_user_id uuid
)
returns public.bonus_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile            public.profiles;
  v_signup_bonus_cents bigint;
  v_ticket             public.bonus_tickets;
begin
  select * into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using hint = 'No profile for this user.';
  end if;

  if v_profile.signup_bonus_claimed_at is not null then
    raise exception 'BONUS_ALREADY_CLAIMED'
      using hint = 'Signup bonus has already been claimed.';
  end if;

  select coalesce(signup_bonus_cents, 0) into v_signup_bonus_cents
  from public.app_config limit 1;

  if v_signup_bonus_cents <= 0 then
    raise exception 'BONUS_NOT_CONFIGURED'
      using hint = 'Signup bonus amount is not configured.';
  end if;

  v_ticket := public.credit_bonus(
    p_user_id,
    v_signup_bonus_cents,
    'signup',
    'profiles',
    p_user_id,
    'Welcome bonus claimed'
  );

  update public.profiles
  set signup_bonus_claimed_at = now(),
      updated_at              = now()
  where user_id = p_user_id;

  return v_ticket;
end;
$$;

grant execute on function public.claim_signup_bonus(uuid) to authenticated;
