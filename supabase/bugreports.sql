-- Bug reports from the in-game "Report a Bug" button. Run once in Supabase:
-- SQL Editor -> New query -> paste all of this -> Run. Safe to run again.
--
-- What it does:
--   1. `bug_reports`: one row per report, with the player's message, the game version
--      and what the game was doing (map, character, shift time, device, recent errors).
--      Players can only add reports, never read them; you read them in Table Editor.
--      Set `status` to anything you like (e.g. fixed) to keep track.
--   2. Each report is stamped with the sender's account and leaderboard name, so a
--      report can't pretend to be from someone else.
--   3. Flood limits: 5 reports per player per 10 minutes, 60 per hour for everyone.

-- 1: the table.
create table if not exists public.bug_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users on delete set null,
  name text,
  message text not null check (char_length(message) between 1 and 1000),
  version text check (char_length(version) <= 20),
  context jsonb check (pg_column_size(context) < 8192),
  status text not null default 'new'
);
create index if not exists bug_reports_created_at on public.bug_reports (created_at);
alter table public.bug_reports enable row level security;
revoke all on table public.bug_reports from anon, authenticated;
grant insert (message, version, context) on table public.bug_reports to authenticated;
drop policy if exists "players can report" on public.bug_reports;
create policy "players can report" on public.bug_reports for insert to authenticated with check (true);

-- 2 + 3: stamp the sender and limit floods.
create or replace function public.bug_reports_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from public.players where user_id = auth.uid() and banned) then
    raise exception 'This account can''t send reports.';
  end if;
  if (select count(*) from public.bug_reports
      where user_id = auth.uid() and created_at > now() - interval '10 minutes') >= 5
    or (select count(*) from public.bug_reports where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many reports right now. Try again later.';
  end if;
  new.user_id := auth.uid();
  new.name := (select name from public.players where user_id = auth.uid());
  new.created_at := now();
  new.status := 'new';
  return new;
end $$;
revoke all on function public.bug_reports_stamp() from public, anon, authenticated;
drop trigger if exists bug_reports_stamp on public.bug_reports;
create trigger bug_reports_stamp before insert on public.bug_reports
  for each row execute function public.bug_reports_stamp();
