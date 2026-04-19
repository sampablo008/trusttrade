-- Replace the email below before running.
-- This must be executed only after the auth user already exists
-- and the handle_new_user trigger has created the profile row.

update public.profiles
set
  role = 'admin',
  updated_at = timezone('utc', now())
where email = lower('YOUR_ADMIN_EMAIL_HERE');

select
  user_id,
  email,
  role,
  username,
  is_frozen,
  created_at,
  updated_at
from public.profiles
where email = lower('YOUR_ADMIN_EMAIL_HERE');
