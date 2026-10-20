// Weapon instances. Behavior modules are looked up by the `behavior` field in
// data/weapons.js. A behavior is { init?(w), update(w, game, dt), draw?(w, game, ctx),
// drawUnder?(w, game, ctx) }.

import { WEAPONS } from '../../../data/weapons.js';
import pulse from './pulse.js';
import projectile from './projectile.js';
import boomerang from './boomerang.js';
import orbit from './orbit.js';
import aura from './aura.js';
import homing from './homing.js';
import chain from './chain.js';
import turret from './turret.js';
import nuke from './nuke.js';

export const WEAPON_BEHAVIORS = { pulse, projectile, boomerang, orbit, aura, homing, chain, turret, nuke };

// `slot` indexes the per-enemy hit timers (enemy.hitAt) used by damage-over-time weapons.
export function createWeapon(id, slot) {
  const def = WEAPONS[id];
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

export function updateWeapons(game, dt) {
  for (const w of game.player.weapons) w.behavior.update(w, game, dt);
}

export function drawWeapons(game, ctx) {
  for (const w of game.player.weapons) if (w.behavior.draw) w.behavior.draw(w, game, ctx);
}

export function drawWeaponsUnder(game, ctx) {
  for (const w of game.player.weapons) if (w.behavior.drawUnder) w.behavior.drawUnder(w, game, ctx);
}
