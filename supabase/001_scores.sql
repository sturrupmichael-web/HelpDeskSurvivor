-- The leaderboard's `scores` table, as first set up on 2026-10-20. Only needed for a
-- brand-new Supabase project; the live one already has it. SQL Editor -> New query ->
-- paste all of this -> Run. Then run the other files in this folder in number order.
create table if not exists scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 16),
  map text not null,
  character text not null,
  seconds int not null check (seconds between 0 and 3600),
  csat int not null check (csat >= 0),
  won boolean not null default false,
  created_at timestamptz not null default now()
);
alter table scores enable row level security;
drop policy if exists "anyone can read" on scores;
create policy "anyone can read" on scores for select using (true);
drop policy if exists "anyone can add" on scores;
create policy "anyone can add" on scores for insert with check (true);
