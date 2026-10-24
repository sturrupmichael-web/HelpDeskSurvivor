# Security review (2026-10-20)

Helpdesk Survivors is a static page on GitHub Pages with no server of its own. The only
outside service is the Supabase leaderboard. Everything below was checked against the
code and the full git history.

## Findings

| # | Area | Finding | Risk | Status |
| --- | --- | --- | --- | --- |
| 1 | Secrets | No secrets anywhere in the repository or its history. The only key is Supabase's publishable key, which is meant to be public. | None | OK |
| 2 | Leaderboard display | Names and character names from other players are HTML-escaped. Tested with `<img onerror>` and `<script>` rows: shown as text, nothing runs. The time column is now forced to a number too. | None | OK, hardened |
| 3 | Leaderboard permissions | Row level security allows reading and adding rows only, so nobody can edit or delete scores through the API. But visitors could also set `created_at` (backdate rows). | Low | Fixed by `supabase/002_hardening.sql` |
| 4 | Leaderboard abuse | `map` and `character` had no length limit (junk or huge rows), there was no flood limit, and impossible scores were accepted (e.g. 999,999 CSAT in 10 seconds, or a "win" before 20:00). | Medium | Fixed by `supabase/002_hardening.sql` |
| 5 | Content Security Policy | The page had none. It now allows only its own scripts (inline ones by hash) and connections only to this site and the leaderboard, so injected script can't run or send data elsewhere. | Low (defence in depth) | Fixed |
| 6 | Offline cache | The service worker only caches this site's own files and never the leaderboard. | None | OK |
| 7 | Score integrity | Scores are computed in the browser, so a determined cheater can post a plausible fake score. A server-checked score would need a game server. | Low | Accepted. Delete fakes in Table Editor |
| 8 | Debug mode | `?debug` only changes your own game, and debug shifts can't be posted. | None | OK |
| 9 | Dependencies | No runtime dependencies. esbuild is a build tool only and isn't shipped. | None | OK |
| 10 | Framing | GitHub Pages can't send `frame-ancestors`, so another site could embed the game. Nothing sensitive happens in the page. | Very low | Accepted |

## For the owner to do

1. **Run `supabase/002_hardening.sql`** in Supabase: SQL Editor, New query, paste, Run. It
   was tested on a local Postgres copy of the table:
   - normal posts still work;
   - backdating, updates, deletes and emptying the table are refused;
   - impossible scores are rejected;
   - the 31st score in a minute is refused.
   Existing rows are left alone.
2. **GitHub, Settings > Pages:** make sure "Enforce HTTPS" is ticked. Verifying
   `michaelsturrup.com` under your GitHub profile's Settings > Pages > "Verified domains"
   stops anyone else's repository from claiming the subdomain.
3. **If the game is ever taken down:** delete the `game` CNAME record in Squarespace DNS
   at the same time. A record pointing at an unused GitHub Pages site can be taken over.
4. **Accounts:** keep two-factor sign-in on for GitHub and Supabase. Never put
   Supabase's secret or `service_role` key in the game or the repository.
