# Balance knobs

Every number lives in `data/`. Engine code never hard-codes balance. Edit, save and
reload `dev.html`. No build step is needed (except for art; see README).

This file says what each knob does. The dated results of each balance pass (bot win
rates, what was tuned and why) are in [docs/balance-log.md](docs/balance-log.md).

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
| `data/unlocks.js` | What each map win adds to the game (tools, passives, evolutions, techs) |
| `data/policies.js` | Shift Policies (their effects and multipliers) and Hardcore |
| `data/tutorial.js` | Training Shift steps, coach text and its small rush |
| `data/review.js` | The end-of-shift performance review's ratings and comments |
| `data/changelog.js` | "What's new" notes (no balance; add one per published change) |
| `data/leaderboard.js` | Online leaderboard address, publishable key, name length (no balance) |

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

**Map bosses.** On the Server Room, Call Center, Parking Garage and Merger Day, the map's
`boss` (data/maps.js) replaces the Major Incident at 10:00, banner text included.

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
`data/waves.js`, time to finish the fight) overtime gets harder every `every` seconds: each level
gives newly spawned users more HP, contact damage and speed (`hpPerLevel`,
`damagePerLevel`, `speedPerLevel` up to `maxSpeed`), more spawns (`spawnPerLevel`), and
drains `drainPerLevel` x level sanity a second. The HUD shows "OVERTIME x1", "x2"... See "Overtime ramp" in docs/balance-log.md.

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

**Ticket combos:** reaching a streak length in `comboMilestones` pops "RESOLVED xN!" and
pays a one-off N x `comboBonus` CSAT (times the multiplier). Past the last milestone,
every `comboEvery` closes pays that last bonus again, which keeps long overtime shifts
under the leaderboard's CSAT limit (supabase/008_csat-limit.sql).

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

## Maps (`data/maps.js`)

Each map sets `hpMult` / `speedMult` (on top of the timeline), `mixBoost` (multiplies
users' spawn weights), `pay` (Overtime Pay bonus), its `twist` numbers and its 10:00
`boss`. Merger Day also has `newUsers` (`from` seconds, `share` of spawns). `solid: true`
makes the furniture block the tech, users and boss bullets (rects from
`Floor.solidRects`); bosses barge through. Maps unlock by winning the one before
(`unlockAfter`).

## Map-win unlocks (`data/unlocks.js`)

Winning a shift on a map adds its listed tools and passives to the level-up cards, its
evolutions to Change Approved chests, and its techs to the Characters screen (they still
cost Overtime Pay). Anything not listed is there from the start. Players keep anything
their Knowledge Base shows they already used.

## Shift Policies and Hardcore (`data/policies.js`)

Each policy has a `group` (bad, mixed, perk), a `mult` and `fx` effects (enemy HP and
speed, spawns, stats, slots, drop odds...). Up to 3 are picked; their `mult`s multiply,
clamped to `POLICY_RULES`, into the shift's pay and leaderboard score. `unlock` is null
(from the start), a map id (win there) or `noEvolveWin`. Balance each one with
`node tests/tools/bot.mjs --each-policy`.

`HARDCORE` (once every map is won) uses the same `fx` keys plus `phase2Sooner`,
`otGrace` (seconds of overtime grace) and `lockPassives`, turns perks off and doubles pay
and score (`mult: 2`).
