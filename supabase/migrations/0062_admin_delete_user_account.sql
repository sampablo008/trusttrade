-- ---------------------------------------------------------------------------
-- Admin RPC: hard-delete a user account and ALL of its data.
--
-- "Start fresh" semantics: every row tied to the user is removed, including the
-- auth.users identity, so the email/username are freed and the person can sign
-- up again from scratch.
--
-- Deleting auth.users cascades to profiles, which in turn cascades to every
-- table whose user FK is ON DELETE CASCADE (user_balances, user_token_balances,
-- bonus_tickets, referrals, referral_upline, referral_rates,
-- referral_commissions, referral_flags, invitation_codes, verification_codes,
-- user_primary_withdrawal_addresses, ...). Supabase's own auth.* subtables
-- (identities, sessions, refresh_tokens) cascade off auth.users too.
--
-- Five tables use ON DELETE RESTRICT and would otherwise block the delete, so we
-- clear them explicitly first: transactions, user_trades, deposits,
-- withdrawals, swaps. Rows in other users' tables that point at this user via
-- SET NULL / CASCADE FKs are handled by those FK rules.
--
-- Guards: cannot delete your own account, cannot delete another admin (avoids
-- locking the platform out of its admins).
--
-- The audit row is written BEFORE the delete; admin_actions.target_id is a bare
-- uuid (no FK) so it survives, and admin_user_id points at the acting admin
-- (a different account) so it is preserved too.
-- ---------------------------------------------------------------------------

create or replace function public.admin_delete_user_account(
  p_user_id  uuid,
  p_admin_id uuid,
  p_reason   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  select user_id, email, username, role
    into v_profile
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'USER_NOT_FOUND' using hint = 'User does not exist.';
  end if;

  if p_user_id = p_admin_id then
    raise exception 'CANNOT_DELETE_SELF'
      using hint = 'You cannot delete your own account.';
  end if;

  if v_profile.role = 'admin' then
    raise exception 'CANNOT_DELETE_ADMIN'
      using hint = 'Admin accounts cannot be deleted from here.';
  end if;

  -- Audit first, while the profile still exists.
  insert into public.admin_actions (
    action_type, admin_user_id, target_id, target_type, note, before_state
  )
  values (
    'delete_user_account',
    p_admin_id,
    p_user_id,
    'profiles',
    coalesce(p_reason, 'Account deleted'),
    jsonb_build_object(
      'email',    v_profile.email,
      'username', v_profile.username,
      'role',     v_profile.role
    )
  );

  -- Clear the ON DELETE RESTRICT tables that would block the cascade.
  delete from public.withdrawals  where user_id = p_user_id;
  delete from public.deposits     where user_id = p_user_id;
  delete from public.swaps        where user_id = p_user_id;
  delete from public.user_trades  where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;

  -- Removing the auth identity cascades profiles + every ON DELETE CASCADE table.
  delete from auth.users where id = p_user_id;
end;
$$;

-- Only the service-role (server-side admin client) may call this. Deliberately
-- NOT granted to `authenticated` so it can never be reached as a user RPC.
grant execute on function public.admin_delete_user_account(uuid, uuid, text) to service_role;
