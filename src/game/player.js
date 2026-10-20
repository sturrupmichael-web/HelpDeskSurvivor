// The helpdesk technician: movement, stats (character + shop upgrades + passives), sanity.

import { moveAxis } from '../engine/input.js';
import { PASSIVES } from '../../data/passives.js';
import { XP_CURVE } from '../../data/player.js';
import { sfx } from '../engine/audio.js';

const axis = { x: 0, y: 0 };

const STAT_KEYS = ['moveSpeed', 'attackSpeed', 'area', 'damage', 'growth', 'damageTaken', 'cooldown', 'pickupRadius'];

// `meta` (src/game/meta.js) supplies permanent shop bonuses; omit it for a bare player.
export function createPlayer(def, sprite, meta) {
  // Flat bonuses to the stat multipliers from the character and the shop.
  const bonus = {};
  for (const k of STAT_KEYS) bonus[k] = (def.bonus?.[k] ?? 0) + (meta ? meta.bonus(k) : 0);
  const maxHp = def.maxHp + (meta ? meta.bonus('maxHp') : 0);
  const p = {
    def,
    spr: sprite,
    x: 0,
    y: 0,
    r: def.radius,
    hp: maxHp,
    maxHp,
    regen: def.regen + (meta ? meta.bonus('regen') : 0), // sanity per second
    rerolls: meta ? meta.bonus('rerolls') : 0, // level-up rerolls left this shift
    revives: meta ? meta.bonus('revives') : 0, // Union Rep comebacks left this shift
    bonus,
    flip: false,
    moving: false,
    animT: 0,
    flash: 0,
    hurtCooldown: 0,
    slow: 1, // set each tick by floor hazards (zones.js)
    god: false,
    invuln: 0, // seconds of PTO (Out of Office) left: no damage
    level: 1,
    xp: 0,
    xpNeed: xpForLevel(1),
    pendingLevels: 0,
    weapons: [], // weapon instances (see weapons/index.js)
    passives: {}, // passive id -> level
    // Stat multipliers, recomputed whenever passives change.
    stats: { moveSpeed: 1, attackSpeed: 1, area: 1, damage: 1, growth: 1, damageTaken: 1, cooldown: 1, pickupRadius: 1 },
  };
  recomputeStats(p);
  return p;
}

export function xpForLevel(level) {
  const band = XP_CURVE.bands.find((b) => level <= b.upTo);
  return XP_CURVE.first + (level - 1) * band.step;
}

export function recomputeStats(p) {
  for (const k in p.stats) p.stats[k] = 1 + (p.bonus[k] ?? 0);
  for (const [id, lvl] of Object.entries(p.passives)) {
    const d = PASSIVES[id];
    p.stats[d.stat] += d.perLevel * lvl;
  }
  p.stats.cooldown = Math.max(0.2, p.stats.cooldown);
  p.stats.damageTaken = Math.max(0.1, p.stats.damageTaken);
}

export function updatePlayer(game, dt) {
  const p = game.player;
  moveAxis(axis);
  if (game.autopilot) game.autopilot(game, axis); // headless balance bot (see BALANCE.md)
  const speed = p.def.speed * p.stats.moveSpeed * p.slow;
  p.x += axis.x * speed * dt;
  p.y += axis.y * speed * dt;
  p.moving = axis.x !== 0 || axis.y !== 0;
  if (axis.x) p.flip = axis.x < 0;
  p.animT = p.moving ? p.animT + dt : 0;
  if (p.flash > 0) p.flash -= dt;
  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
}

// Sanity damage. Returns true if any damage was applied.
export function hurtPlayer(game, amount) {
  const p = game.player;
  if (p.god || p.invuln > 0 || amount <= 0) return false;
  p.hp -= amount * p.stats.damageTaken;
  if (p.hurtCooldown <= 0) {
    p.flash = 0.1;
    p.hurtCooldown = 0.25;
    sfx('hurt');
  }
  return true;
}

export function addXp(game, amount) {
  const p = game.player;
  p.xp += amount * p.stats.growth;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level++;
    p.pendingLevels++;
    p.xpNeed = xpForLevel(p.level);
  }
}
