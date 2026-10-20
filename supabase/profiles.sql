-- Public player profiles (what anyone sees after tapping a leaderboard name) and the
-- game version on posted scores. Run once in Supabase after accounts.sql: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.
--
-- One read-only function that returns, for a leaderboard name: when they joined, their
-- best score and longest shift per map, how many scores and wins they posted, their most
-- played character, shifts worked and unlocked achievements. Nothing else from the save,
-- and never an email address. Banned players have no profile.

create or replace function public.player_profile(p_name text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', p.name,
    'since', p.created_at,
    'posted', (select count(*) from public.scores s where s.user_id = p.user_id),
    'wins', (select count(*) from public.scores s where s.user_id = p.user_id and s.won),
    'favourite', (
      select s.character from public.scores s where s.user_id = p.user_id
      group by s.character order by count(*) desc, max(s.created_at) desc limit 1),
    'best', coalesce((
      select jsonb_agg(jsonb_build_object('map', s.map, 'csat', max_csat, 'seconds', max_seconds, 'won', any_won) order by s.map)
      from (select map, max(csat) max_csat, max(seconds) max_seconds, bool_or(won) any_won
            from public.scores where user_id = p.user_id group by map) s), '[]'::jsonb),
    'shifts', (
      select case when jsonb_typeof(sv.data->'shifts') = 'number' then (sv.data->>'shifts')::numeric::int end
      from public.saves sv where sv.user_id = p.user_id),
    'achievements', coalesce((
      select jsonb_agg(k) from public.saves sv,
        jsonb_object_keys(case when jsonb_typeof(sv.data->'achievements') = 'object' then sv.data->'achievements' else '{}' end) k
      where sv.user_id = p.user_id), '[]'::jsonb)
  )
  from public.players p
  where lower(p.name) = lower(p_name) and not p.banned
$$;
revoke all on function public.player_profile(text) from public;
grant execute on function public.player_profile(text) to anon, authenticated;

-- Game version on posted scores, so you can see in Table Editor which build a tester
-- was playing. Old scores and old copies of the game leave it empty.
alter table public.scores add column if not exists version text check (char_length(version) <= 20);
grant insert (map, character, seconds, csat, won, version) on table public.scores to authenticated;
