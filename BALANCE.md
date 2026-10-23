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
| `sweep` | Ping Sweep | `damage`, `range`, `rotSpeed`, `width` (radians), `hitInterval`; SIEM adds `beams`, `mark`, `markAmp` |
| `projectile` + `ring` | Reply-All Storm | as `projectile`, but the whole burst goes out at once in a ring |
| `trap` | Zip Ties | `damage`, `cooldown`, `count`, `radius` (trigger), `root` (stun s), `uses` (users per tie), `life`, `spread` |
| `chain` + `confuse` | Password Expired | as `chain`, but `confuse` seconds of walking the wrong way instead of `stun` |
| `beam` | Screen Share | `damage`, `cooldown`, `duration`, `tick`, `length`, `width`, `knockback` (aims at the nearest user, sweeps ±0.6 rad) |
| `duck` | Rubber Duck | `damage`, `cooldown`, `radius` (quack), `orbit`, `rotSpeed`, `mark` (s), `markAmp` (+damage taken) |
| `rollout` | Patch Rollout | `damage`, `cooldown`, `radius`, `gap` (s between rings), `rings` (each ring's share of `radius`), `stun` (last ring), `knockback`, `speed` |
| `cluster` | Dedupe | `damage`, `cooldown`, `radius` (blast), `range` (search), `crowdBonus` (+damage per other user in the blast), `crowdMax`; def `bonusVs` |
| `boomerang` + `curlAlt` | Fairway Driver | as `boomerang`, plus `curl` (rad/s); every other disc bends the other way |
| `grid` | Terraform Apply | `damage`, `cooldown`, `size` (tiles per side), `tile` (px), `plan` (s before it applies), `live` (s it stays hot), `knockback` |
| `projectile` + `tagXp` | Asset Tag | as `projectile`; users it hits drop `tagXp` times the ticket |
| `rollout` + `stunAll` | Patch Tuesday | as `rollout`; every ring stuns |
| `cluster` + `merge` | Golden Record | as `cluster`, plus `blasts` per cast; closed users drop no tickets, each blast drops one worth all of them x `merge` |
| `disc` | The 19th Hole | `damage`, `cooldown`, `count`, `speed`, `life` (s per flight), `bounces`, `bounceRange`, `knockback`, `aceEvery`, `aceMult`, `aceBounces`, `fullHp` (sanity share for +1 bounce); def `aceDrop` |
| `grid` + `hitInterval` | Terraform Destroy | as `grid`; live tiles hit again every `hitInterval` s |
| `projectile` + `tagMark` | RFID Inventory | as `projectile` + `tagXp`; every hit flags the user (`tagMark`: [s, extra damage]) |

A flagged user (`mark`) takes `markAmp` extra damage from every tool; flags from the duck
and the SIEM don't stack, the bigger one counts. Bosses shake off confusion like stuns
(`stunResist`).

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
Flat passives (`add`): Spare Charger adds 1 to `extraCount` per level (max 2), Snack Drawer
adds 0.25 sanity/s per level. Extended Warranty grants one comeback (`revives`), used
before the Union Rep. Lucky Lanyard (`luck`, +20%/level) multiplies the pizza / Bulk Close /
PTO drop chances, the weight of rare cards (weight under 8: Reimage, Spare Charger,
Extended Warranty, Out-of-Office Reply) and the weight of the 3-upgrade chest.

## Level-up offers

`weight` on weapons and passives is the relative chance that a card is offered. Owned
items that can still level up compete with new items while slots are free (6 weapons,
6 passives). When nothing is left to offer, the card is pizza (heals sanity).
Evolved weapons, and the base weapon of one you already evolved, are never offered.
Each level-up shows `LEVEL_UP_CHOICES` cards (4, in `data/passives.js`; it was 3 while
there were only 9 tools).

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
| `phase2` | second phase (see below): `at` HP fraction; then a second offset ring, rings 25% more often, and every other attack is a `spiral` |

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
from you and circles. `attackGap` [normal, second phase]. Attacks:

| Attack | Params |
| --- | --- |
| `hold` | ring of `count` phone bombs at `radius` around you plus one on you, `gap` left out; the second phase adds a wider ring `ringGap` s later with the gap in the same place |
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

**Second phases** (idea 14, `params.phase2`, shared code in
src/game/behaviors/phase2.js). Below `phase2.at` of its HP a boss switches once: the
`title` / `text` banner, the `phase2` growl, a shockwave, then a red glow and embers on
the boss and an orange boss bar marked ENRAGED. `wiki` is the line in the Knowledge Base.

| Boss | When | What changes |
| --- | --- | --- |
| Major Incident | 50% | double rings, rings 25% sooner, every other attack a `spiral`: `arms` streams of phones turning `turn` rad/s for `time` s, one volley every `every` s |
| The Rat's Nest | 25% of the whole fight (all three nests) | `speed` x walk speed, `lashEvery` x time between lashes, `sparks`: `count` small blasts down each cable after it lands, `delay` + `step` s apart |
| The Angry Caller | 50% | `attackGap[1]`, double "please hold", `attacks` gains `transfer`: lands `behind` px past you after `telegraph` s, hurting and shoving inside `radius` |
| The Night Janitor | 50% | `attackGap[1]`, every charge repeats once (`recharge` s telegraph), `attacks` gains `spin`: `radius` circle, then `time` s spin, ring of `wet` patches |
| The Hostile Takeover | 25% of its own HP | `attackGap[1]`, every other attack a `reorg`: memo lanes across and down at once |
| The Executive | final phase (33%) | `calendar` joins the final phase's attacks: `size` x `size` checkerboard of meetings `spacing` px apart, half after `delay` s, half after `delay2` s |

The Rat's Nest and the Hostile Takeover already split at 50%, so their second phase
comes later. The Major Incident, Angry Caller, Night Janitor and Hostile Takeover no
longer have a separate `enrageAt`: the second phase replaced it.

If you outlast 20:00 without closing The Executive, the clock keeps running as
OVERTIME at the final timeline values. After a 5-minute grace period (`OVERTIME.grace` in
`data/waves.js`, time to finish the fight) overtime gets harder every minute: each level
gives newly spawned users +10% HP and +10% spawn rate and horde size (`hpPerLevel`,
`spawnPerLevel`), and the HUD shows "OVERTIME x1", "x2"... See "Overtime ramp" below.

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
| Confluence Space | KB Article | Mechanical Keyboard | `ring: true` 6 articles all round, `curl` spirals them |
| Passwordless | MFA Prompt | Spare Charger | `chains: 3`, 12 jumps each, long stun |
| Domain Lockdown | Group Policy Push | Standing Desk | radius 110, users in the outer `edge` 30% `freeze` |
| Remote Wipe | Remote Desktop Session | Ticket Queue Filter | 8 cursors that `pierce` 2, `vacuum` closed users' tickets to you |
| Sabbatical | Out-of-Office Reply | Extended Warranty | big bubble almost always up, boss bullets come back as `reflect` damage |
| SIEM | Ping Sweep | Runbook | `beams: 2`, flags users (`mark`) for +30% damage |
| Patch Tuesday | Patch Rollout | Second Monitor | 5 rings out to radius 300, `stunAll` |
| Golden Record | Dedupe | Mechanical Keyboard | `blasts: 2`, `merge: 1.25` (one big ticket per blast) |
| The 19th Hole | Fairway Driver | Snack Drawer | `disc`: discs ricochet 4 times; every 5th throw an ace (x3, 8 bounces) whose kill drops fruit gummies (+8 sanity); +1 bounce at 80% sanity |
| Terraform Destroy | Terraform Apply | Domain Admin Rights | 9x9 grid, 0.15 s plan, tiles live 1.2 s hitting every 0.4 s |
| RFID Inventory | Asset Tag | Lucky Lanyard | 7 tags, pierce 4, `tagXp: 3`, `tagMark` +25% damage for 4 s |

## Pickups (`data/pickups.js`)

`ITEMS[id].chance` is rolled once per enemy closed (one item at most per kill). Bosses
and elites use their own `drops` instead. Items inside your pickup radius drift toward
you; touching one collects it.

| Item | Chance | Effect |
| --- | --- | --- |
| Pizza | 0.4% | `heal` sanity |
| Bulk Close | 0.12% | every ticket on the floor flies to you |
| PTO (Out of Office) | 0.06% | `invulnerable` seconds of no damage |
| Fruit gummies | never at random | The 19th Hole's ace kills: `heal` 8 sanity |
| Change Approved | VIP 15%, Major Incident 100% | evolution, else `CHEST_REWARDS` (1 upgrade 75%, 3 upgrades 25%) |

## Sound (`data/audio.js`)

`masterVolume` scales everything; `volume[name]` scales one sound (0 silences it).
`musicVolume` sets the background music level (0 turns it off) and `musicTempo` its
BPM. The track itself (chords, bass line, melody) is the `CHORDS`, `BASS_LINE` and
`MELODY` tables in `src/engine/audio.js`. It plays quieter while paused and stops on
the summary screen.
Rapid-fire sounds (hits, kills, ticket pickups) are throttled in `src/engine/audio.js`,
get a small random pitch spread (`VARY`), and at most 7 sounds may start in any 50 ms
(level-ups, warnings and other important sounds always play).

`mastering` sets the mix: sound effects go through a compressor (`threshold`, `ratio`,
`makeup`), everything gets a little room reverb (`reverb`, `sfxReverb`, `musicReverb`), and
a limiter at the end means nothing clips. Sounds in the world pan left or right of you.
Measured alone at the master output (loudest 20 ms): music about -29 dB, hits -35 dB,
tool sounds -24 to -35 dB, boss warnings -24 dB, the big moments (chest, level-up,
victory, explosions) -13 to -19 dB. Scripts: scratchpad `test3/audiosfx.mjs` and
`audiomix.mjs`.

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
| Help Desk Supervisor | $1,800 | Ticket Auto-Close | 100 | 74 | `crew` (2 built-in interns, +5% damage per player level), `bonus: { damage: -0.15 }` |
| Systems Operations Manager | $2,500 | Patch Rollout | 85 | 74 | `toolSlots: 1` (7 tool slots) |
| IT Director | Merger Day win + $4,000 | Out-of-Office Reply + Delegate | 110 | 70 | `alsoStarts: ['delegate']`, `payMult: 1.25`, `chestBonus: 1`, `bonus: { growth: -0.15 }` |
| CRM Analyst | $1,200 | Dedupe | 90 | 74 | `bonus: { luck: 0.2 }` |
| CRM Manager | $2,000 | Fairway Driver | 100 | 74 | `bonus: { area: 0.1 }`, `hurtBy: { walkup: 1.25 }` |
| Cloud Engineer | $2,200 | Terraform Apply | 100 | 74 | `damagePerMinute: 0.02`, `bonus: { damage: -0.15 }` |
| Systems Engineer | $1,600 | Group Policy Push | 105 | 67 | `auraArea: 0.2`, `slowedAmp: 0.1` |
| EUC Engineer | $1,400 | Remote Desktop Session | 90 | 74 | `cardWeights: { reimage: 3 }`, `cooldownFor: { reimage: 0.75 }` |
| Security Manager | $2,500 | Password Expired | 105 | 68 | `phishTest` (every 60 s, users on screen frozen 1 s) |
| Security Engineer | $1,800 | Ping Sweep | 100 | 74 | `bonusVs: { phish: 2, malware: 2 }`, `bonus: { pickupRadius: -0.1 }` |
| Asset Management Analyst | $1,000 | Asset Tag | 100 | 74 | `boxEvery: 45` (a moving box near you, any map), `bonus: { damage: -0.1 }` |

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

These numbers were tuned with a headless bot (now `node tests/tools/bot.mjs`, see README "Tests") playing full 20-minute shifts as the Tier 1
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

## Difficulty check (after the new tools)

With 15 tools instead of 9, the bot rarely found the strong old picks (Group Policy, KB
Article, an early evolution) and most shifts burned out between 8:00 and 9:30. Compared
with the bot on both versions (every shop upgrade maxed, closes in on bosses, takes the
passive that evolves a tool it owns):

| Map | Before the new tools | After this pass |
| --- | --- | --- |
| Open Office | 6 / 10 | 8 / 12 |
| Call Center | 3 / 5 | 3 / 5 |
| Parking Garage | 4 / 5 | 3 / 5 |

Changes from that pass:
- 4 level-up cards instead of 3 (`LEVEL_UP_CHOICES`).
- Damage up on the weaker new tools: Auto-Scaling x1.5 (and scales up sooner), Out-of-Office
  Reply x1.7 with a 20% shorter cooldown, Ping Sweep x1.7, Delegate x1.3, Coffee Run x1.2.
- Coffee Run puddles slow users (0.8 at level 1 down to 0.6 at max).
- Delegate always sends one helper at a boss in reach; Patch Cable lashes a boss in reach
  first.
- Fiber Backbone, Outsourced Team and Espresso Machine do x2.5 damage to bosses
  (`bossDamage`); before, shifts that reached The Executive with them often couldn't
  finish it.
- Bug fix: when the floor held 1,200 tickets, new XP was added to a random ticket, often
  far across the map, so levelling stalled late in a shift. Now the farthest ticket moves
  to the new drop and takes its XP.
The wave curve (`data/waves.js`) is unchanged.

## Ideas 32-46 (5 tools, 4 passives, 6 evolutions)

Max-level crowd DPS (same headless test as above, standing still in a crowd of 60):
Reply-All Storm ~800, Zip Ties ~700, Password Expired ~250 (it's mostly crowd control),
Screen Share ~1,600, Rubber Duck ~1,650 before the bonus damage its flags give your other
tools. Evolutions: Confluence Space ~3,900 (was ~9,300 at 40 damage / 1.4 s, cut to
30 / 2.2 s), SIEM ~2,300 (damage 40 to 26), Domain Lockdown ~2,500 (15 to 11), Remote
Wipe ~1,600 (raised: 60 damage, 8 cursors, pierce 2), Passwordless ~1,400 (30 to 45 damage,
plus long stuns), Sabbatical ~2,300.

With 20 tools and 13 passives each owned item turned up about a quarter less often on
level-up cards, so upgrades to things you already own now get `OWNED_WEIGHT` (x1.35,
`src/game/upgrades.js`). The bot also showed Zip Ties, Password Expired and Rubber Duck
were weak early, so Zip Ties drop one more tie at every level, Password Expired has one more
jump and a 0.3 s shorter cooldown, and Rubber Duck does 20% more damage.

Bot check (every shop upgrade maxed, Tier 1 Tech, kiting bot; average survival time):

| Map | Before (20 shifts) | After (24 shifts) |
| --- | --- | --- |
| Open Office | 20:26, 9 reached 20:00 | 22:05, 17 reached 20:00 |
| Call Center | 9:06 | 9:32 |

## Merger Day (idea 5)

Bot check with a new headless bot (every shop upgrade maxed, Tier 1 Tech, keeps its
distance, orbits the crowd, can't see boss telegraphs and never closes a 10:00 boss), so
only the comparison between maps means anything. Average survival time: Open Office 21:40,
Parking Garage 14:02, Merger Day 12:41 at first. Most Merger Day losses were during the
Hostile Takeover fight (the bot can't dodge the memo lanes), so the map was toned down:
enemy HP x1.1 (was x1.15), the Takeover heals 25 per user it absorbs (was 40), memos hit
for 16 (was 18) with a 1.2 s warning (was 1.1). After: 15:28 average over 8 shifts, about
the same as the Parking Garage.

The parent company's floor starts at 30% and grows 3.5% a minute, to 92% at most
(`twist` in `data/maps.js`); the share is measured over the chunks around the start, so
it reads right whatever the noise does.

## Map-win unlocks and the full rebalance (2026-10-21)

The 5 newest tools unlock with a Server Room win, the 4 newest passives with a Call Center
win and the 6 newest evolutions with a Parking Garage win (`data/unlocks.js`), so each map
was rebalanced for the gear a player has when they get there. Bot v2 (keeps its distance,
dodges bomb circles and boss bullets, closes in on bosses, picks owned tools and
evolution passives first) played 8 shifts per profile, Tier 1 Tech:

| Map | Shop upgrades | Unlocked from | Before | After |
| --- | --- | --- | --- | --- |
| Open Office | none | nothing | 10:39, 0 won | 12:37, 0 / 8 won |
| Open Office | 40% | nothing | 15:04, 0 / 6 | 16:27, 1 / 8 |
| Server Room | 50% | Office | 19:09, 1 / 6 | 16:28, 1 / 8 |
| Call Center | 70% | + Server Room (tools) | 15:48, 0 / 6 | 18:03, 2 / 8 |
| Parking Garage | 85% | + Call Center (passives) | 16:21, 1 / 6 | 17:24, 2 / 8 |
| Merger Day | all | + Garage (evolutions) | 21:53, 4 / 6 | 18:04, 2 / 8 |

Before, the Major Incident was the hardest boss in the game (no bot ever closed it with
40% upgrades), the Call Center was the hardest map and Merger Day, with everything
unlocked, the easiest. Changes:
- Open Office users x0.9 HP.
- Major Incident 12,000 to 9,000 HP, ring gap 3 to 5 bullets, ring damage 12 to 10,
  4 Status Updates per wave (was 6).
- Angry Caller 12,500 to 9,000 HP, hold ring 10 to 8 phones for 12 (was 16), scream 14
  to 11, conference call 6 Randys (was 10). Call Center phones every 4.5 s (was 3.5) for
  8 + 1.2/min (was 12 + 1.5).
- The Executive 80,000 to 60,000 HP: shifts that reached 20:00 mostly couldn't finish it.
- Merger Day users x1.2 HP and x1.06 speed (was x1.1 / x1.05); Hostile Takeover 13,000 HP
  (was 13,500), heals 15 per user absorbed (was 25).

## Boss second phases (idea 14, 2026-10-21)

Balance bot, `node tests/tools/bot.mjs --profiles --runs 8` (Tier 1 Tech, the progression
profiles above; shifts are called off at 30:00 so overtime survivors don't run forever),
before and after the second phases:

| Map | Shop | Before | After |
| --- | --- | --- | --- |
| Open Office | none | 10:17, 0 / 8 won | 8:01, 0 / 8 |
| Open Office | 40% | 21:20, 2 / 8 | 18:58, 0 / 8 |
| Server Room | 50% | 26:33, 1 / 8 | 22:41, 0 / 8 |
| Call Center | 70% | 19:23, 0 / 8 | 16:12, 1 / 8 |
| Parking Garage | 85% | 28:17, 0 / 8 | 22:40, 1 / 8 |
| Merger Day | all | 16:04, 1 / 8 | 16:43, 2 / 8 |

Wins overall: 5 of 48 before, 4 of 48 after, within the bot's run-to-run noise (the
no-upgrades Open Office row moved by two minutes although its bosses were never reached).
Shifts end a bit sooner on average, mostly in overtime, and every map still sits in the
0-2 of 8 range, so no numbers were changed. The "before" lengths for Office (none), Server
Room, Call Center and Merger Day were measured without the 30:00 cut-off.

## Job-title techs (ideas 52-62), 2026-10-22

Bot check, Open Office from a fresh save (8 shifts each) and Parking Garage with the
veteran save (6 shifts each). The existing 8 techs set the range: Open Office 8:16
(Help Desk Manager) to 18:51 (SecOps Analyst) on average, garage 2/6 to 5/6 wins.

| Tech | Open Office lasted | Garage (vet) won |
| --- | --- | --- |
| Help Desk Supervisor | 14:27 | 6/6 |
| Systems Operations Manager | 12:08 | 6/6 |
| IT Director (with Delegate) | 8:45 | 2/6 (before Delegate) |
| CRM Analyst | 11:34 | 4/6 |
| CRM Manager (after the Fairway Driver buff) | 10:15 | 5/6 (before) |
| Cloud Engineer | 9:02 | 5/6 |
| Systems Engineer | 14:12 | 2/6 |
| EUC Engineer | 8:23 | 4/6 |
| Security Manager | 10:19 | 3/6 |
| Security Engineer | 14:14 | 6/6 |
| Asset Management Analyst | 17:25 (2/8 won) | 3/6 |

Tuning on the way: the IT Director also starts with Delegate (Out-of-Office Reply alone
closed almost nothing early on), and Fairway Driver got +20% damage and gentler curves
(its discs were curling away from the crowd).

## Evolutions for the job-title tools (idea 63), 2026-10-22

Damage per second against a steady crowd of 120 users (150 HP each), one tool alone,
30 s: the 13 older evolutions run from 1,107 (Outsourced Team) to 2,848 (SIEM). First
cut, Patch Tuesday did 4,111 and Terraform Destroy 2,888, so Patch Tuesday went to 20
damage every 2.6 s (from 34 every 2.0 s; every ring stuns, so it's worth more than its
number) and Terraform Destroy to 26 damage. After: Patch Tuesday 2,685, Terraform Destroy
2,458, Golden Record 2,350, RFID Inventory 1,814 (plus its +25% flag for every other tool),
The 19th Hole 1,718 (plus the gummies).

Bot check, Parking Garage with the veteran save, 6 shifts per tech that starts with one
of the tools (before = the job-title table above):

| Tech (tool) | Before | After |
| --- | --- | --- |
| Systems Operations Manager (Patch Rollout) | 6/6 | 5/6, 21:47 |
| CRM Analyst (Dedupe) | 4/6 | 3/6, 18:42 |
| CRM Manager (Fairway Driver) | 5/6 | 6/6, 21:49 |
| Cloud Engineer (Terraform Apply) | 5/6 | 4/6, 22:22 |
| Asset Management Analyst (Asset Tag) | 3/6 | 5/6, 22:47 |

23 of 30 wins before and after: within the bot's noise, so nothing else was changed.

## Overtime ramp (idea 49), 2026-10-22

`OVERTIME` in `data/waves.js`. Before, overtime stayed at the 20:00 values forever, and
maxed-out bot builds lived to the 30:00 cut-off without closing The Executive. Bot wins
(vet save and progression profiles) closed The Executive between 20:40 and 29:09, most
by 24:00, so the ramp waits 5 minutes (`grace`) before it starts.

Tougher users alone didn't end those shifts: even +50% HP a level, or +20% HP and +35%
contact damage a level, left some shifts alive at 45:00 (builds users can't reach). So
each level also drains `drainPerLevel` x level sanity a second.

Bot, 8 shifts each, cap 45:00, with the final numbers:

| Setup | Before (6 shifts, cap 30:00) | After |
| --- | --- | --- |
| Parking Garage, Tier 1, vet | 5 / 6 won, 1 burnout at 19:52 | 3 / 8 won (22:39-23:27), last shift over by 31:01 |
| Open Office, SecOps, vet | 4 / 6 won (up to 29:09), 1 alive at 30:00 | 6 / 8 won (20:46-26:12), last over by 29:29 |
| Merger Day, Tier 1, 100% shop | 3 / 6 won (up to 27:43) | 5 / 8 won (20:46-25:34) |
| Call Center, Tier 1, 70% shop | 1 / 6 won | 0 / 8 won (all burned out by 21:08) |

Every shift now ends, the latest at 31:01. Win counts moved both ways, within the bot's
noise; fights that take more than about 8 minutes are the ones that now tend to be lost.

## Combo bonus cap and leaderboard CSAT limit, 2026-10-22

A player's overtime shift (level 74, 51,977 closed) was refused by the leaderboard. The
database's plausibility check allowed at most 300 CSAT a second, and the combo bonus grew
with streak length (x2,000 paid 1,000 x multiplier, x20,000 paid 10,000 x multiplier), so
one long streak added hundreds of thousands. Bot, vet saves, 45:00 cap: 4 of 12 shifts
went over 300 a second (up to 873). Repeats past x1,000 now pay the x1,000 bonus, and the
limit is 10,000 a second (`supabase/csat-limit.sql`). With the cap the same bot shifts
score 178-287 a second, still close to the old limit, so both changes are needed.

## Solid cubicles on the Open Office (idea 51), 2026-10-23

Cubicle rows on the Open Office block the tech and users (`solid: true` in data/maps.js,
rects from `Floor.solidRects`). Users stuck on a row with you behind it shuffle along it
at half speed toward the nearer end (`WALL_SHUFFLE` in src/game/enemies.js). Bosses barge
through rows (too big for the gaps between them). Boss bullets stop at rows; your tools
pass over them. The bot keeps 30 px off rows.

Balance bot, Tier 1 Tech on the Open Office (`node tests/tools/bot.mjs --map office`):

| Build                                        | Runs | Average shift | Reached 10:00 | Won   |
|----------------------------------------------|------|---------------|---------------|-------|
| Before (no walls, hpMult 0.9)                | 52   | about 10:00   | 21 (40%)      | 0     |
| Walls, hpMult 0.9                            | 20   | about 6:30    | 5 (25%)       | 0     |
| Walls, hpMult 0.7, users shuffle at 0.5x     | 36   | 7:41          | 7 (19%)       | 0     |
| Same, bosses barge through (shipped)         | 24   | 9:50          | 9 (38%)       | 2     |
| Veteran (`--vet`), before                    | 12   | 25:21         | 12            | 8/12  |
| Veteran (`--vet`), shipped                    | 12   | 22:30         | 12            | 8/12  |

Lowering hpMult further (0.6) didn't help the new tech: most extra deaths happen while
pinned against a row (about 40% of damage taken in short shifts), which toughness doesn't
change. The bot's shift length swings a lot between batches (5:09 to 11:58 for 12 runs), so treat
the gap as roughly 10:00 -> 8:30. A player who sees the walls should do better than the
bot; Michael to judge on preview.
