// Weapon instances. Behavior modules are looked up by the `behavior` field in
// data/weapons.js. A behavior is { init?(w), update(w, game, dt), draw?(w, game, ctx),
// drawUnder?(w, game, ctx) }.

import { WEAPONS } from '../../../data/weapons.js';
import { HIT_SLOTS } from '../enemies.js';
import pulse from './pulse.js';
import projectile from './projectile.js';
import boomerang from './boomerang.js';
import orbit from './orbit.js';
import aura from './aura.js';
import homing from './homing.js';
import chain from './chain.js';
import turret from './turret.js';
import nuke from './nuke.js';
import whip from './whip.js';
import minion from './minion.js';
import trail from './trail.js';
import shield from './shield.js';
import sweep from './sweep.js';
import trap from './trap.js';
import beam from './beam.js';
import duck from './duck.js';
import rollout from './rollout.js';
import cluster from './cluster.js';
import grid from './grid.js';
import disc from './disc.js';

export const WEAPON_BEHAVIORS = { pulse, projectile, boomerang, orbit, aura, homing, chain, turret, nuke, whip, minion, trail, shield, sweep, trap, beam, duck, rollout, cluster, grid, disc };

// `slot` indexes the per-enemy hit timers (enemy.hitAt) used by damage-over-time weapons.
export function createWeapon(id, slot, def = WEAPONS[id]) {
  const w = {
    id,
    def,
    slot,
    behavior: WEAPON_BEHAVIORS[def.behavior],
    level: 1,
    stats: def.levels[0],
    timer: 0.5, // first activation shortly after pickup
    damageDone: 0,
  };
  if (w.behavior.init) w.behavior.init(w);
  return w;
}

export function setWeaponLevel(w, level) {
  w.level = level;
  w.stats = w.def.levels[level - 1];
}

// A tech's built-in helpers (the Help Desk Supervisor's interns): a weapon that takes no
// tool slot, can't be levelled, and lives in player.innate.
export function createCrew(crew) {
  const def = {
    name: 'Your Team', icon: 'delegate', behavior: 'minion', sprite: 'helper', tags: ['people'], color: '#3b5dc9',
    perLevel: crew.perLevel, // damage grows with the player's level
    levels: [{ count: crew.count, damage: crew.damage, speed: 120, leash: 140, hitInterval: 0.45, knockback: 50 }],
  };
  return createWeapon('crew', HIT_SLOTS - 1, def);
}

export function updateWeapons(game, dt) {
  const p = game.player;
  for (const w of p.weapons) w.behavior.update(w, game, dt);
  for (const w of p.innate) w.behavior.update(w, game, dt);
}

export function drawWeapons(game, ctx) {
  const p = game.player;
  for (const w of p.weapons) if (w.behavior.draw) w.behavior.draw(w, game, ctx);
  for (const w of p.innate) if (w.behavior.draw) w.behavior.draw(w, game, ctx);
}

export function drawWeaponsUnder(game, ctx) {
  const p = game.player;
  for (const w of p.weapons) if (w.behavior.drawUnder) w.behavior.drawUnder(w, game, ctx);
  for (const w of p.innate) if (w.behavior.drawUnder) w.behavior.drawUnder(w, game, ctx);
}
