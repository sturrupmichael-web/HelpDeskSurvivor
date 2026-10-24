# Security review (2026-10-24)

Helpdesk Survivors is a static page on GitHub Pages with no server of its own. The only
outside service is one Supabase project: the leaderboard, player accounts (guest and
Google), cloud saves, player profiles and bug reports. This review replaces the first one
(2026-10-20), which was written before accounts, cloud saves, profiles and bug reports
existed.

How it was checked: the code and the full git history were read; every `supabase/*.sql`
file was run in order on a local Postgres set up like Supabase (the `anon` and
`authenticated` roles, `auth.uid()`), and then a second player tried to read, change or
pretend to be the first; the game's online code was run against a fake Supabase that
follows the same rules (`tests/online.test.mjs`, now part of `npm test`).

## Findings

| # | Area | Finding | Risk | Status |
| --- | --- | --- | --- | --- |
| 1 | Secrets | No secrets in the repository or its history (searched for Supabase secret and `service_role` keys, Google client secrets and signed tokens). The only key is the publishable one, which is meant to be public. | None | OK |
| 2 | Other players' data | A signed-in player can read and change only their own name and save. Reading or editing someone else's name, save or bug reports, setting `banned`, posting under another name, editing or deleting scores, and calling the database's internal functions were all refused. Profiles never include an email address. | None | OK |
| 3 | Look-alike names | Names were unique ignoring case, but the database took invisible characters, so someone could claim "Pam" plus a zero-width space and pass as Pam. The game strips them, but a script needn't use the game. | Low | Fixed by `supabase/010_security.sql` (and the game now also strips Hangul filler characters) |
| 4 | Old names | Renaming left your old scores under the old name. The next player to claim that name then seemed to own them: tapping the name opened the newcomer's profile. | Low | Fixed: a rename now renames your scores (`010_security.sql`) |
| 5 | Score flooding | The only limit was 30 scores a minute for everyone, so one account could use it all and stop everyone else posting. | Low | Fixed: also 5 a minute per player (`010_security.sql`) |
| 6 | Player text on screen | Names, technician names, profile fields, sign-in errors and emails are escaped before they're shown. Tested with `<img onerror>` rows on the board and in a profile: shown as text, nothing runs. | None | OK, now tested on every push |
| 7 | Content Security Policy | The page only runs its own scripts and only talks to itself and the Supabase project, so even injected script couldn't send data elsewhere. | None | OK |
| 8 | Sign-in | Google sends players back only to addresses on game.michaelsturrup.com (Supabase's redirect list, ACCOUNTS.md), and the game removes the tokens from the address bar straight away. Sessions are kept in the browser's storage, as is usual for a web game; the CSP above is what protects them. | None | OK |
| 9 | Planted sign-in link | Someone could send a player a link to the game carrying the sender's own sign-in. Opening it signs the player in to the sender's account; if they had progress, the game asks which progress to keep, so nothing is replaced without a tap. The sender gains nothing they didn't have. | Very low | Accepted |
| 10 | Score and profile honesty | Scores, achievements and shift counts are worked out in the browser, so a determined cheater can post a plausible fake or dress up their profile. The database refuses impossible ones (unknown maps, too much CSAT for the time, a win before 20:00, out-of-range multipliers). | Low | Accepted. Delete fakes in Table Editor, or set `banned` on the player |
| 11 | Bug reports | Insert only, stamped with the sender's account, 1,000 characters, 5 per player per 10 minutes and 60 an hour for everyone. Many guest accounts could use up the hourly limit, which only stops reports for that hour. | Very low | Accepted |
| 12 | Guest accounts | A guest account is made when someone first posts a score or sends a report. Supabase limits how fast one address can make them. | Very low | Accepted (see owner list) |
| 13 | Offline cache | The service worker only stores this site's own files, never anything from Supabase. | None | OK |
| 14 | GitHub Actions | Deploy builds only the tips of `main` and `preview`, never code from a pull request. The Tests workflow ran with the repository's default token permissions; it now reads only, so a pull request from someone else's copy of the repository can't write anything. Dependabot keeps the actions and tools up to date. | Low | Fixed (`.github/workflows/test.yml`) |
| 15 | Dependencies | Nothing is shipped from npm: esbuild, ESLint and Playwright are build and test tools only. | None | OK |
| 16 | Debug mode | `?debug` only changes your own game, and shifts that used it can't be posted. | None | OK |
| 17 | Framing | GitHub Pages can't send `frame-ancestors`, so another site could embed the game. Nothing sensitive happens without the player tapping through Google's own page. | Very low | Accepted |

## For the owner to do

1. ~~Run `supabase/010_security.sql`~~ Done 2026-10-24. It was tested on a local Postgres copy of the database: normal names and
   scores still work, and running it twice is fine. Names already taken are left alone.
2. **Supabase, Authentication, Rate Limits:** check that the limit for anonymous sign-ins
   is on (Supabase's default is 30 an hour per address). That is what stops a script
   making thousands of guest accounts.
3. Still true from the first review: keep "Enforce HTTPS" ticked in GitHub Pages; if the
   game is ever taken down, delete the `game` CNAME record in Squarespace at the same
   time; keep two-factor sign-in on for GitHub, Supabase and the Google Cloud project; and
   never put Supabase's secret or `service_role` key in the game or the repository.
