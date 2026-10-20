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
| L / C / S / B / A / O | Office Maps / Characters / Overtime Shop / Leaderboard / Achievements / Settings (title screen) |
| P | Post the shift to the online leaderboard (end-of-shift screen) |
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

**Office maps** (`data/maps.js`): Open Office, Server Room, Call Center and Night Shift:
Parking Garage. Each one unlocks when you win a shift on the one before it, and has its
own floor art, music remix, Overtime Pay bonus, best times and a twist (hot aisles,
ringing desk phones, darkness).

**Achievements:** 24 of them in `data/achievements.js`; each is a name, icon, text and a
`check(run, meta)` test. Unlocks pop a toast and are listed under Achievements on the
title screen.

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

Scores are not verified, so anyone determined enough can post a fake one; delete those
rows in the Supabase Table Editor.

## Project layout

```
data/          all balance and content (tune the game here, see BALANCE.md)
sprites/defs/  sprite definitions as character grids on the shared palette
sprites/out/   generated PNG sheets + manifest.json (checked in, so no build is needed to play)
sprites/build.js  renders defs -> PNG sheets
src/engine/    loop, input (keyboard, gamepad, touch), camera, object pools, spatial hash, asset loading, audio synth
src/game/      gameplay: player, enemies + behaviors/ (incl. bosses), weapons/, hazards
               (boss bullets and bombs), pickups, upgrades + evolutions, spawner, floor
src/ui/        SVG HUD, icons, menus, debug overlay
```

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
9. **Online leaderboard:** top CSAT per map (Supabase), posted from the end-of-shift screen.
