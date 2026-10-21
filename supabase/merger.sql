-- Merger Day map (2026-10-21): lets the leaderboard accept scores from the new map.
-- Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run. Safe to
-- run again. (supabase/hardening.sql has the same list, for a fresh setup.)
alter table public.scores drop constraint if exists scores_map_known;
alter table public.scores add constraint scores_map_known
  check (map in ('office', 'server', 'callcenter', 'garage', 'merger')) not valid;
