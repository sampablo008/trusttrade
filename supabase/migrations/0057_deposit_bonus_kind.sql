-- ---------------------------------------------------------------------------
-- Deposit bonus, part 1/2: extend the bonus_ticket_kind enum.
--
-- A new enum value must be committed in its own transaction before any later
-- migration can USE it (Postgres forbids using a freshly-added enum value in
-- the same transaction that added it). Keep this file enum-only; the columns
-- and approve_deposit rewrite live in 0058.
-- ---------------------------------------------------------------------------

alter type public.bonus_ticket_kind add value if not exists 'deposit';
