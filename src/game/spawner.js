// Wave spawner: reads data/waves.js, spawns enemies on a ring just outside the
// screen, keeps a minimum horde alive, runs scripted events, and recycles stragglers.

import { TIMELINE, EVENTS, SPAWNER, SHIFT_LENGTH, OVERTIME } from '../../data/waves.js';
import { spawnEnemy } from './enemies.js';
import { ENEMIES } from '../../data/enemies.js';
import { sfx } from '../engine/audio.js';

function mixAt(t) {
  let m = TIMELINE[0].mix;
  for (const k of TIMELINE) if (k.t <= t) m = k.mix;
  return m;
}

// The timeline mix with the current map's mixBoost applied, plus the map's own users
// (newUsers) that have started showing up by time t. Cached per mix, map and how many
// of the map's users are in.
const boosted = new WeakMap();
function mapMix(mix, map, t) {
  if (!map) return mix;
  const extra = map.newUsers ?? {};
  let n = 0;
  for (const id in extra) if (t >= extra[id].from) n++;
  if (!n && !Object.keys(map.mixBoost).length) return mix;
  let byMap = boosted.get(mix);
  if (!byMap) boosted.set(mix, (byMap = new Map()));
  let list = byMap.get(map);
  if (!list) byMap.set(map, (list = []));
  let m = list[n];
  if (!m) {
    m = {};
    let total = 0;
    for (const id in mix) total += m[id] = mix[id] * (map.mixBoost[id] ?? 1);
    Object.keys(extra)
      .slice(0, n)
      .forEach((id) => (m[id] = total * extra[id].share));
    list[n] = m;
  }
  return m;
}

// A Shift Policy's mixBoost (Reply-All Day, Phishing Simulation) on top of the map's mix.
// Cached per mix and policy.
const policyMixes = new WeakMap();
function policyMix(mix, policy) {
  if (!Object.keys(policy.mixBoost).length) return mix;
  let byPolicy = policyMixes.get(mix);
  if (!byPolicy) policyMixes.set(mix, (byPolicy = new WeakMap()));
  let m = byPolicy.get(policy);
  if (!m) {
    m = {};
    for (const id in mix) m[id] = mix[id] * (policy.mixBoost[id] ?? 1);
    byPolicy.set(policy, m);
  }
  return m;
}

function pick(mix) {
  let total = 0;
  for (const id in mix) total += mix[id];
  let r = Math.random() * total;
  for (const id in mix) if ((r -= mix[id]) <= 0) return id;
  return Object.keys(mix)[0];
}

// Each office map can swap the event marked `mapBoss` (the 10:00 boss) for its own
// (`boss` in data/maps.js). Cached, so the merged event isn't rebuilt every tick.
const mapEvents = new WeakMap();
export function mapEvent(ev, map) {
  if (!ev?.mapBoss || !map.boss) return ev;
  let byMap = mapEvents.get(ev);
  if (!byMap) mapEvents.set(ev, (byMap = new Map()));
  if (!byMap.has(map)) byMap.set(map, { ...ev, ...map.boss });
  return byMap.get(map);
}

export class Spawner {
  constructor() {
    this.pt = { x: 0, y: 0 };
    this.reset();
  }

  reset() {
    this.acc = 0;
    this.nextEvent = 0; // index into EVENTS
    this.warned = -1;
    this.storm = null; // active storm: { ev, left, t }
    this.bossScale = 1; // spawn-rate multiplier while a boss is up (event's spawnScale)
    this.stopped = false; // the shift is over: no more spawns
    this.otShown = 0; // overtime level the player has been warned about
  }

  // Linearly interpolated timeline value at time t.
  sample(t, key) {
    let a = TIMELINE[0];
    for (const k of TIMELINE) {
      if (k.t > t) return a[key] + (k[key] - a[key]) * ((t - a.t) / (k.t - a.t || 1));
      a = k;
    }
    return a[key];
  }

  // Random point on the ring just outside the visible area.
  ringPoint(game, angle = Math.random() * Math.PI * 2) {
    const { w, h } = game.view;
    const r = Math.hypot(w, h) / 2 + SPAWNER.ringPadding;
    this.pt.x = game.player.x + Math.cos(angle) * r;
    this.pt.y = game.player.y + Math.sin(angle) * r;
    return this.pt;
  }

  // Monday Morning (policy): the queue (how many users, how fast they come, who they are
  // and how tough) starts as it is at `headStart`.
  busyTime(game) {
    return Math.max(game.time, game.policy?.headStart ?? 0);
  }

  // Overtime level (data/waves.js OVERTIME): 0 until the grace period after 20:00 runs out,
  // then 1, 2, 3... one more each minute.
  overtimeLevel(game) {
    const t = game.time - SHIFT_LENGTH - (game.policy?.otGrace ?? OVERTIME.grace); // Hardcore: shorter grace
    return t < 0 || game.tutorial ? 0 : 1 + Math.floor(t / OVERTIME.every);
  }

  spawn(game, id, angle) {
    const t = game.time;
    const pt = this.ringPoint(game, angle);
    id ??= pick(policyMix(mapMix(mixAt(this.busyTime(game)), game.map, t), game.policy));
    const ot = this.overtimeLevel(game);
    const hp = this.sample(this.busyTime(game), 'hpMult') * (1 + OVERTIME.hpPerLevel * ot);
    const speed = this.sample(t, 'speedMult') * (1 + Math.min(OVERTIME.maxSpeed, OVERTIME.speedPerLevel * ot));
    const e = spawnEnemy(game, id, pt.x, pt.y, hp, speed);
    if (e && ot) e.damage *= 1 + OVERTIME.damagePerLevel * ot;
    return e;
  }

