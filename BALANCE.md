# Balance knobs

Every number lives in `data/`. Engine code never hard-codes balance. Edit, save and
reload the browser. No build step is needed (except for art; see README).

| File | What it controls |
| --- | --- |
| `data/player.js` | Character base stats (`maxHp` = Sanity, `speed`, `pickupRadius`, `regen`) and the XP curve |
| `data/enemies.js` | Per end-user `hp`, `speed`, `damage` (sanity/second on contact), `radius`, `xp`, `knockback`, `resist`, plus behavior `params` |
| `data/weapons.js` | One full stat row per weapon level (1–8); the stats depend on the weapon's behavior (see below) |
| `data/passives.js` | `perLevel` stat bonus, `maxLevel`, offer `weight`, slot caps |
| `data/waves.js` | Shift length and the spawn timeline |
| `data/pickups.js` | Ticket tiers and magnet behavior |
| `data/scoring.js` | CSAT points and streak rules |
| `data/evolutions.js` | Which weapon + passive evolve into what |
| `data/meta.js` | Overtime Pay payout formula and the shop |
| `data/audio.js` | Sound and music volumes, music tempo |
| `data/flavor.js` | Title taglines, level-up lines, game-over quips |
| `data/maps.js` | Office maps: unlock order, pay bonus, enemy HP/speed, spawn mix boosts, music remix, twist numbers |
| `data/achievements.js` | Achievement names, icons, text and unlock tests |

## The difficulty curve (`data/waves.js`)

`TIMELINE` is a list of keyframes, and values are interpolated between them:

- `rate`: new enemies per second.
- `minAlive`: the spawner instantly tops the horde up to this many. This is the main pressure knob.
- `hpMult` / `speedMult`: applied to enemy base stats at spawn, so later enemies are tougher.
- `mix`: which enemies spawn and how often (relative weights). New end-users are
  introduced by adding them to a keyframe's mix: Quinn at 1:00, Randy at 2:00, the
  Walk-Up at 3:00, the Phish Clicker and Printer Jammer at 4:00, Steve at 6:00, the VIP at 8:00.

`EVENTS` are the scripted moments. `ring` events (Patch Tuesday) drop `count` enemies in
a circle around you. `storm` events (Login Storm) send `waves` walls of `count` enemies
across the screen at `speed`. Each one gets a warning banner `warn` seconds early.

The intended feel is easy for the first 2 minutes, tense by 10 and chaotic by 15. To make
the whole run harder, raise `minAlive` and `hpMult` from the 5-minute keyframe onward.
To make the early game faster, raise `minAlive` at `t: 0` and `t: 60`.

`SPAWNER.maxEnemies` is the hard cap (and pool size). `recycleDistance` controls when
enemies left far behind get moved back in front of you.

## End-user behaviors (`params` in `data/enemies.js`)

| Behavior | Used by | Params |
| --- | --- | --- |
| `chase` | Pam, Randy, Malware, Walk-Up | none |
| `dart` | Quinn | `dashEvery`, `dashTime`, `dashMult` (x speed), `range`, `approachMult` |
| `summoner` | Phish Clicker | `every`, `count`, `minion`, `keepDistance` |
| `dropper` | Printer Jammer | `every`, `zone: { radius, life, slow }` (slows *you*) |
| `teleport` | Shadow IT Steve | `every`, `range`, `minDistance` |
| `aura` | The VIP | `radius`, `speedBuff` (applied to every end-user inside it) |

Other per-enemy knobs: `onDeath: { spawn, count }` (Randy splitting), `explode: { damage }`
(Walk-Up: dies on contact for that much sanity), `resist: { tag: multiplier }` (Steve takes
40% damage from `policy` weapons), `noSeparation` (pushes through the crowd).

## Weapon stats by behavior (`data/weapons.js`)

