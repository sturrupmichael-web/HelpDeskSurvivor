-- Fixes from the second security review (SECURITY.md, 2026-10-24). Run once in Supabase
-- after 009_hardcore.sql: SQL Editor -> New query -> paste all of this -> Run. Safe to
-- run again. Nothing the game sends today is refused.
--
-- What it does:
--   1. Names can't hide characters: no invisible ones (zero-width spaces, right-to-left
--      marks and the like), no control characters, no spaces at the ends or two in a row.
--      Without this, someone could claim "Pam" plus an invisible character and pass as
--      Pam on the board. The game already strips these; this stops anyone going around
--      the game. Names already taken are left alone (NOT VALID).
--   2. Renaming takes your scores with you. Before, old scores kept the old name, so the
--      next player to claim that name looked like they owned them (tapping the name
--      opened the newcomer's profile).
--   3. At most 5 scores a minute from one player, on top of the 30 a minute for everyone
--      (002_hardening.sql), so one account can't fill the shared limit on its own.

-- 1: names.
alter table public.players drop constraint if exists players_name_clean;
alter table public.players add constraint players_name_clean check (
  name = btrim(name)
  and name !~ '  '
  and name !~ '[\u0000-\u001f\u007f-\u009f­͏؜ᅟᅠ឴឵᠎​-‏ -  -⁯ㅤ︀-️﻿ﾠ]'
) not valid;

-- 2: a rename renames the player's scores too.
create or replace function public.players_rename_scores() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name then
    begin
      update public.scores set name = new.name where user_id = new.user_id;
    exception when check_violation then
      null; -- an old score that today's checks refuse: leave the scores as they were
    end;
  end if;
  return new;
end $$;
revoke all on function public.players_rename_scores() from public, anon, authenticated;
drop trigger if exists players_rename_scores on public.players;
create trigger players_rename_scores after update of name on public.players
  for each row execute function public.players_rename_scores();
create index if not exists scores_user_id on public.scores (user_id);

-- 3: per-player flood limit.
create or replace function public.scores_player_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.scores
      where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Too many scores right now. Try again in a minute.';
  end if;
  return new;
end $$;
revoke all on function public.scores_player_limit() from public, anon, authenticated;
drop trigger if exists scores_player_limit on public.scores;
create trigger scores_player_limit before insert on public.scores
  for each row execute function public.scores_player_limit();
