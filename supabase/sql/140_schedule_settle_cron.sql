-- One-time setup to schedule the settle_expired_trades edge function via
-- pg_cron. Run this in the Supabase SQL editor AFTER enabling the pg_cron
-- and pg_net extensions (Database → Extensions).
--
-- Replace the placeholders below:
--   <PROJECT_REF>         e.g. rjhmzdzcqzdgucpgtxew
--   <SERVICE_ROLE_KEY>    service_role JWT from Project Settings → API
--
-- Fallback safety net: the user SSE stream also settles the caller's own
-- expired trades every second. This cron covers users who aren't connected.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule so re-running is idempotent.
select cron.unschedule(jobid)
from cron.job
where jobname = 'settle_expired_trades_every_2s';

select cron.schedule(
  'settle_expired_trades_every_2s',
  '2 seconds',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/settle_expired_trades',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify:
-- select jobname, schedule, active from cron.job where jobname like '%settle%';
-- select status, start_time, end_time, return_message
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'settle_expired_trades_every_2s')
--   order by start_time desc limit 10;
