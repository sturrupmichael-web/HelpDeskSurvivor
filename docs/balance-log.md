# Balance log

Dated notes from each balance pass and feature: what the bot played, the win rates it
got, and what was tuned. Oldest first. The knobs themselves are described in
[BALANCE.md](../BALANCE.md); add a new section at the bottom after each balance change.

Bot: `node tests/tools/bot.mjs --map all --runs 5 [--tech id] [--vet] [--each-policy]`.

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
limit is 10,000 a second (`supabase/008_csat-limit.sql`). With the cap the same bot shifts
score 178-287 a second, still close to the old limit, so both changes are needed.

## Solid cubicles on the Open Office (idea 51), 2026-10-23

Cubicle rows on the Open Office block the tech and users (`solid: true` in data/maps.js,
rects from `Floor.solidRects`). Users stuck on a row with you behind it walk along it at
full speed toward the nearer end and round the corner (`avoidSolids` in src/game/enemies.js). Bosses barge
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

Michael on preview (2026-10-23): too easy, users slowed right down at walls. Two causes:
the half-speed shuffle, and a bug where users at a row's corner jittered on the spot
(about 20% of users touching a row were nearly still; now about 1%). Fixed both, users
walk round at full speed, and Open Office hpMult went back to 0.9. Bot after that:

| Build                                        | Runs | Average shift | Reached 10:00 | Won   |
|----------------------------------------------|------|---------------|---------------|-------|
| Full-speed pathing, corner fix, hpMult 0.9   | 36   | 5:45          | 2 (6%)        | 0     |
| Veteran (`--vet`), same                      | 12   | 21:37         | 12            | 10/12 |

So for the bot the Open Office is now clearly harder than before walls (new tech about
10:00 -> 5:45); Michael's call whether that's right for the first map.

## Solid racks and pods: Server Room and Call Center (issue #65), 2026-10-23

Same collision as the Open Office, now also on the Server Room (rack rows and CRAC units;
the hot aisles stay walkable) and the Call Center (headset pod rows, with 32 px aisles
between paired rows). Every map's furniture comes from one layout function
(`Floor.layout`), which both paints a chunk and, with a do-nothing canvas, collects its
solid rects, so walls always match the art. Wallboards stay walkable. No toughness changes.

Balance bot, progression profiles (`node tests/tools/bot.mjs --profiles --profile 2|3`):

| Map (profile)            | Runs | Before walls: average / past 10:00 / won | With walls: average / past 10:00 / won |
|--------------------------|------|------------------------------------------|----------------------------------------|
| Server Room (shop 50%)   | 24   | 21:07 / 24 / 1                           | 15:47 / 20 / 0                         |
| Call Center (shop 70%)   | 24   | 17:13 / 24 / 1                           | 13:12 / 19 / 1                         |

Like the Open Office, both got harder for the bot (shifts about 4-5 minutes shorter);
Michael found the Open Office too easy at first, so no easing for now. If they turn out
too hard, lower the map's `hpMult` in data/maps.js.

## Solid furniture on Merger Day (issue #66), 2026-10-23

Merger Day gets the same collision: the old company's cubicle rows and the parent
company's hot-desk benches block; bean bags, banners, box piles and the moving boxes
don't. When the parent company takes over chunks (`Floor.setOwned`), the solid cache is
dropped and laid out again, so a taken chunk's cubicles give way to benches; anyone
standing where a bench lands is pushed out by the usual collision. No toughness changes.

Balance bot, progression profile (`node tests/tools/bot.mjs --profiles --profile 5`, shop 100%,
every earlier map won):

| Build         | Runs | Average shift | Reached 10:00 | Won   |
|---------------|------|---------------|---------------|-------|
| Before walls  | 32   | 19:15         | 32            | 14/32 |
| With walls    | 32   | 16:54         | 32            | 9/32  |

A smaller hit than the other maps (open navy floor has few benches), but still harder for
the bot.

## Solid cars and pillars in the Parking Garage (issue #67), 2026-10-24

The last map gets collision: parked cars (28x46 px each, 14 px gaps between neighbours, so
users and the tech fit between them) and pillars block; empty stalls stay open. No
toughness changes. Every map now has `solid: true`.

Balance bot, progression profile (`node tests/tools/bot.mjs --profiles --profile 4`, shop 85%):

| Build         | Runs | Average shift | Reached 10:00 | Won  |
|---------------|------|---------------|---------------|------|
| Before walls  | 32   | 24:55         | 32            | 3/32 |
| With walls    | 32   | 19:42         | 31            | 4/32 |

Wins didn't move; the shorter average comes from shifts that ran deep into overtime ending
sooner (the bot's shifts are capped at 30:00).

## Hardcore (idea 6, 2026-10-24)

Bot, veteran save (shop maxed), tier1, 8 shifts per map, `node tests/tools/bot.mjs --map <id> --vet --runs 8 [--hardcore]`:

| Map | Normal won | Hardcore won |
|---|---|---|
| Open Office | 3/8 | 4/8 |
| Server Room | 4/8 | 2/8 |
| Call Center | 2/8 | 2/8 |
| Parking Garage | 5/8 | 3/8 |
| Merger Day | 4/8 | 3/8 |
| Total | 18/40 | 14/40 |

First version (users +25% HP). The extra users also mean extra XP, so builds come together sooner, which offsets part of the pressure. Michael asked for "harder but not impossible", so users also hit harder now:

| Users' HP / contact damage | Bot Hardcore wins |
|---|---|
| +25% / +0% (first version) | 14/40 (35%) |
| +50% / +30% | 3/40 (8%), too hard |
| +35% / +15% | 5/40 (13%) |
| **+30% / +10% (shipped)** | **16/60 (27%)**: office 7/12, merger 4/12, garage 3/12, callcenter 1/12, server 1/12 |

Normal shifts with the same save win 18/40 (45%). Contact damage is the strongest knob: small steps make a big difference.