  update(game, dt) {
    if (this.stopped) return;
    const t = game.time;
    this.events(game, dt);
    const ot = this.overtimeLevel(game);
    if (ot > this.otShown) {
      this.otShown = ot;
      if (ot === 1) game.hud.banner('UNPAID OVERTIME', "Every minute you're still here, the users get tougher. Close The Executive's ticket!", 4);
      sfx('warn');
    }
    const scale = (game.bossAlive() ? this.bossScale : 1) * (1 + OVERTIME.spawnPerLevel * this.overtimeLevel(game)) * (game.policy?.spawns ?? 1); // Hardcore: more users
    const busy = this.busyTime(game);
    this.acc += this.sample(busy, 'rate') * scale * dt;
    const min = this.sample(busy, 'minAlive') * scale;
    while (game.enemies.count < min && game.enemies.count < SPAWNER.maxEnemies) this.spawn(game);
    while (this.acc >= 1) {
      this.acc -= 1;
      if (game.enemies.count < SPAWNER.maxEnemies) this.spawn(game);
    }
    this.recycle(game);
  }

  events(game, dt) {
    const t = game.time;
    const ev = mapEvent(EVENTS[this.nextEvent], game.map);
    if (ev) {
      if (this.warned !== this.nextEvent && t >= ev.t - ev.warn) {
        this.warned = this.nextEvent;
        game.hud.banner(ev.title, ev.text, ev.warn + 2);
        sfx(ev.type === 'boss' ? 'siren' : 'alarm');
      }
      if (t >= ev.t) {
        this.nextEvent++;
        if (ev.type === 'ring') this.ringEvent(game, ev);
        else if (ev.type === 'storm') this.storm = { ev, left: ev.waves, t: 0 };
        else if (ev.type === 'boss') this.bossEvent(game, ev);
        game.camera.shake(3);
      }
    }
    const s = this.storm;
    if (s && (s.t -= dt) <= 0) {
      this.stormWave(game, s.ev);
      s.t = s.ev.gap;
      if (--s.left <= 0) this.storm = null;
    }
  }

  // Bosses always spawn at full base HP and speed (no timeline scaling).
  bossEvent(game, ev) {
    game.timeline?.mark(game, 'boss', ENEMIES[ev.boss]?.name ?? ev.title);
    const pool = game.enemies;
    if (pool.count >= pool.capacity) {
      // Make room: a boss must never fail to show up because the floor is full.
      for (let i = 0; i < 20; i++) if (!pool.items[i].def.boss) pool.items[i].dead = true;
      pool.compact();
    }
    const pt = this.ringPoint(game);
    const e = spawnEnemy(game, ev.boss, pt.x, pt.y);
    if (!e) return;
    this.bossScale = ev.spawnScale ?? 1;
    game.setBoss(e);
  }

  ringEvent(game, ev) {
    for (let i = 0; i < ev.count; i++) this.spawn(game, pick(ev.mix), (i / ev.count) * Math.PI * 2);
  }

  // A wall of enemies entering from one side and marching straight across.
  stormWave(game, ev) {
    const { w, h } = game.view;
    const p = game.player;
    const side = (Math.random() * 4) | 0;
    const horizontal = side < 2; // enters from left/right
    const dir = side % 2 === 0 ? 1 : -1;
    const span = horizontal ? h + 80 : w + 80;
    const start = horizontal ? p.x - dir * (w / 2 + 30) : p.y - dir * (h / 2 + 30);
    const life = ((horizontal ? w : h) + 120) / ev.speed + 1;
    const t = game.time;
    for (let i = 0; i < ev.count; i++) {
      const across = (i / ev.count - 0.5) * span + (Math.random() - 0.5) * 10;
      const depth = Math.random() * 40;
      const x = horizontal ? start - dir * depth : p.x + across;
      const y = horizontal ? p.y + across : start - dir * depth;
      const e = spawnEnemy(game, pick(ev.mix), x, y, this.sample(t, 'hpMult'), 1, 'line');
      if (!e) break;
      e.speed = ev.speed;
      e.dx = horizontal ? dir : 0;
      e.dy = horizontal ? 0 : dir;
      e.life = life;
    }
  }

  // Enemies left far behind are moved back onto the spawn ring.
  recycle(game) {
    const { w, h } = game.view;
    const limit = (Math.hypot(w, h) / 2) * SPAWNER.recycleDistance;
    const p = game.player;
    const pool = game.enemies;
    for (let i = 0; i < pool.count; i++) {
      const e = pool.items[i];
      if (e.life > 0) continue; // event swarms expire on their own
      if (Math.abs(e.x - p.x) > limit || Math.abs(e.y - p.y) > limit) {
        const pt = this.ringPoint(game);
        e.x = pt.x;
        e.y = pt.y;
        e.kx = e.ky = 0;
      }
    }
  }

  // Debug: jump the clock to just before the next event's warning.
  skipToNextEvent(game) {
    const ev = EVENTS[this.nextEvent];
    if (ev) game.time = Math.max(game.time, ev.t - ev.warn - 0.5);
  }
}
