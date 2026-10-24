# Supabase scripts

The leaderboard, accounts, cloud saves, player profiles and bug reports live in one
Supabase project (settings in `data/leaderboard.js`). These files set up its database.
They are numbered in the order they were run on the live project, and **all of them have
already been run there**. Nothing here needs running again unless a new file is added.

To run one: Supabase, SQL Editor, New query, paste the whole file, Run. Every file is safe
to run again.

| File | What it does | Needs first |
| --- | --- | --- |
| `001_scores.sql` | The `scores` table: anyone can read and add rows. | |
| `002_hardening.sql` | Visitors can only fill in score columns, never edit or delete; impossible scores and unknown maps are refused; at most 30 scores a minute. | 001 |
| `003_accounts.sql` | `players` (one unique name per account, `banned` switch) and `saves` (private cloud saves); scores need an account and take its name. Turn on anonymous sign-ins, manual linking and Google sign-in first (ACCOUNTS.md). | 002 |
| `004_profiles.sql` | `player_profile()` for the public profile shown when you tap a name, and the game `version` on scores. | 003 |
| `005_bugreports.sql` | `bug_reports` for the in-game Report a Bug button: insert only, 5 per player per 10 minutes, 60 an hour in all. | 003 |
| `006_merger.sql` | Lets scores from Merger Day in. | 002 |
| `007_policies.sql` | Shift Policies: `mods`, `mult` and the database-worked-out `score` (CSAT x mult) that the board ranks by; profiles show the best score. | 004 |
| `008_csat-limit.sql` | Raises the CSAT-per-second limit so long overtime shifts with combos aren't refused. | 002 |
| `009_hardcore.sql` | Hardcore shifts (tagged `hardcore` in `mods`) may go up to x6. | 007 |
| `010_security.sql` | Second security review: no invisible characters in names, a rename takes your scores with you, at most 5 scores a minute per player. | 003 |

**Fresh project:** run them all in number order. Later files change limits that earlier
ones set (for example `009` loosens the multiplier check from `007`), so the order matters.

**Adding a map:** the leaderboard only accepts maps it knows. Add the new map's id to the
`scores_map_known` list in a new numbered file (copy `006_merger.sql`) and to the same
list in `002_hardening.sql`, so a fresh setup gets it too. `npm test` fails until both
lists match `data/maps.js`.

**Adding a file:** give it the next number, say at the top what it does and that it's safe
to run again, and add a row above.

Shifts are capped at 60 minutes (`seconds between 0 and 3600` in `001`); the overtime
ramp ends every shift long before that (see "Overtime ramp" in docs/balance-log.md).
