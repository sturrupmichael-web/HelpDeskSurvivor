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

It drops a Change Approved chest (`drops: { chest: 1 }`).

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
