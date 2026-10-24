-- Shift Policies (idea 25, 2026-10-21): the leaderboard ranks by CSAT x the policies'
-- multiplier. Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again. Old scores count as clean shifts (no policies, x1).
--
--   mods   the policies on the shift, comma separated ("casualFriday,budgetCuts"),
--          empty for a clean shift. Letters and commas only.
--   mult   their pay and score multiplier, 0.5 to 3 (the game clamps it there too).
--   score  worked out by the database: round(csat * mult). What the board ranks by.

alter table public.scores add column if not exists mods text not null default ''
  check (char_length(mods) <= 120 and mods ~ '^[A-Za-z,]*$');
alter table public.scores add column if not exists mult numeric(4, 2) not null default 1
  check (mult between 0.5 and 3);
alter table public.scores add column if not exists score bigint
  generated always as (round(csat * mult)::bigint) stored;
create index if not exists scores_map_score on public.scores (map, score desc);

-- Players can fill in the two new columns (score is never sent; the database fills it).
grant insert (map, character, seconds, csat, won, version, mods, mult) on table public.scores to authenticated;

-- Profiles: best score (with policies) and best clean CSAT per map.
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
      select jsonb_agg(jsonb_build_object('map', s.map, 'csat', max_csat, 'score', max_score, 'clean', max_clean, 'seconds', max_seconds, 'won', any_won) order by s.map)
      from (select map, max(csat) max_csat, max(score) max_score, max(csat) filter (where mods = '') max_clean,
                   max(seconds) max_seconds, bool_or(won) any_won
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
