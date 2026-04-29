-- ---------------------------------------------------------------------------
-- Phase 3: drop dead USD-side code that no caller exercises after the
-- refactor.
--
--   apply_balance_adjustment(user, delta_cents, …)
--     The only callers were lib/transactions/adjust-balance.ts (deleted)
--     and the admin USD-adjust route (deleted). Nothing else.
--
--   app_config.usd_swap_fee_bps
--     Read by the USD-leg branch of execute_swap (now blocked) and shown in
--     the admin global-config panel (UI removed). No remaining consumers.
-- ---------------------------------------------------------------------------

drop function if exists public.apply_balance_adjustment(uuid, bigint, bigint, text);
drop function if exists public.apply_balance_adjustment(uuid, bigint, text);

alter table public.app_config
  drop column if exists usd_swap_fee_bps;
