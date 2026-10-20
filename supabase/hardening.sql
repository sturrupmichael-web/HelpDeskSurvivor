-- Leaderboard hardening for the `scores` table. Run once in Supabase: SQL Editor ->
-- New query -> paste all of this -> Run. Safe to run again.
--
-- What it does:
--   1. Visitors can only fill in the score columns. Before this they could also set
--      `created_at`, e.g. to backdate a row.
--   2. Visitors can't update, delete or empty the table, even by accident in a future
--      policy change. Row level security already blocks updates and deletes; this also
--      covers TRUNCATE, which row level security doesn't.
--   3. Rejects rows a real shift can't produce: unknown maps, oversized character
--      names, impossible CSAT for the time played, and "won" before 20:00. Rows already
--      in the table are not checked (NOT VALID); delete any fakes in Table Editor.
--   4. At most 30 new scores per minute across everyone, so a script can't flood the
--      board.

-- 1 + 2: column-level insert only; nothing else for visitors.
revoke all on table public.scores from anon, authenticated;
grant select on table public.scores to anon, authenticated;
grant insert (name, map, character, seconds, csat, won) on table public.scores to anon, authenticated;

-- 3: plausibility checks. CSAT is at most 5 points a kill, and even a perfect shift
-- closes well under 60 users a second.
alter table public.scores drop constraint if exists scores_map_known;
alter table public.scores add constraint scores_map_known
  check (map in ('office', 'server', 'callcenter', 'garage')) not valid;
alter table public.scores drop constraint if exists scores_character_len;
alter table public.scores add constraint scores_character_len
  check (char_length(character) between 1 and 40) not valid;
alter table public.scores drop constraint if exists scores_csat_plausible;
alter table public.scores add constraint scores_csat_plausible
  check (csat <= seconds * 300) not valid;
alter table public.scores drop constraint if exists scores_won_after_shift;
alter table public.scores add constraint scores_won_after_shift
  check (not won or seconds >= 1200) not valid;

-- 4: flood limit.
create or replace function public.scores_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.scores where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many scores right now. Try again in a minute.';
  end if;
  return new;
end $$;
revoke all on function public.scores_rate_limit() from public, anon, authenticated;
create index if not exists scores_created_at on public.scores (created_at);
drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores
  for each row execute function public.scores_rate_limit();
