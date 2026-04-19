-- ---------------------------------------------------------------------------
-- Sprint 4 — Bonus Wagering: bonus_tickets table + credit/expire functions
-- ---------------------------------------------------------------------------

create type public.bonus_ticket_status as enum ('locked', 'released', 'expired');
create type public.bonus_ticket_kind   as enum ('signup', 'commission', 'gift', 'admin');

-- ---------------------------------------------------------------------------
-- bonus_tickets — locked bonus balance with wager-progress tracking
-- ---------------------------------------------------------------------------
create table public.bonus_tickets (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (user_id) on delete cascade,
  kind                  public.bonus_ticket_kind not null,
  amount_cents          bigint not null check (amount_cents > 0),
  wager_required_cents  bigint not null check (wager_required_cents > 0),
  wager_progress_cents  bigint not null default 0 check (wager_progress_cents >= 0),
  status                public.bonus_ticket_status not null default 'locked',
  reference_type        text,
  reference_id          uuid,
  note                  text,
  expires_at            timestamptz not null,
  released_at           timestamptz,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  constraint bonus_tickets_progress_lte_required
    check (wager_progress_cents <= wager_required_cents),
  constraint bonus_tickets_released_has_timestamp
    check (status <> 'released' or released_at is not null)
);

create index bonus_tickets_user_status_idx
  on public.bonus_tickets (user_id, status, created_at asc);
create index bonus_tickets_expires_idx
  on public.bonus_tickets (expires_at)
  where status = 'locked';

create trigger bonus_tickets_updated_at
  before update on public.bonus_tickets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- credit_bonus: create a bonus ticket, lock the amount in user_balances
-- ---------------------------------------------------------------------------
create or replace function public.credit_bonus(
  p_user_id        uuid,
  p_amount_cents   bigint,
  p_kind           public.bonus_ticket_kind,
  p_reference_type text default null,
  p_reference_id   uuid default null,
  p_note           text default null
)
returns public.bonus_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config      record;
  v_ticket      public.bonus_tickets;
  v_wager_req   bigint;
  v_expires_at  timestamptz;
begin
  select bonus_wager_multiplier, bonus_ticket_ttl_days
  into v_config
  from public.app_config
  limit 1;

  v_wager_req  := ceil(p_amount_cents * v_config.bonus_wager_multiplier);
  v_expires_at := timezone('utc', now()) + (v_config.bonus_ticket_ttl_days * interval '1 day');

  insert into public.bonus_tickets (
    user_id, kind, amount_cents, wager_required_cents,
    reference_type, reference_id, note, expires_at
  )
  values (
    p_user_id, p_kind, p_amount_cents, v_wager_req,
    p_reference_type, p_reference_id, p_note, v_expires_at
  )
  returning * into v_ticket;

  -- Lock the bonus in user_balances
  update public.user_balances
  set
    locked_bonus_cents = locked_bonus_cents + p_amount_cents,
    updated_at = now()
  where user_id = p_user_id;

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_bonus_tickets: forfeit locked tickets past their expiry
-- Called by daily cron edge function
-- ---------------------------------------------------------------------------
create or replace function public.expire_bonus_tickets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket    record;
  v_expired   integer := 0;
begin
  for v_ticket in
    select id, user_id, amount_cents
    from public.bonus_tickets
    where status = 'locked'
      and expires_at <= timezone('utc', now())
    for update skip locked
  loop
    update public.bonus_tickets
    set
      status     = 'expired',
      updated_at = now()
    where id = v_ticket.id;

    -- Debit both balance and locked_bonus (forfeit)
    update public.user_balances
    set
      balance_cents      = greatest(balance_cents - v_ticket.amount_cents, 0),
      locked_bonus_cents = greatest(locked_bonus_cents - v_ticket.amount_cents, 0),
      updated_at         = now()
    where user_id = v_ticket.user_id;

    insert into public.transactions (
      user_id, kind, amount_cents, memo, reference_type, reference_id
    )
    values (
      v_ticket.user_id,
      'bonus_expired',
      -v_ticket.amount_cents,
      'Bonus ticket expired before wager requirement met',
      'bonus_tickets',
      v_ticket.id
    );

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;
