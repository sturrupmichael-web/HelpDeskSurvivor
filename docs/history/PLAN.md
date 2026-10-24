> **History.** This is the original build plan from 2026-10-20, kept for reference. Much of
> it (file layout, palette size, "no repo") no longer matches the game; see the README.

# Helpdesk Survivors: Build Plan

Working title: **Helpdesk Survivors**. Plain HTML5 Canvas + vanilla ES modules, no dependencies, no external assets.
Built in `/mnt/project-files/game1/` (no repo is attached to the project; I can move it into one whenever you want).
Run: `cd game1 && python -m http.server 8000`, open `http://localhost:8000`.

## 1. File structure

```
game1/
  index.html            canvas + HUD overlay container, loads src/main.js
  README.md             run instructions, controls, debug hotkeys
  BALANCE.md            every tuning knob and where it lives
  data/                 ALL balance and content lives here (plain JS objects)
    palette.js          the shared 16-color palette
    player.js           characters: base stats, starter weapon, sprite id, unlock cost
    enemies.js          hp, speed, damage, xp, behavior id, behavior params, sprite id
    weapons.js          per weapon: behavior id + 8 level rows (dmg, cooldown, count, area...)
    passives.js         stat key + 5 level values
    evolutions.js       weapon + passive -> evolved weapon id
    waves.js            timeline: spawn rates/mix per minute, events at 5/10/15/20
    pickups.js          xp tiers, drop chances
    flavor.js           one-liners for level-up cards, game-over quips
    meta.js             shop items, costs, Overtime Pay formula
  sprites/
    defs/*.js           sprite definitions as character grids (player, enemies, bosses, pickups, tiles)
    build.js            Node script: defs -> PNG sheets + manifest (no npm deps, own PNG encoder via zlib)
    out/*.png           generated sheets (committed)
    out/manifest.json   frame rects + animation names per sprite id
  src/
    main.js             boot, asset load, scene switching
    engine/
      loop.js           fixed-timestep loop
      input.js          keyboard state (WASD/arrows, Esc, `)
      camera.js         follow + screen shake
      pool.js           generic object pools
      spatialHash.js    uniform grid, reused cell arrays
      assets.js         loads manifest + sheets; the ONLY place that knows about sprite files
      renderer.js       draw sprites by (id, anim, frame, flash), floor tiles, culling
      audio.js          WebAudio synth: blip, hit, pickup, levelup, warning
      rng.js            seeded RNG (reproducible runs for debugging)
    game/
      world.js          owns pools, grid, timers; update/draw order
      player.js         movement, stats (base + passives + meta), damage/i-frames
      enemies.js        enemy update; dispatches to behaviors
      behaviors/        chase, dart, split, spawner, slowZone, teleport, aura, kamikaze, boss phases
      weapons/          one module per weapon behavior (pulse, projectile, boomerang, orbit, aura, homing, chain, turret, nuke)
      upgrades.js       level-up roll (weighted, respects 6/6 slot caps), apply, evolution check
      spawner.js        reads waves.js, spawns in ring just off-screen, runs events
      pickups.js        gems, magnet, chests, pizza, PTO
      fx.js             damage numbers, particles (pooled)
      floor.js          procedural endless office (hash of tile coords -> decor)
      stats.js          run stats: damage per weapon, kills, CSAT streak
      meta.js           localStorage save/load, shop
    ui/
      hud.js            SVG HUD (timer, bars, counters, icon slots)
      icons.js          inline SVG upgrade icons
      screens.js        title, shop, character select, pause, level-up, game over, victory
      debug.js          FPS, entity counts, hotkeys
```

## 2. Game loop architecture

- **Fixed timestep** at 60 Hz simulation with an accumulator; render once per rAF. Max 5 catch-up steps so a tab switch doesn't explode.
- **Scenes**: Title, Shop, Select, Run, with modal overlays (Pause, LevelUp, Chest, GameOver). Overlays freeze simulation but keep rendering.
- **Update order per tick**: input -> player -> spawner -> enemies (behaviors) -> rebuild spatial hash -> weapons -> projectiles vs hash -> pickups -> fx -> timers/events.
- **Entities are pooled plain objects** in typed-ish flat pools (enemies, projectiles, gems, particles, damage numbers). Dead items flagged and swapped to the free end; no `new` or array literals in the hot path.
- **Spatial hash**: 64px cells, rebuilt each tick from integer cell keys into preallocated arrays. Used for weapon hits, enemy separation (cheap push-apart), and nearest-enemy queries.
- **Offscreen culling** for drawing; enemies far off-screen get despawned and recycled closer (standard genre trick so the horde stays on you).
- Target: 500+ enemies at 60 FPS. Debug overlay shows FPS and pool counts so we can verify.

## 3. Sprite pipeline

- Each sprite is a list of frames, each frame an array of strings where each character is a palette index (`.` = transparent). 32x32 characters, 16x16 pickups/projectiles, 64x64 bosses, 32x32 floor tiles.
- `node sprites/build.js` renders every def to PNG sheets in `sprites/out/` and writes `manifest.json` (`{ id: { sheet, frameW, frameH, anims: { walk: [rects], hit: [...] } } }`). Hit-flash is generated automatically as a white-silhouette variant of each frame, so no hand drawing needed.
- The game only reads `manifest.json` + PNGs. **Swapping in an asset pack** = drop in new PNGs and a manifest with the same sprite ids; zero engine changes.
- Every enemy gets a distinct silhouette + signature prop (Pam's sticky note, Randy's envelope, Jammer's paper stack, VIP's tie and phone, etc.). Walk cycles 2 to 4 frames.
- HUD and upgrade icons are SVG (DOM overlay on top of the canvas, crisp at any size).

## 4. Data-driven content

- Engine code knows **behaviors**, data files pick **which behavior and its numbers**. Example:
  ```js
  // data/enemies.js
  pam: { name: 'Password Reset Pam', sprite: 'pam', hp: 6, speed: 40, dmg: 4, xp: 1,
         behavior: 'chase', tags: [] },
  steve: { ..., behavior: 'teleport', params: { range: 120, every: 3 }, resist: { policy: 0.5 } },
  // data/weapons.js
  autoClose: { name: 'Ticket Auto-Close', icon: 'ticket', behavior: 'projectile', tags: ['ticket'],
    levels: [ { dmg: 8, cooldown: 1.0, count: 1, speed: 300, pierce: 0 }, ... 8 rows ] },
  ```
- Passives are `{ stat: 'moveSpeed', levels: [0.1, 0.2, ...] }`; the player's final stats = base x meta x passives, recomputed only on change.
- Enemy HP scaling with time is a curve in `waves.js` (`hpMult(t)`), so the 2/10/15-minute difficulty curve is one tunable table.
- Adding a new enemy or weapon that reuses an existing behavior = data only. A new behavior = one small module in `behaviors/` or `weapons/`.

## 5. Milestones (I stop after each for your playtest)

1. Sprite pipeline + player sprite, movement, camera, endless floor, Pam, Turn It Off and On Again, XP tickets + level-up screen, debug mode.
2. All enemy sprites/behaviors, wave spawner, all weapons and passives.
3. Bosses + events, evolutions, all pickups, audio.
4. Meta progression, menus, polish, balance pass, BALANCE.md final.

## Defaults I'm picking (say if you want otherwise)

- Pixel scale 2x (32px sprite drawn at 64px) on a canvas that fills the window.
- Esc pauses; ` toggles debug (number-key hotkeys inside debug, since F-keys collide with browser shortcuts: spawn enemies, level up, +1 minute, god mode, clear).
- No git repo or PR; files live in the project folder.
