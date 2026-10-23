// Balance bot: plays whole shifts in Node with no browser (src/game/headless.js), about
// 100x faster than real time, and prints how far it got. A rough stand-in for a decent
// player, for comparing maps, techs and balance changes (see BALANCE.md).
//
//   node tests/tools/bot.mjs [--map office] [--tech tier1] [--runs 10] [--vet]
//   node tests/tools/bot.mjs --profiles [--runs 8]
//   node tests/tools/bot.mjs --map office --policies casualFriday,budgetCuts
//   node tests/tools/bot.mjs --each-policy [--profile 1] [--runs 8]
//
// --map / --tech take ids from data/maps.js and data/player.js, or "all".
// --vet starts from a save with the whole shop maxed and everything unlocked.
// --profiles plays the progression table in BALANCE.md: each map with the shop share and
// map wins a player usually has when they get there (PROFILES below).

import { readFileSync } from 'node:fs';
import { headlessGame } from '../../src/game/headless.js';
import { EVOLUTIONS } from '../../data/evolutions.js';
import { MAPS } from '../../data/maps.js';
import { CHARACTERS } from '../../data/player.js';
import { SHOP } from '../../data/meta.js';
import { POLICY_ORDER } from '../../data/policies.js';

export const manifest = JSON.parse(readFileSync(new URL('../../sprites/out/manifest.json', import.meta.url)));

const WALL_R = 30; // keep this far (px) off solid cubicles...
const WALL_W = 1.5; // ...this hard

// Steering: get away from users, boss bullets and bombs (closer = stronger), drift toward
// tickets and pickups when it's safe, and close in on a boss while it can be outdamaged.
export function botPilot(game, axis) {
  const p = game.player;
  let fx = 0;
  let fy = 0;
  let danger = 0;
  const push = (x, y, r, w) => {
    const dx = p.x - x;
    const dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r * r || d2 < 1e-6) return;
    const d = Math.sqrt(d2);
    const k = (w * (r - d)) / r / d;
    fx += dx * k;
    fy += dy * k;
    danger += w * (r - d) / r;
  };
  const en = game.enemies;
  for (let i = 0; i < en.count; i++) {
    const e = en.items[i];
    if (e.dead || e.def.anchored) continue;
    push(e.x, e.y, e.def.boss ? 150 : 90, e.def.boss ? 4 : 1);
  }
  const hb = game.hazards.bullets;
  for (let i = 0; i < hb.count; i++) push(hb.items[i].x, hb.items[i].y, 60, 3);
  const bombs = game.hazards.bombs;
  for (let i = 0; i < bombs.count; i++) push(bombs.items[i].x, bombs.items[i].y, bombs.items[i].r + 24, 6);
  // Pull toward the closest pickup (items first), weaker the more danger there is.
  const pull = (pool, r, w) => {
    let best = null;
    let bd = r * r;
    for (let i = 0; i < pool.count; i++) {
      const t = pool.items[i];
      const d2 = (t.x - p.x) ** 2 + (t.y - p.y) ** 2;
      if (d2 < bd) (bd = d2), (best = t);
    }
    if (!best) return false;
    const d = Math.sqrt(bd) || 1;
    const k = w / (1 + danger);
    fx += ((best.x - p.x) / d) * k;
    fy += ((best.y - p.y) / d) * k;
    return true;
  };
  if (!pull(game.items, 400, 2)) pull(game.tickets, 220, 1);
  // Solid cubicles: keep a little off them so it doesn't get pinned against a row.
  if (game.floor.solid) {
    const feet = p.y + 10;
    const cx = Math.floor(p.x / 256);
    const cy = Math.floor(feet / 256);
    for (let y = cy - 1; y <= cy + 1; y++)
      for (let x = cx - 1; x <= cx + 1; x++)
        for (const s of game.floor.solidRects(x, y)) {
          const dx = p.x - Math.max(s[0], Math.min(p.x, s[0] + s[2]));
          const dy = feet - Math.max(s[1], Math.min(feet, s[1] + s[3]));
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < WALL_R) {
            fx += (dx / d) * WALL_W * (1 - d / WALL_R);
            fy += (dy / d) * WALL_W * (1 - d / WALL_R);
          }
        }
  }
  // Slow orbit so it doesn't sit still in an empty spot.
  const a = game.time * 0.4;
  fx += Math.cos(a) * 0.15;
  fy += Math.sin(a) * 0.15;
  const len = Math.hypot(fx, fy);
  axis.x = len > 0.05 ? fx / len : 0;
  axis.y = len > 0.05 ? fy / len : 0;
}

