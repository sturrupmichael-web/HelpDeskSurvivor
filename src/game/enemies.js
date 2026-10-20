// End-user horde: pooled enemy objects, movement via behaviors, separation,
// contact damage, death (with drops and on-death spawns) and drawing.

import { ENEMIES } from '../../data/enemies.js';
import { BEHAVIORS } from './behaviors/index.js';
import { hurtPlayer } from './player.js';
import { dropTicket, rollItemDrops } from './pickups.js';
import { sfx } from '../engine/audio.js';

export const HIT_SLOTS = 8; // per-weapon "last hit" timestamps for damage-over-time weapons
const DEFAULT_FOOT = 10;
const NO_PARAMS = {};
const SHADOW_LIMIT = 400; // above this many enemies, skip drop shadows to halve draw calls

let nextUid = 1;

export function makeEnemy() {
  return {
    def: null, spr: null, behavior: null, params: NO_PARAMS,
    uid: 0, x: 0, y: 0, r: 7, foot: DEFAULT_FOOT,
    kx: 0, ky: 0, // knockback velocity
    dx: 0, dy: 0, // fixed direction (dashes, storm lines)
    hp: 1, maxHp: 1, speed: 0, damage: 0, xp: 1, kbMul: 1,
    slow: 1, // speed multiplier from slows; reset every tick, set by weapons
    buff: 1, // speed multiplier from VIP auras; reset every tick
    stun: 0, life: -1,
    flash: 0, animT: 0, flip: false, dead: false, noSep: false,
    t0: 0, t1: 0, // scratch timers for behaviors
    anim: 'walk', pose: -1, state: 0, stateT: 0, phase: 0, ax: 0, ay: 0, n: 0, // boss attack state
    heavy: false, // bosses: the horde can't shove them around
    hitAt: new Float64Array(HIT_SLOTS),
  };
}

export function spawnEnemy(game, id, x, y, hpMult = 1, speedMult = 1, behaviorId) {
  const e = game.enemies.spawn();
  if (!e) return null;
  const def = ENEMIES[id];
  e.def = def;
  e.spr = game.assets.sprite(def.sprite);
  e.behavior = BEHAVIORS[behaviorId ?? def.behavior];
  e.params = def.params ?? NO_PARAMS;
  e.uid = nextUid++;
  e.x = x;
  e.y = y;
  e.r = def.radius;
  e.foot = def.foot ?? DEFAULT_FOOT;
  e.kx = e.ky = e.dx = e.dy = 0;
  // The current map toughens regular users (bosses keep their tuned HP).
  const map = def.boss ? null : game.map;
  e.hp = e.maxHp = def.hp * hpMult * (map?.hpMult ?? 1);
  e.speed = def.speed * speedMult * (map?.speedMult ?? 1);
  e.damage = def.damage;
  e.xp = def.xp;
  e.kbMul = def.knockback;
  e.slow = e.buff = 1;
  e.stun = 0;
  e.life = -1;
  e.flash = 0;
  e.animT = Math.random();
  e.dead = false;
  e.noSep = !!def.noSeparation;
  e.t0 = e.t1 = 0;
  e.anim = 'walk';
  e.pose = -1;
  e.state = e.stateT = e.phase = e.ax = e.ay = e.n = 0;
  e.heavy = !!def.boss;
  e.hitAt.fill(-1e9);
  if (e.behavior.init) e.behavior.init(e, game);
  return e;
}

export function updateEnemies(game, dt) {
  const pool = game.enemies;
  const damp = Math.exp(-8 * dt);
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    if (e.dead) continue;
    if (e.life > 0 && (e.life -= dt) <= 0) {
      e.dead = true;
      continue;
    }
    if (e.stun > 0) e.stun -= dt;
    else e.behavior.update(e, game, dt);
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    e.kx *= damp;
    e.ky *= damp;
    e.slow = 1;
    e.buff = 1;
    e.animT += dt;
    if (e.flash > -1) e.flash -= dt;
  }
}

// After the spatial hash is built: push overlapping enemies apart, run behaviors'
// post-hash hooks (auras), and apply contact damage to the player.
export function resolveEnemies(game, dt) {
  const { enemies: pool, hash, scratch: buf } = game;
  const items = pool.items;
  for (let i = 0; i < pool.count; i++) {
    const a = items[i];
    if (a.dead) continue;
    if (a.behavior.post) a.behavior.post(a, game);
    if (a.noSep) continue;
    const n = hash.query(a.x, a.y, a.r * 2, buf);
    let checked = 0;
    for (let k = 0; k < n && checked < 10; k++) {
      const j = buf[k];
      if (j <= i) continue;
      const b = items[j];
      if (b.noSep || b.dead) continue;
      checked++;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.01;
      const push = (min - d) / d;
      const pa = a.heavy ? 0 : b.heavy ? 0.5 : 0.25;
      const pb = b.heavy ? 0 : a.heavy ? 0.5 : 0.25;
      a.x -= dx * push * pa;
      a.y -= dy * push * pa;
      b.x += dx * push * pb;
      b.y += dy * push * pb;
    }
  }

  // Contact: touching enemies drain sanity continuously; exploders go off once.
  const p = game.player;
  const n = hash.query(p.x, p.y, p.r + 16, buf);
  let drain = 0;
  for (let k = 0; k < n; k++) {
    const e = items[buf[k]];
    if (e.dead) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const min = e.r + p.r;
    if (dx * dx + dy * dy >= min * min) continue;
    if (e.def.explode) {
      e.dead = true;
      game.fx.burst(e.x, e.y - 6, e.def.particle, 14);
      game.fx.ring(e.x, e.y, 28, '#ffcd75');
      game.camera.shake(4);
      sfx('boom');
      if (hurtPlayer(game, e.def.explode.damage)) game.onPlayerHurt();
    } else drain += e.damage;
  }
  if (drain > 0 && hurtPlayer(game, drain * dt)) game.onPlayerHurt();
}

