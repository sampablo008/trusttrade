-- Ensure Supabase Realtime delivers changes on user_trades and user_balances.
-- Without this, client SSE never sees settlement events, so trades visually
-- stick on "Settling…" until a page refetch.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.user_trades;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.user_balances;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
