-- Raises the leaderboard's CSAT limit (2026-10-22). The old check from hardening.sql
-- refused more than 300 CSAT a second; long overtime shifts with ticket combos score
-- more than that, so real scores were turned away. Run once in Supabase: SQL Editor ->
-- New query -> paste all of this -> Run. Safe to run again.
alter table public.scores drop constraint if exists scores_csat_plausible;
alter table public.scores add constraint scores_csat_plausible
  check (csat <= seconds * 10000) not valid;
