# Helpdesk Survivors

A survivors-like about working the IT helpdesk. You play a lone technician, the
end-users swarm you with problems, and your IT tools fire automatically. Survive the
20-minute shift, then close The Executive's ticket to clock out.

Plain HTML5 Canvas and vanilla JavaScript (ES modules), with no dependencies and no
external assets. All art is generated from code and all sound, including the
hold-music-style background track, is synthesized with WebAudio.

**Play it online:** <https://sturrupmichael-web.github.io/HelpDeskSurvivor/>

## Run it

ES modules need to be served over HTTP, so opening the file directly won't work:

```sh
cd HelpDeskSurvivor
python -m http.server 8000      # or: python3 -m http.server 8000
```

Then open <http://localhost:8000/dev.html>, which loads the code straight from `src/`, so
edits show up on reload.

`index.html` is the published page: a generated, single-file build with all the CSS and
JavaScript inlined, because ad blockers such as uBlock Origin block some of the game's
module file names. After changing anything in `src/` or `data/`, rebuild it:

```sh
npm install      # once, installs esbuild
npm run build
```

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Esc (or P) | Pause |
| 1 / 2 / 3 or click | Pick a level-up card |
| Enter | Close the Change Approved (chest) screen |
| R | Reroll the level-up cards (needs the Escalation Path upgrade) |
| Enter (title screen) | Clock In: pick a tech, then a map (arrows or 1-9 to choose, Enter for next / confirm, Esc to go back). Starts on your last picks |
| T / L / C / S / B / K / A / O | Training Shift / Office Maps / Characters / Overtime Shop / Leaderboard / Help Desk Wiki / Achievements / Settings (title screen) |
| P / C | Post the shift to the online leaderboard / Change tech or map (end-of-shift screen) |
| T / O | Shift Stats / Settings (pause menu) |
| A | When everything is maxed, always take the pizza from then on (no more level-up screens) |
| M | Mute / unmute (remembered between visits) |
| ` (backtick) | Toggle debug mode (only on localhost, or with `?debug` added to the address) |

**Controller** (any standard gamepad, Xbox or PlayStation layout): left stick or d-pad
moves; in menus they move the highlight (left/right also nudge sliders). A selects, B
goes back, Start pauses, X rerolls, Y takes the always-pizza option.

**Phone / touch:** put a finger down anywhere and drag for a floating joystick. A pause
button sits at the top left. The view zooms in on narrow portrait screens.

**Settings** (title or pause menu, saved between visits): music volume and sound
effects volume separately, screen shake, damage numbers, and the touch joystick.

**Office maps** (`data/maps.js`): Open Office, Server Room, Call Center, Night Shift:
Parking Garage and Merger Day. Each one unlocks when you win a shift on the one before
it, and has its own floor art, music remix, Overtime Pay bonus, best times and a twist
(hot aisles, ringing desk phones, darkness, the parent company's spreading floor).
Merger Day also has its own users (`newUsers`) and pickups (Unclaimed Moving Boxes, the
Welcome Swag Bag). New maps need their id added to the leaderboard's map check in
Supabase (`supabase/merger.sql` shows how).

**Achievements:** 26 of them in `data/achievements.js`; each is a name, icon, text and a
`check(run, meta)` test. Unlocks pop a toast and are listed under Achievements on the
title screen.

**Training Shift** (`src/game/tutorial.js`, steps and text in `data/tutorial.js`): a
guided first shift of about two minutes. The wave spawner is off; each step spawns its
own users, shows a coach card at the bottom of the screen and waits for the player
(move, fix users until the first level-up, survive a small rush, grab a pizza). Sanity
can't hit zero, and it pays nothing and never reaches the leaderboard. Brand-new players
are offered it on their first Clock In; it's always on the title screen (T).

**Help Desk Wiki** (`src/game/wiki.js` records, `src/ui/wiki.js` screen): a codex of
users, bosses, tools and passives. An article unlocks the first time you close that
user, face that boss, or finish a shift carrying that tool or passive; the end-of-shift
screen lists new ones. Text comes from the `flavor` and `desc` fields in `data/`.

**Performance review** (`src/game/review.js`, text in `data/review.js`): the end-of-shift
screen ends with an HR-style review: a rating from Performance Improvement Plan to
Employee of the Month, three manager's comments picked from what happened that shift,
a goal for next quarter and the map's manager's signature. Add comments to `COMMENTS`
with a test and a priority.

**Debug mode hotkeys** (only while debug mode is on and the game is running):
`1` spawn 50 enemies, `2` spawn 300 enemies (from the current wave mix), `3` level up,
`4` skip ahead 1 minute, `5` god mode, `6` clear enemies, `7` spawn one of every
end-user, `8` add the next weapon you don't have, `9` skip to the next event, `0` drop
a Change Approved chest next to you, `-` evolution kit (every evolvable weapon at max
level plus its passive, so the next chests evolve them), `=` start the next boss fight
now, `]` add $1,000 Overtime Pay. The panel also shows FPS, worst frame time and entity counts. In the browser console, `game` is the live game object.

## Online leaderboard

Top 10 CSAT scores per map, stored in a free Supabase project (settings in
`data/leaderboard.js`, requests in `src/game/leaderboard.js`). After a shift you can post
it under a name; shifts where debug mode was on can't be posted. The page only holds the
publishable key, and the table's row level security allows reading and adding rows,
nothing else. To set up a fresh project, run this in Supabase's SQL Editor:

```sql
create table scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 16),
  map text not null,
  character text not null,
  seconds int not null check (seconds between 0 and 3600),
  csat int not null check (csat >= 0),
  won boolean not null default false,
  created_at timestamptz not null default now()
);
alter table scores enable row level security;
create policy "anyone can read" on scores for select using (true);
create policy "anyone can add" on scores for insert with check (true);
```

Then run `supabase/hardening.sql` the same way: visitors may only fill in the score
columns, can't update, delete or empty the table, impossible scores are rejected, and at
most 30 scores a minute are accepted. Scores are still not verified, so a determined
cheater can post a plausible fake; delete those rows in the Supabase Table Editor.

## Security

See `SECURITY.md` for what was reviewed and the remaining risks. In short: the page runs
under a Content Security Policy (generated by `build.mjs`; only its own scripts, and it
only talks to this site and the leaderboard), leaderboard names are escaped before
they're shown, and the repository holds no secrets (the Supabase key is the publishable
one).

## Install as an app

The page is a Progressive Web App: `manifest.webmanifest` (name, icons in `icons/`,
full screen) and `sw.js`, a service worker that keeps the last-loaded page and sprite
sheets so the installed game also runs offline. It fetches from the network first, so a
pushed update shows up the next time the game is opened online. dev.html never registers
the worker. On Android, Chrome shows an Install App button on the title screen; on
iPhone, use Share, then Add to Home Screen in Safari.

## Previews

Changes are tried out at https://game.michaelsturrup.com/preview/ before they go live.
The preview is the whole game built from the `preview` branch: its version ends in `-pre`,
the title screen says PREVIEW BUILD, and search engines are told to skip it. It shares
saves, accounts and the leaderboard with the live game (scores show the `-pre` version).

GitHub builds and publishes the site itself (`.github/workflows/deploy.yml`, with
Settings > Pages > Source set to "GitHub Actions"). A push to `main` or `preview` runs the
tests, builds the live game from `main` and the preview from `preview`, and publishes both.
If a test fails nothing is published. Nothing built needs committing.

- **Make a preview:** push the change to the `preview` branch.
- **Publish:** merge it into `main` and push.
- Add a "What's new" entry (data/changelog.js) with each change that will be published.
- `node site.mjs` copies the files the live site serves into `_site/` (what gets published).

## Tests

`npm test` plays the real game in a headless browser, much faster than real time: every
menu opens, every map runs early and late in a shift, every boss attacks and can be
closed (and drops its chest), The Executive ends the shift as a win, the training shift
runs, a phone-sized screen draws at world size, 900 users stay inside a frame budget, old
saves upgrade, and the built page starts offline. `npm test -- quick` skips the built
page. Every push runs them on GitHub (`.github/workflows/test.yml`); a red X on a commit
means a test failed. First time: `npm install` and `npx playwright install chromium`.
Tests live in `tests/`; `tests/harness.mjs` has helpers (`T.start(map)`, `T.step(seconds)`).

The game logic also runs in plain Node with no browser (`src/game/headless.js`): no
canvas, HUD, menus or sound, just the simulation, about 40x faster than real time.
`npm test -- node` runs only those tests. The balance bot plays whole shifts that way:

    node tests/tools/bot.mjs --map all --runs 5 [--tech neteng] [--vet]

(`--vet` = every shop upgrade maxed and everything unlocked.) To keep this working, game
logic under `src/game/` must not touch the page: no `document`, `window` or DOM. The HUD,
menus and debug overlay come in through `new Game(canvas, assets, ui)` (`src/ui/index.js`
in the browser), and drawing only happens in `render()`, which headless skips.

## Project layout

```
data/          all balance and content (tune the game here, see BALANCE.md)
sprites/defs/  sprite definitions as character grids on the shared palette
sprites/out/   generated PNG sheets + manifest.json (checked in, so no build is needed to play)
sprites/build.js  renders defs -> PNG sheets
src/engine/    loop, input (keyboard, gamepad, touch), camera, object pools, spatial hash, asset loading, audio synth
src/game/      gameplay: player, enemies + behaviors/ (incl. bosses), weapons/, hazards
               (boss bullets and bombs), pickups, upgrades + evolutions, spawner, floor
