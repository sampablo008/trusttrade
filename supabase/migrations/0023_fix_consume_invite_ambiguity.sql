-- Fix: `SET used_count = used_count + 1` in consume_invite is ambiguous
-- because the function's RETURNS TABLE declares an OUT parameter also named
-- `used_count`. Qualify the right-hand side with the table name.
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
    used_count = invitation_codes.used_count + 1,
    used_by_user_id = p_user_id,
    used_at = case
      when invite_row.is_single_use then timezone('utc', now())
      else invitation_codes.used_at
    end,
    last_used_at = timezone('utc', now()),
    metadata = jsonb_strip_nulls(
      coalesce(invitation_codes.metadata, '{}'::jsonb) || jsonb_build_object(
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
