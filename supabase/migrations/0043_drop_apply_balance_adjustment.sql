-- Follow-up to 0042: the drop in 0042 used the wrong parameter order so the
-- function was left in place. Drop it now with the actual signature defined
-- in 0017 (uuid, bigint, text, bigint).

drop function if exists public.apply_balance_adjustment(uuid, bigint, text, bigint);
