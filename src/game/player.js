// The helpdesk technician: movement, stats (character + shop upgrades + passives), sanity.

import { moveAxis } from '../engine/input.js';
import { PASSIVES, MAX_WEAPONS, MAX_PASSIVES } from '../../data/passives.js';
import { NO_POLICY } from './policies.js';
import { XP_CURVE } from '../../data/player.js';
import { OVERTIME } from '../../data/waves.js';
import { sfx } from '../engine/audio.js';

const axis = { x: 0, y: 0 };

const STAT_KEYS = ['moveSpeed', 'attackSpeed', 'area', 'damage', 'growth', 'damageTaken', 'cooldown', 'pickupRadius', 'luck'];

// `meta` (src/game/meta.js) supplies permanent shop bonuses; omit it for a bare player.
// `policy` is the shift's combined Shift Policies (src/game/policies.js).
export function createPlayer(def, sprite, meta, policy = NO_POLICY) {
  // Flat bonuses to the stat multipliers from the character, the shop and the policies.
  const bonus = {};
  for (const k of STAT_KEYS) bonus[k] = (def.bonus?.[k] ?? 0) + (meta ? meta.bonus(k) : 0) + (policy.stats[k] ?? 0);
  const maxHp = def.maxHp + (meta ? meta.bonus('maxHp') : 0);
  const p = {
    def,
    spr: sprite,
    x: 0,
    y: 0,
    r: def.radius,
    hp: maxHp,
    maxHp,
    baseMaxHp: maxHp, // before the Standing Desk passive
    extraCount: def.extraCount ?? 0, // extra projectiles / shields / helpers on every tool (+ Spare Charger)
    baseExtraCount: def.extraCount ?? 0,
    summonDamage: 1 + (def.summonBonus ?? 0), // damage multiplier for turrets and helpers
    regen: def.regen + (meta ? meta.bonus('regen') : 0) + policy.regen, // sanity per second (+ Snack Drawer, Energy Drinks)
    baseRegen: def.regen + (meta ? meta.bonus('regen') : 0) + policy.regen,
    rerolls: meta ? meta.bonus('rerolls') : 0, // level-up rerolls left this shift
    revives: meta ? meta.bonus('revives') : 0, // Union Rep comebacks left this shift
    warranty: 0, // Extended Warranty comebacks left this shift
    longWeekend: policy.revives, // Long Weekend (policy) comebacks left this shift
    maxWeapons: Math.min(MAX_WEAPONS, policy.maxWeapons) + (def.toolSlots ?? 0), // tool slots (Budget Cuts, Vendor Lock-In; Systems Operations Manager)
    maxPassives: Math.min(MAX_PASSIVES, policy.maxPassives), // passive slots (Hiring Freeze)
    noEvolve: policy.noEvolve, // Change Freeze: chests never evolve
    statMul: policy.statMul, // stat multipliers applied after passives (Audit Week, Glass Desk)
    bonus,
    flip: false,
    moving: false,
    animT: 0,
    flash: 0,
    hurtCooldown: 0,
    slow: 1, // set each tick by floor hazards (zones.js)
    tailgate: 1, // speed multiplier from Badge Brenda following you, for the next tick
    boost: 1, // Welcome Swag Bag speed multiplier while boostT > 0
    boostT: 0,
    slip: false, // standing on a wet floor (zones.js): movement keeps its momentum
    vx: 0, // velocity (only lags behind your input while slipping)
    vy: 0,
    kx: 0, // shove from boss attacks (Angry Caller scream, Night Janitor charge)
    ky: 0,
    god: false,
    invuln: 0, // seconds of PTO (Out of Office) left: no damage
    level: 1,
    xp: 0,
    xpNeed: xpForLevel(1),
    pendingLevels: 0,
    weapons: [], // weapon instances (see weapons/index.js)
    innate: [], // built-in helpers that take no slot (Help Desk Supervisor's team)
    rampMinutes: 0, // full minutes counted so far by the Cloud Engineer's damage ramp
    passives: {}, // passive id -> level
    // Stat multipliers, recomputed whenever passives change.
    stats: { moveSpeed: 1, attackSpeed: 1, area: 1, damage: 1, growth: 1, damageTaken: 1, cooldown: 1, pickupRadius: 1, maxHp: 1, luck: 1 },
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
  p.extraCount = p.baseExtraCount;
  p.regen = p.baseRegen;
  for (const [id, lvl] of Object.entries(p.passives)) {
    const d = PASSIVES[id];
    if (d.stat) p.stats[d.stat] += d.perLevel * lvl;
    if (d.add) p[d.add] += d.perLevel * lvl; // flat: extraCount (Spare Charger), regen (Snack Drawer)
  }
  p.stats.cooldown = Math.max(0.2, p.stats.cooldown);
  // Max sanity scales with the Standing Desk passive; the extra sanity arrives filled.
  const maxHp = Math.round(p.baseMaxHp * p.stats.maxHp * (p.statMul?.maxHp ?? 1));
  if (maxHp > p.maxHp) p.hp += maxHp - p.maxHp;
  p.maxHp = maxHp;
  p.hp = Math.min(p.hp, maxHp);
  p.stats.damageTaken = Math.max(0.1, p.stats.damageTaken) * (p.statMul?.damageTaken ?? 1);
}

const SLIP_GRIP = 1.6; // how fast you change direction on a wet floor (1/s)
const SHOVE_DAMP = 7; // how fast a shove from a boss dies down (1/s)

export function updatePlayer(game, dt) {
  const p = game.player;
  moveAxis(axis);
  if (game.autopilot) game.autopilot(game, axis); // headless balance bot (see BALANCE.md)
  const speed = p.def.speed * p.stats.moveSpeed * p.slow * (p.boostT > 0 ? p.boost : 1);
  if (p.boostT > 0) p.boostT -= dt;
  if (p.slip) {
    // Wet floor: you only slowly change direction.
    const k = Math.min(1, SLIP_GRIP * dt);
    p.vx += (axis.x * speed * 1.15 - p.vx) * k;
    p.vy += (axis.y * speed * 1.15 - p.vy) * k;
  } else {
    p.vx = axis.x * speed;
    p.vy = axis.y * speed;
  }
  p.x += (p.vx + p.kx) * dt;
  p.y += (p.vy + p.ky) * dt;
  const damp = Math.exp(-SHOVE_DAMP * dt);
  p.kx *= damp;
  p.ky *= damp;
  p.moving = axis.x !== 0 || axis.y !== 0;
  if (axis.x) p.flip = axis.x < 0;
  p.animT = p.moving ? p.animT + dt : 0;
  if (p.flash > 0) p.flash -= dt;
  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  // Overtime exhaustion: every overtime level drains a little more sanity per second, so
  // even a build users can't touch burns out eventually.
  const ot = game.spawner.overtimeLevel(game);
  if (ot && !p.god && game.victoryT <= 0) p.hp -= OVERTIME.drainPerLevel * ot * dt;
  // Cloud Engineer: damage scales up with every full minute of the shift.
  if (p.def.damagePerMinute) {
    const mins = Math.floor(game.time / 60);
    if (mins !== p.rampMinutes) {
      p.bonus.damage += (mins - p.rampMinutes) * p.def.damagePerMinute;
      p.rampMinutes = mins;
      recomputeStats(p);
    }
  }
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
