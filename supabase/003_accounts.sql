-- Player accounts: guest accounts plus "Sign in with Google". Run once in Supabase after
-- turning on anonymous sign-ins, manual linking and the Google provider (ACCOUNTS.md).
-- SQL Editor -> New query -> paste all of this -> Run. Safe to run again.
--
-- What it does:
--   1. `players`: one leaderboard name per account. Names are unique (ignoring case),
--      and setting `banned` to true in Table Editor stops that account posting.
--   2. `saves`: one cloud save per account. Each player can only read and write their own.
--   3. `scores`: only accounts can post now, and the name on a posted score always comes
--      from the poster's `players` row, so nobody can post under someone else's name.
--      Old scores stay as they are.

-- 1: names.
create table if not exists public.players (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_unique on public.players (lower(name));
alter table public.players enable row level security;
revoke all on table public.players from anon, authenticated;
grant select on table public.players to authenticated;
grant insert (name), update (name) on table public.players to authenticated;
drop policy if exists "read own name" on public.players;
create policy "read own name" on public.players for select to authenticated using (user_id = auth.uid());
drop policy if exists "claim a name" on public.players;
create policy "claim a name" on public.players for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "rename" on public.players;
create policy "rename" on public.players for update to authenticated
  using (user_id = auth.uid() and not banned) with check (user_id = auth.uid());

-- 2: cloud saves (64 KB max; a save is about 2 KB).
create table if not exists public.saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null check (pg_column_size(data) < 65536),
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
revoke all on table public.saves from anon, authenticated;
grant select on table public.saves to authenticated;
grant insert (data), update (data) on table public.saves to authenticated;
drop policy if exists "own save" on public.saves;
create policy "own save" on public.saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.saves_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists saves_touch on public.saves;
create trigger saves_touch before insert or update on public.saves
  for each row execute function public.saves_touch();

-- 3: scores need an account and take the name from `players`.
alter table public.scores add column if not exists user_id uuid references auth.users on delete set null;
revoke all on table public.scores from anon, authenticated;
grant select on table public.scores to anon, authenticated;
grant insert (map, character, seconds, csat, won) on table public.scores to authenticated;
drop policy if exists "anyone can add" on public.scores;
drop policy if exists "players can add" on public.scores;
create policy "players can add" on public.scores for insert to authenticated with check (true);

create or replace function public.scores_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  select * into p from public.players where user_id = auth.uid();
  if not found then raise exception 'Pick a leaderboard name first.'; end if;
  if p.banned then raise exception 'This account can''t post scores.'; end if;
  new.user_id := auth.uid();
  new.name := p.name;
  new.created_at := now();
  return new;
end $$;
revoke all on function public.scores_stamp() from public, anon, authenticated;
drop trigger if exists scores_stamp on public.scores;
create trigger scores_stamp before insert on public.scores
  for each row execute function public.scores_stamp();
