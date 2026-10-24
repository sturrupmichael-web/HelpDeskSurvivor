-- Hardcore (idea 6, 2026-10-24): Hardcore shifts count double on the leaderboard, so a
-- Hardcore shift with bad policies can reach x6 (policies up to x3, times 2). The old
-- check refused anything over x3. Run once in Supabase: SQL Editor -> New query -> paste
-- all of this -> Run. Safe to run again.
--
-- Hardcore shifts are marked with "hardcore" in `mods` (no new column). Only those may go
-- over x3, and never over x6.

alter table public.scores drop constraint if exists scores_mult_check;
alter table public.scores drop constraint if exists scores_mult_range;
alter table public.scores add constraint scores_mult_range
  check (mult between 0.5 and 3 or (mult <= 6 and mods ~ '(^|,)hardcore(,|$)'));
