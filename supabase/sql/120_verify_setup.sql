select
  id,
  expiry_policy,
  global_trade_freeze,
  signup_bonus_cents,
  rate_limit_per_10s,
  bonus_wager_multiplier,
  bonus_ticket_ttl_days,
  ref_default_l1_bps,
  ref_default_l2_bps,
  ref_default_l3_bps,
  ref_default_l4_bps,
  ref_default_l5_bps,
  ref_min_deposit_cents,
  withdraw_min_cents,
  withdraw_fee_cents
from public.app_config;

select
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_name = 'on_auth_user_created';

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'user_balances',
    'transactions',
    'tokens',
    'trade_periods',
    'user_trades',
    'candles_1s',
    'app_config',
    'admin_actions'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
