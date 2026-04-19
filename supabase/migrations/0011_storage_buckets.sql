insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'token-icons',
    'token-icons',
    true,
    524288,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'promo-assets',
    'promo-assets',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'deposit-proofs',
    'deposit-proofs',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'withdrawal-receipts',
    'withdrawal-receipts',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_first_folder(path text)
returns text
language sql
stable
as $$
  select coalesce((storage.foldername(path))[1], '');
$$;

create policy "storage_public_bucket_select"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id in ('token-icons', 'avatars', 'promo-assets')
);

create policy "storage_admin_select_private"
on storage.objects
for select
to authenticated
using (
  public.is_admin()
  and bucket_id in ('deposit-proofs', 'withdrawal-receipts')
);

create policy "storage_avatar_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_avatar_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_avatar_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_admin_insert_public_assets"
on storage.objects
for insert
to authenticated
with check (
  public.is_admin()
  and bucket_id in ('token-icons', 'promo-assets')
);

create policy "storage_admin_update_public_assets"
on storage.objects
for update
to authenticated
using (
  public.is_admin()
  and bucket_id in ('token-icons', 'promo-assets')
)
with check (
  public.is_admin()
  and bucket_id in ('token-icons', 'promo-assets')
);

create policy "storage_admin_delete_public_assets"
on storage.objects
for delete
to authenticated
using (
  public.is_admin()
  and bucket_id in ('token-icons', 'promo-assets')
);

create policy "storage_deposit_proof_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'deposit-proofs'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_deposit_proof_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'deposit-proofs'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_deposit_proof_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'deposit-proofs'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
)
with check (
  bucket_id = 'deposit-proofs'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_deposit_proof_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'deposit-proofs'
  and (
    public.is_admin()
    or public.storage_first_folder(name) = auth.uid()::text
  )
);

create policy "storage_withdraw_receipt_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  public.is_admin()
  and bucket_id = 'withdrawal-receipts'
);

create policy "storage_withdraw_receipt_admin_update"
on storage.objects
for update
to authenticated
using (
  public.is_admin()
  and bucket_id = 'withdrawal-receipts'
)
with check (
  public.is_admin()
  and bucket_id = 'withdrawal-receipts'
);

create policy "storage_withdraw_receipt_admin_delete"
on storage.objects
for delete
to authenticated
using (
  public.is_admin()
  and bucket_id = 'withdrawal-receipts'
);
