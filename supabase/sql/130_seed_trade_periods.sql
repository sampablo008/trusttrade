-- Seed the six standard trade durations. Idempotent on label.
insert into public.trade_periods
  (label, duration_seconds, min_amount_cents, max_amount_cents, payout_bps, is_enabled)
values
  ('30s',  30,    1000,   50000, 18500, true),
  ('60s',  60,    1000,  100000, 18500, true),
  ('5m',   300,   2500,  150000, 18500, true),
  ('15m',  900,   5000,  250000, 18500, true),
  ('1h',   3600, 10000,  500000, 18500, true),
  ('1d',   86400, 25000, 1000000, 18500, true)
on conflict (label) do nothing;
