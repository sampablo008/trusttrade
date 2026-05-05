-- Per-token minimum swap amount (FROM-side, in native units).
-- Mirrors the existing min_deposit / min_withdrawal pattern so the admin
-- token control panel can enforce a floor on swap source amounts.

alter table public.tokens
  add column if not exists min_swap numeric(38, 18) not null default 0;

alter table public.tokens
  add constraint tokens_min_swap_non_negative check (min_swap >= 0);
