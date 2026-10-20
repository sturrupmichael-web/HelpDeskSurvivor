# Player accounts (preview, not live)

Guest accounts plus "Sign in with Google", built on the Supabase project the leaderboard
already uses. This is a preview: none of it is on game.michaelsturrup.com yet.

## What players see

- **Nothing changes until they post a score.** Playing needs no account.
- **First post:** they pick a leaderboard name and a guest account is made for them
  behind the scenes. The name is theirs from then on; nobody else can post as them.
- **Account screen** (title screen, `U`): shows guest or Google, their name (and a box
  to change it) and whether their progress is backed up.
- **Sign in with Google:** turns the guest into a permanent account, keeping the same
  name, scores and progress. On another phone or computer, signing in with the same
  Google account brings their progress over.
- **Both devices have progress:** they're asked which one to keep, side by side
  (shifts, Overtime Pay, characters, achievements).
- **Progress syncs** a few seconds after each shift or purchase, and on start-up.
- **Sign out** stops syncing on that device; the progress already there stays.

## What changes in the code

| File | Change |
| --- | --- |
| `src/game/account.js` | New. Guest and Google sign-in through Supabase's sign-in API; keeps the session in the browser. No new library. |
| `src/game/cloudsave.js` | New. Uploads/downloads the save and spots when both sides changed. |
| `src/ui/account.js` | New. Account screen, "which progress do you keep?" screen, the post row on the end-of-shift screen. |
| `src/game/leaderboard.js` | Posting a score now goes through the player's account; the name comes from the account. |
| `src/game/meta.js`, `game.js`, `main.js`, `screens.js`, `hud.js`, `style.css` | Hooks for the above, the title-screen Account button, sign-in toasts. |
| `supabase/accounts.sql` | New. `players` (unique names, `banned` switch), `saves` (one per player, private), and scores need an account. |

The page's security policy doesn't change: sign-in uses the same Supabase address.

## Setup (about 20 minutes, all in websites)

**Google** (console.cloud.google.com)
1. Create a project, e.g. "Helpdesk Survivors".
2. Google Auth Platform (OAuth consent screen): External, app name, your email as
   support and developer contact. Publish it ("In production"); the basic email and
   profile access needs no Google review.
3. Clients, Create client, Web application:
   - Authorized JavaScript origins: `https://game.michaelsturrup.com`
   - Authorized redirect URIs: `https://abeqdmurddrkrqbnfylb.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client secret. These go only into Supabase, never into the game.

**Supabase** (your project)

5. Authentication, Sign In / Providers, Google: turn on, paste both values, save.
6. Same area: turn on **Allow anonymous sign-ins** and **Allow manual linking**.
7. Authentication, URL Configuration: Site URL `https://game.michaelsturrup.com`, and
   add `https://game.michaelsturrup.com/**` under Redirect URLs.
8. SQL Editor: run `supabase/accounts.sql`.

Steps 1 to 7 change nothing for players. Step 8 switches posting to accounts, so the
live game can't post scores until the new code is published; do step 8 and the publish
together.

## Trade-offs

- Google's sign-in page says "to continue to abeqdmurddrkrqbnfylb.supabase.co". Showing
  your own domain there needs Supabase's paid custom-domain add-on.
- Guest accounts that never sign in with Google pile up in Authentication, Users. They're
  harmless; they can be cleared out later.
- Names on old scores aren't reserved. Claim yours early.
- Scores are still worked out in the browser: accounts make names trustworthy, not scores.
- If guest sign-ups get abused, Supabase can add a CAPTCHA; the game would need a small
  change for it.

## Tested

- `supabase/accounts.sql` on a local Postgres copy of the leaderboard table: posting
  without an account or without a name is refused; names are unique ignoring case;
  a player can't post as someone else, see or change another player's save, or unban
  themselves; banned players can't post; old scores are kept.
- The game against a fake Supabase in a headless browser: first post creates a guest
  and claims the name; a taken name is refused; Google upgrades the guest in place;
  a second device gets the "which progress" choice and then posts as the same name;
  the first device picks up the newer progress on reload; a guest who signs in to a
  Google account that already has a player is switched to that player; sign out keeps
  local progress. All existing game tests still pass.
- Not tested: real Google and real Supabase, which this container can't reach.

## Player profiles and versions (added 2026-10-20)

- Tap a name on the leaderboard (or **My profile** on the Account screen) to see that
  player's profile: when they joined, best CSAT and longest shift per map, most played
  character, shifts worked and unlocked achievements. Served by the `player_profile`
  function in `supabase/profiles.sql`; it never returns an email address, and banned
  players have no profile. Scores from before accounts show "no profile".
- Every build is stamped with a version, the build time in UTC (e.g. `2026.10.20-2117`).
  It shows at the bottom of the title and Settings screens, in the browser console, and
  in the `version` column of each posted score (Table Editor, `scores`).