// Level-up cards: finish an evolution, level owned tools, take new tools while there's
// a slot, then passives (evolution passives first).
export function botPick(game, choices) {
  const p = game.player;
  const evoPassives = new Set(p.weapons.map((w) => EVOLUTIONS[w.id]?.passive).filter(Boolean));
  const score = (c) => {
    if (c.kind === 'weapon' && c.level > 1) return 50 + c.level;
    if (c.kind === 'passive' && evoPassives.has(c.id)) return 45;
    if (c.kind === 'weapon') return p.weapons.length < p.maxWeapons ? 40 : 0;
    if (c.kind === 'passive') return 20 + (p.passives[c.id] ?? 0);
    return 1;
  };
  return choices.reduce((a, b) => (score(b) > score(a) ? b : a));
}

// A save with the shop maxed and every map, tech and item unlocked.
export function veteranSave() {
  return {
    shop: Object.fromEntries(Object.entries(SHOP).map(([id, s]) => [id, s.costs.length])),
    unlocked: Object.keys(CHARACTERS),
    mapsWon: Object.keys(MAPS),
  };
}

// Where players usually are when they reach each map: [map, share of the shop bought,
// maps already won] (see "Map-win unlocks and the full rebalance" in BALANCE.md).
// --policies plays with those Shift Policies (data/policies.js); --each-policy plays one
// profile (default 1) once with no policy and then once per policy, for tuning `mult`.
export const PROFILES = [
  ['office', 0, []],
  ['office', 0.4, []],
  ['server', 0.5, ['office']],
  ['callcenter', 0.7, ['office', 'server']],
  ['garage', 0.85, ['office', 'server', 'callcenter']],
  ['merger', 1, ['office', 'server', 'callcenter', 'garage']],
];

// A save with `share` of every shop upgrade bought and `mapsWon` won (their unlocks open).
export function profileSave(share, mapsWon) {
  return {
    shop: Object.fromEntries(Object.entries(SHOP).map(([id, s]) => [id, Math.round(s.costs.length * share)])),
    mapsWon,
  };
}

const CAP = 30 * 60; // seconds of game time before a shift is called off

// Plays `runs` shifts; returns one summary per shift.
export function playShifts({ map = 'office', tech = 'tier1', runs = 1, vet = false, save = null, policies = [] } = {}) {
  const game = headlessGame(manifest, { pick: botPick, autopilot: botPilot, save: save ?? (vet ? veteranSave() : null) });
  game.meta.data.policies = policies;
  const out = [];
  for (let i = 0; i < runs; i++) {
    game.startShift(map, tech);
    // Strong builds can last in overtime for a very long time: stop at CAP, counted as a loss.
    out.push(game.playShift(CAP) ?? { won: false, time: game.time, level: game.player.level, kills: game.score.kills });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, def) => {
    const i = process.argv.indexOf('--' + name);
    return i < 0 ? def : process.argv[i + 1];
  };
  const maps = arg('map', 'office') === 'all' ? Object.keys(MAPS) : [arg('map', 'office')];
  const techs = arg('tech', 'tier1') === 'all' ? Object.keys(CHARACTERS) : [arg('tech', 'tier1')];
  const runs = +arg('runs', 5);
  const vet = process.argv.includes('--vet');
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const report = (label, opts) => {
    const t0 = performance.now();
    const res = playShifts({ runs, ...opts });
    const wins = res.filter((r) => r.won).length;
    const avg = (f) => res.reduce((s, r) => s + f(r), 0) / res.length;
    const past = res.filter((r) => r.time > 600).length;
    console.log(
      `${label} won ${wins}/${runs}  lasted ${fmt(avg((r) => r.time))}  level ${avg((r) => r.level).toFixed(0)}  ` +
        `closed ${avg((r) => r.kills).toFixed(0)}  past 10:00 ${past}/${runs}  (${((performance.now() - t0) / 1000).toFixed(1)} s)`,
    );
  };
  const policies = arg('policies', '').split(',').filter(Boolean);
  if (process.argv.includes('--each-policy')) {
    const [map, share, won] = PROFILES[+arg('profile', 1)];
    const save = () => profileSave(share, won);
    report(`${map} shop ${share * 100}% ${'(none)'.padEnd(17)}`, { map, save: save() });
    for (const id of POLICY_ORDER) report(`${map} shop ${share * 100}% ${id.padEnd(17)}`, { map, save: save(), policies: [id] });
  } else if (process.argv.includes('--profiles')) {
    const only = arg('profile', null); // one row of the table, by index
    for (const [map, share, won] of only === null ? PROFILES : [PROFILES[+only]]) report(`${map.padEnd(11)} shop ${String(share * 100).padStart(3)}%`, { map, save: profileSave(share, won) });
  } else {
    for (const map of maps) for (const tech of techs) report(`${map.padEnd(11)} ${tech.padEnd(14)}`, { map, tech, vet, policies });
  }
}