src/ui/        SVG HUD, icons, debug overlay; menus in screens.js + screens/ (one file per screen);
               index.js hands them to the game
tests/         automated tests (npm test)
```

Adding content without touching the engine:
- Pickups (`data/pickups.js`) list their `effects`, from `ITEM_EFFECTS` in `src/game/pickups.js`.
- Map twists (`data/maps.js` `twist.type`) are entries in `TWISTS` in `src/game/maps.js`.
- The 10:00 event marked `mapBoss: true` in `data/waves.js` becomes the map's own boss;
  a boss's `downBanner` (data/enemies.js) is shown when it's closed (The Executive's ends the shift).
- Each boss behavior keeps its own state in `e.ai`, made fresh in its `init(e)`.

Offline app: `sw.js` serves sprite sheets (tagged `?v=<content hash>` by sprites/build.js)
and icons from its cache first, and everything else from the network first.

Drawing: the canvas is exactly the size of the world view (one canvas pixel per world
pixel) and the browser scales it up by a whole number (`Game.resize`). Draw everything in
world pixels; text in the world uses the pixel font in `src/engine/pixelfont.js`. While a
menu is open the world is drawn once and then left alone; set `game.dirty = true` if
something on a menu screen needs the world redrawn.

Saves: the save carries a `version` (`SAVE_VERSION` in `src/game/meta.js`). When you rename
or remove a tool, passive, tech or map, bump the version and add a step to `MIGRATIONS`
that converts old saves (for example, renames the id), or players lose that progress.
Unknown ids are dropped on load.

## Editing art

Sprites live in `sprites/defs/*.js` as grids of palette characters (`data/palette.js`,
`.` is transparent). After editing, rebuild the sheets:

```sh
node sprites/build.js
node sprites/build.js --preview /tmp/sprite-preview   # also writes 6x-scaled previews
```

Hit-flash frames are generated automatically from each frame.

## Swapping in other art

The game reads only `sprites/out/manifest.json` and the PNG sheets it lists. To use a
third-party asset pack, provide PNGs plus a manifest with the same sprite ids
(`player_tier1`, `pam`, `quinn`, `ticket_blue`, `proj_kb`, `desk`, and so on; see the
current `manifest.json` for the full list):

```json
{
  "sheets": { "characters": "characters.png" },
  "sprites": {
    "pam": {
      "sheet": "characters", "w": 32, "h": 32, "anchor": [16, 32], "fps": 6,
      "anims": { "walk": { "frames": [[0, 32], [32, 32]], "hit": [[64, 32], [96, 32]] } }
    }
  }
}
```

`anchor` is the point drawn at the character's feet. `hit` is optional.

## Milestones

1. **Done:** sprite pipeline, player, movement, camera, endless office floor, Password
   Reset Pam, Turn It Off and On Again, Closed Tickets XP, level-up, HUD, debug mode.
   The 8 passives are already in the level-up pool, since a level-up with only one
   weapon would be pointless.
2. **Done:** all 8 end-users (plus Malware and the small Reply-All Randys), the wave
   timeline, Patch Tuesday (5:00) and the Monday Morning Login Storm (15:00), and all 9
   weapons.
3. **Done:** the Major Incident boss (10:00) and The Executive (20:00, three phases,
   ends the shift), boss bar and telegraphed attacks, the 4 evolutions via Change
   Approved chests, pizza / Bulk Close / PTO pickups, overtime, and synthesized sound.
4. **Done:** Overtime Pay and the permanent-upgrade shop, the 4 characters (3 to
   unlock), records, the title / character select / shop / summary screens (with
   damage per tool), level-up rerolls, Union Rep revive, more flavor text, and the
   balance pass (see BALANCE.md).
5. **Polish:** controller and touch support, a settings menu (separate music and sound
   volume), the pause-menu Shift Stats page, and 18 achievements.
6. **Office maps:** three unlockable maps with their own art, twist, music and records.
7. **More characters and tools:** Network Engineer, Help Desk Manager, The Intern and
   Cloud Architect; Patch Cable, Delegate, Coffee Run, Auto-Scaling, Out-of-Office Reply
   and Ping Sweep; the Fiber Backbone, Outsourced Team and Espresso Machine evolutions;
   and the Standing Desk passive.
8. **Map bosses:** The Rat's Nest (Server Room), The Angry Caller (Call Center) and The
   Night Janitor (Parking Garage) replace the Major Incident at 10:00 on their maps.
   Merger Day added The Hostile Takeover (and its Subsidiary).
9. **Online leaderboard:** top CSAT per map (Supabase), posted from the end-of-shift screen.
10. **Installable app:** add to the home screen, runs full screen and offline.
11. **Help Desk Wiki:** a codex of users, bosses, tools and passives that fills in as you play.
12. **Performance review:** a funny HR review of every shift on the end-of-shift screen.
13. **More tools (ideas 32-46):** Reply-All Storm, Zip Ties, Password Expired, Screen Share
    and Rubber Duck; the Spare Charger, Extended Warranty, Snack Drawer and Lucky Lanyard
    passives; and six more evolutions (Confluence Space, Passwordless, Domain Lockdown,
    Remote Wipe, Sabbatical, SIEM).