| Behavior | Weapon | Stats |
| --- | --- | --- |
| `pulse` | Turn It Off and On Again | `damage`, `cooldown`, `radius`, `knockback`, `speed` (ring growth) |
| `projectile` | Ticket Auto-Close | `damage`, `cooldown`, `count`, `speed`, `pierce`, `life`, `knockback` |
| `boomerang` | KB Article | `damage`, `cooldown`, `count`, `speed`, `range`, `knockback` |
| `orbit` | Firewall | `damage`, `count`, `radius`, `rotSpeed`, `duration` (up), `cooldown` (down), `hitInterval`, `knockback` |
| `aura` | Group Policy Push | `damage`, `tick`, `radius`, `slow` |
| `homing` | Remote Desktop Session | `damage`, `cooldown`, `count`, `speed`, `turn`, `life` |
| `chain` | MFA Prompt | `damage`, `cooldown`, `jumps`, `jumpRange`, `stun` |
| `turret` | PowerShell Script | `cooldown`, `max`, `duration`, `fireRate`, `damage`, `range`, `boltSpeed` |
| `nuke` | Reimage | `damage`, `cooldown`, `radius`, `knockback` |
| `whip` | Patch Cable | `damage`, `cooldown`, `range`, `width`, `sides` (2 = both ways), `knockback`, `full` (evolved: whole circle) |
| `minion` | Delegate | `count`, `damage`, `speed`, `leash`, `hitInterval` (each helper's own swing timer), `knockback` |
| `trail` | Coffee Run | `damage`, `cooldown` (drop rate × `gap`), `tick`, `radius`, `life`, `slow` |
| `projectile` + `scalePer` | Auto-Scaling | as `projectile`, plus one extra shot per `scalePer` users within `scaleRadius`, up to `maxCount` |
| `shield` | Out-of-Office Reply | `damage`, `cooldown`, `duration`, `radius`, `knockback` (also deletes boss bullets inside) |
| `sweep` | Ping Sweep | `damage`, `range`, `rotSpeed`, `width` (radians), `hitInterval` |

How passives apply: Domain Admin Rights multiplies every `damage`. Runbook multiplies every
`cooldown` (and the Group Policy `tick`). Second Monitor multiplies `radius`, `range`,
`jumpRange`, turret `range` and projectile hit size. Mechanical Keyboard multiplies projectile
`speed`, ring growth, orbit spin and turret fire rate.

## Player power

- **Damage taken** = enemy `damage` × seconds of contact × the Noise-Cancelling Headphones multiplier.
- **Weapon damage** = level row `damage` × Domain Admin Rights multiplier.
- **Cooldown** = level row `cooldown` × Runbook multiplier (floored at 20%).
- **Area** = level row `radius` × Second Monitor multiplier.
- **XP** = ticket value × ITIL Certification multiplier. Level L→L+1 costs
  `first + (L-1) × step` (see `XP_CURVE`).

Passive multipliers are `1 + perLevel × level`. A negative `perLevel` reduces the stat.

## Level-up offers

`weight` on weapons and passives is the relative chance that a card is offered. Owned
items that can still level up compete with new items while slots are free (6 weapons,
6 passives). When nothing is left to offer, the card is pizza (heals sanity).
Evolved weapons, and the base weapon of one you already evolved, are never offered.

## Bosses (`data/enemies.js`, events in `data/waves.js`)

Bosses spawn at full base HP (no timeline scaling) at the time of their event in
`EVENTS`. While one is alive, normal spawning is multiplied by the event's `spawnScale`.
Bosses ignore knockback (`knockback: 0`), shrug off stuns (`stunResist`), and can't be
shoved by the horde.

**Major Incident** (`incident`, 10:00, 12000 HP). `params`:

| Param | Meaning |
| --- | --- |
| `ringEvery` | seconds between phone rings |
| `ringTelegraph` | warning time before a ring fires (red ring, green gap = way out) |
| `ringBullets`, `ringGap` | phones per ring, and how many are left out to make the gap |
| `bulletSpeed`, `bulletDamage` | speed and sanity damage of each phone |
| `minionEvery`, `minionCount`, `minion` | Status Update Requests it releases |
| `enrageAt` | HP fraction below which it fires a second offset ring and rings 25% more often |

Every non-final boss drops a Change Approved chest where it goes down (where the last
piece goes down, for the Rat's Nest), and `downBanner` is the banner shown then.

**Map bosses.** On the Server Room, Call Center and Parking Garage, the map's `boss`
(data/maps.js) replaces the Major Incident at 10:00, banner text included.

**The Rat's Nest** (`ratsnest`, Server Room, 13000 HP). `params`:

| Param | Meaning |
| --- | --- |
| `lashEvery`, `lashTelegraph` | seconds between lashes; warning time (red strips on the floor) |
| `lashLength`, `lashWidth`, `lashDamage` | size of each cable strip and its sanity damage (3-5 cables, one aimed at you) |
| `snagEvery`, `snagCount`, `snagScatter`, `snag` | cable loops thrown around you: a zone (`radius`, `life`, `slow`) |
| `splitAt`, `small` | HP fraction where it splits into three `ratsnest_small` nests sharing what is left |

Smaller nests lash 2-3 shorter cables, 40% less often, and throw one loop at a time.

**The Angry Caller** (`caller`, Call Center, 12500 HP). Keeps `keepAway` [near, far] px
from you and circles. `attackGap` [normal, enraged], `enrageAt`. Attacks:

| Attack | Params |
| --- | --- |
| `hold` | ring of `count` phone bombs at `radius` around you plus one on you, `gap` left out; enraged adds a wider ring `ringGap` s later with the gap in the same place |
| `scream` | `telegraph`, cone `spread` and `range`, `damage`, `push` (shove speed) |
| `conference` | `count` of enemy `id` (Reply-All Randy) in a ring at `radius` around you |

**The Night Janitor** (`janitor`, Parking Garage, 13500 HP). Drops a `wet` patch every
`trailEvery` s (three times as often while charging). On wet floor you keep momentum
(`SLIP_GRIP` in src/game/player.js). Attacks: `mop` (`count` wet patches in a `spread`
fan up to `reach` px), `charge` (as The Executive's), `lights` (flashlight shrinks to
`scale` for `time` s; only on dark maps).

**The Executive** (`executive`, 20:00, 80000 HP, `final: true`: closing it ends the
shift). `params`:

| Param | Meaning |
| --- | --- |
| `phases` | HP fractions where phase 2 and 3 start (each phase: banner, VIP summon, +25% walk speed) |
| `attackGap` | seconds of walking between attacks, per phase |
| `attacks` | attack list per phase; never the same attack twice in a row |
| `charge` | `telegraph`, sprint `speed` and `time` (lane length = speed × time), hit `damage` |
| `cone` | `telegraph`, `bullets` per volley, `spread` (radians), `speed`, `damage`, `volleys` per phase |
| `bombs` | `count` circles (the first on you), `radius`, `delay` before they go off, `damage`, `scatter` |
| `summon` | enemy `id` and `count` |

If you outlast 20:00 without closing The Executive, the clock keeps running as
OVERTIME at the final timeline values.

## Evolutions (`data/evolutions.js`)

A weapon at max level plus its paired passive (any level) evolves when you open a
Change Approved chest. If several qualify, the first in your weapon slots evolves. The
evolved weapon keeps its slot and the damage it has already done. Evolved weapons are
in `data/weapons.js` (`evolved: true`, one level row):

| Evolution | From | Passive | What changes |
| --- | --- | --- | --- |
| Fleet-Wide Reboot | Turn It Off and On Again | Domain Admin Rights | bigger, faster rings that also `stun` |
| Scheduled Task Army | PowerShell Script | Runbook | up to 8 turrets, `spread` bolts per shot |
| Zero Trust Perimeter | Firewall | Noise-Cancelling Headphones | `rings: 2` counter-rotating, never goes down |
| Automated Triage | Ticket Auto-Close | ITIL Certification | `homing` shots with separate targets, pierce 4 |
| Fiber Backbone | Patch Cable | Second Monitor | `full: true`, the cable whirls all the way round |
| Outsourced Team | Delegate | ITIL Certification | 5 contractors, faster and harder-hitting |
| Espresso Machine | Coffee Run | Cold Brew | bigger, hotter puddles that also `slow` |

## Pickups (`data/pickups.js`)

`ITEMS[id].chance` is rolled once per enemy closed (one item at most per kill). Bosses
and elites use their own `drops` instead. Items inside your pickup radius drift toward
you; touching one collects it.

| Item | Chance | Effect |
| --- | --- | --- |
| Pizza | 0.4% | `heal` sanity |
| Bulk Close | 0.12% | every ticket on the floor flies to you |
| PTO (Out of Office) | 0.06% | `invulnerable` seconds of no damage |
| Change Approved | VIP 15%, Major Incident 100% | evolution, else `CHEST_REWARDS` (1 upgrade 75%, 3 upgrades 25%) |

## Sound (`data/audio.js`)

`masterVolume` scales everything; `volume[name]` scales one sound (0 silences it).
`musicVolume` sets the background music level (0 turns it off) and `musicTempo` its
BPM. The track itself (chords, bass line, melody) is the `CHORDS`, `BASS_LINE` and
`MELODY` tables in `src/engine/audio.js`. It plays quieter while paused and stops on
the summary screen.
Rapid-fire sounds (hits, kills, ticket pickups) are throttled in `src/engine/audio.js`.

## CSAT (`data/scoring.js`)

Each kill earns `pointsPerKill × multiplier`. The multiplier grows by 1 for every
`killsPerTier` kills in a streak (up to `maxMultiplier`). A streak ends after
`streakWindow` seconds without a kill, or when you take damage if `resetOnHit` is on.

## Characters (`data/player.js`)

| Character | Unlock | Starter | Sanity | Speed | Perk |
| --- | --- | --- | --- | --- | --- |
| Tier 1 Tech | free | Turn It Off and On Again | 100 | 74 | none |
| Desktop Support | $300 | KB Article | 90 | 84 | pickup radius 46 |
| SysAdmin | $700 | PowerShell Script | 120 | 66 | `bonus: { damage: 0.1, cooldown: -0.05 }` |
| SecOps Analyst | $1,200 | Firewall | 100 | 74 | `regen: 0.5`, `bonus: { damageTaken: -0.1 }` |
| Network Engineer | $1,500 | Patch Cable | 100 | 74 | `bonus: { area: 0.15 }` |
| Help Desk Manager | $2,000 | Delegate | 110 | 67 | `summonBonus: 0.25` (Delegate helpers and PowerShell turrets) |
| The Intern | $200 | Coffee Run | 70 | 78 | `bonus: { growth: 0.3 }` (+30% XP) |
| Cloud Architect | $3,000 | Auto-Scaling | 90 | 74 | `extraCount: 1` (+1 shot, orbiting shield or helper on every tool) |

`bonus` adds to the same stat multipliers passives use, before passives stack on top.

## Overtime Pay and the shop (`data/meta.js`)

Each shift pays `perMinute × minutes + perKill × tickets + perCsat × CSAT`, plus
`winBonus` for closing The Executive. A 5-minute burnout pays roughly $100, a
10-minute shift $250 to $350, and a full win around $1,500, so the first character
unlock takes 2 to 3 shifts.

Shop items add `perLevel` per level bought to `stat`, at `costs[level]`. Stats are the
passive multipliers plus `maxHp` (flat), `regen` (sanity/s), `rerolls` (level-up
rerolls per shift, the R key on the level-up screen) and `revives` (Union Rep: come
back once at half sanity, with nearby users knocked back). Everything is saved in
`localStorage` under `helpdesk-survivors.save.v1`. Run `game.meta.reset()` in the
console to wipe it.

## Balance pass notes (Milestone 4)

These numbers were tuned with a headless bot playing full 20-minute shifts as the Tier 1
Tech, with no shop upgrades:

- **Strong player** (bot that ignores danger and vacuums every ticket): level ~33 at
  10:00 and ~71 at 20:00, all 6 weapon slots by ~9:00, first evolution around 10:00.
  It closes the Major Incident in about 1 minute and The Executive in about 2.5 minutes.
- **Cautious player** (bot that keeps its distance and dodges): burns out around
  5:00 to 6:00, at Patch Tuesday. A human who dodges well should last longer, so this
  is the low end.

The changes from that pass:

- The XP curve is steeper after level 20 (`step` 14 / 30 / 70 instead of 10 / 13 / 16).
  Before, the strong bot hit level 140 and maxed everything by 11:00.
- Boss HP went up: Major Incident 3500 to 12000, The Executive 20000 to 80000. Both were
  dying in under 15 seconds.
- Fleet-Wide Reboot was nerfed (damage 42 to 36, cooldown 0.9 to 1.2 s, stun 0.35 to
  0.3 s). It was doing over 75% of all damage.
- Earlier playtest changes from Michael: enemies 15% faster than the M2 tuning, a
  steeper HP curve (15× at 20:00), and VIP chest drops cut from 40% to 15%.

If the game feels too hard, lower `minAlive` between 4:00 and 10:00. If it feels too
easy, raise `hpMult` from 10:00 onward or boss `hp`.

## Map balance notes (office maps)

Tuned with the cautious bot plus every shop upgrade maxed (a player who has won the
previous map), 6 shifts per map. Win rates: Open Office 4/6, Server Room 5/6, Call
Center 4/6, Parking Garage 5/6. The bot walks blindly through hot aisles and can see in
the dark, so for a person the Server Room plays easier than that and the Parking Garage
harder; the garage is meant to be the toughest. A brand-new character with no upgrades
burns out around 3:00 to 3:40 on every map.

Changes from that pass: hot-aisle drain 3 to 2 sanity/s; Call Center phones every 3.5 s
(was 4) for 12 + 1.5/min damage (was 10 + 1.2) in radius 50; garage flashlight 190
(was 170) and enemy HP x1.15 (was x1.2).

## New characters and tools notes

Each tool was measured headless at level 1 and max level for 20 s against one tanky user
and against a crowd of 60 (damage per second). Max-level crowd numbers: Patch Cable ~1,500,
Delegate ~1,900, Coffee Run ~1,800 (standing still; less when you move), Auto-Scaling ~520,
Out-of-Office ~620, Ping Sweep ~640, against ~1,800 to 1,900 for Turn It Off and On Again
and Group Policy Push. Evolutions land at ~2,150 (Fiber Backbone, Espresso Machine) to
~2,850 (Outsourced Team), next to Fleet-Wide Reboot at ~1,950.

Changes from that pass: Patch Cable now aims at the nearest user in any direction (a
kiting player faces away from the crowd, so a facing-only lash hit almost nothing) and
starts at 12 damage / 1.2 s; each Delegate helper swings on its own timer and helpers
spread over different users (before, extra helpers added no damage); Fiber Backbone
damage 44 to 32; Espresso Machine 20 to 16; Outsourced Team 6 helpers / 26 damage to
5 / 20.

Bot check afterwards (cautious bot, every shop upgrade maxed, Open Office): the four new
characters win or reach The Executive in 1 to 2 of 3 to 4 shifts each, the same spread as
the original four (most losses come between 6:00 and 10:00 for every character).
