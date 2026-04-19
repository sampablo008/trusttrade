alter table public.wallet_addresses
  add column if not exists qr_code_path text;