// Applies weapon damage. (dx, dy) is the knockback direction (need not be normalized).
export function damageEnemy(game, e, amount, weapon, dx, dy, knockback) {
  if (e.dead) return;
  if (weapon && e.def.resist) for (const tag of weapon.def.tags) amount *= e.def.resist[tag] ?? 1;
  e.hp -= amount;
  // Bosses take hits constantly; flash them in short blinks so their art stays readable.
  if (!e.heavy) e.flash = 0.12;
  else if (e.flash < -0.2) e.flash = 0.06;
  if (weapon) weapon.damageDone += Math.min(amount, e.hp + amount);
  game.fx.number(e.x, e.y - 14, amount);
  sfx('hit');
  if (knockback && (dx || dy)) {
    const d = Math.hypot(dx, dy);
    e.kx += (dx / d) * knockback * e.kbMul;
    e.ky += (dy / d) * knockback * e.kbMul;
  }
  if (e.hp <= 0) killEnemy(game, e);
}

// Stuns an enemy for `seconds`, scaled down by its stunResist (bosses barely flinch).
export function stunEnemy(e, seconds) {
  const t = seconds * (e.def.stunResist ?? 1);
  if (t > e.stun) e.stun = t;
}

export function killEnemy(game, e) {
  e.dead = true;
  if (e.xp > 0) dropTicket(game, e.x, e.y, e.xp);
  game.fx.burst(e.x, e.y - 6, e.def.particle, 6);
  game.score.onKill();
  game.achievements.onKill(e.def.sprite);
  sfx('pop');
  rollItemDrops(game, e);
  if (e.def.boss) game.onBossDown(e);
  const od = e.def.onDeath;
  if (od) {
    const hpMult = game.spawner.sample(game.time, 'hpMult');
    for (let i = 0; i < od.count; i++) {
      const a = (i / od.count) * Math.PI * 2 + Math.random();
      const c = spawnEnemy(game, od.spawn, e.x + Math.cos(a) * 10, e.y + Math.sin(a) * 10, hpMult);
      if (c) {
        c.kx = Math.cos(a) * 120;
        c.ky = Math.sin(a) * 120;
      }
    }
  }
}

// Nearest live enemy to (x, y) within maxR, searching outward in growing rings.
// `skip(e)` can exclude candidates. Returns the enemy or null.
export function nearestEnemy(game, x, y, maxR, skip) {
  const { enemies, hash, scratch2: buf } = game;
  for (let r = 64; ; r = Math.min(maxR, r * 2)) {
    const n = hash.query(x, y, r, buf);
    let best = null;
    let bestD = r * r;
    for (let k = 0; k < n; k++) {
      const e = enemies.items[buf[k]];
      if (e.dead || (skip && skip(e))) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best || r >= maxR) return best;
  }
}

// Boss attack telegraphs go on top of the horde so they're never hidden by it.
export function drawBossTelegraphs(game, ctx) {
  const pool = game.enemies;
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    if (e.heavy && !e.dead && e.behavior.drawUnder) e.behavior.drawUnder(e, game, ctx);
  }
}

export function drawEnemies(game, ctx, shadowImg, left, top, right, bottom) {
  const pool = game.enemies;
  const shadows = pool.count < SHADOW_LIMIT;
  // Under-layer first (VIP auras), so it never covers other enemies.
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    if (!e.behavior.drawUnder || e.dead || e.heavy) continue;
    if (e.x < left - 100 || e.x > right + 100 || e.y < top - 100 || e.y > bottom + 100) continue;
    e.behavior.drawUnder(e, game, ctx);
  }
  for (let i = 0; i < pool.count; i++) {
    const e = pool.items[i];
    if (e.dead) continue;
    const fy = e.y + e.foot;
    const spr = e.spr;
    if (e.x < left - spr.w || e.x > right + spr.w || fy < top || fy > bottom + spr.h) continue;
    if (e.heavy) ctx.drawImage(shadowImg, Math.round(e.x - 26), Math.round(fy - 6), 52, 12);
    else if (shadows) ctx.drawImage(shadowImg, Math.round(e.x - 10), Math.round(fy - 3));
    const a = spr.anims[e.anim] ?? spr.anims.walk;
    const frames = e.flash > 0 && a.hit ? a.hit : a.frames;
    const f = frames[(e.pose >= 0 ? e.pose : Math.floor(e.animT * spr.fps)) % frames.length];
    if (e.flip) {
      ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, Math.round(e.x - (spr.w - spr.anchor[0])), Math.round(fy - spr.anchor[1]), spr.w, spr.h);
    } else {
      ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, Math.round(e.x - spr.anchor[0]), Math.round(fy - spr.anchor[1]), spr.w, spr.h);
    }
    if (e.stun > 0) {
      // Little "awaiting approval" sparkle while stunned.
      ctx.fillStyle = (e.animT * 8) & 1 ? '#ffcd75' : '#f4f4f4';
      ctx.fillRect(Math.round(e.x - 3), Math.round(fy - spr.h - 2), 2, 2);
      ctx.fillRect(Math.round(e.x + 2), Math.round(fy - spr.h - 4), 2, 2);
    }
    if (e.def.elite) {
      const w = 24;
      const bx = Math.round(e.x - w / 2);
      const by = Math.round(fy - spr.h - 3);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(bx - 1, by - 1, w + 2, 4);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(bx, by, Math.max(0, (e.hp / e.maxHp) * w), 2);
    }
  }
}
