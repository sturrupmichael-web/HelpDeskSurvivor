// "Orbit" behavior: shields circle the player for `duration` seconds, then go down for
// `cooldown`. Each shield hits an enemy at most once per `hitInterval`.
// Used by: Firewall, Zero Trust Perimeter (evolved: the def's `rings: 2` adds an inner
// ring spinning the other way; duration Infinity keeps it up permanently).
// stats: damage, count (per ring), radius, rotSpeed, duration, cooldown, hitInterval, knockback

const INNER = 0.6; // inner ring radius, relative to the outer one

import { damageEnemy } from '../enemies.js';

const buf = new Int32Array(4096);

export default {
  init(w) {
    w.angle = 0;
    w.active = 0; // seconds of uptime left
    w.timer = 0.3;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    w.angle += s.rotSpeed * p.stats.attackSpeed * dt;
    if (w.active > 0) {
      w.active -= dt;
      if (w.active <= 0) w.timer = s.cooldown * p.stats.cooldown;
    } else if ((w.timer -= dt) <= 0) {
      w.active = s.duration;
    }
    if (w.active <= 0) return;
    const radius = s.radius * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const items = game.enemies.items;
    const rings = w.def.rings ?? 1;
    for (let i = 0; i < s.count * rings; i++) {
      const inner = i >= s.count;
      const a = (inner ? -w.angle : w.angle) + (i / s.count) * Math.PI * 2;
      const rr0 = inner ? radius * INNER : radius;
      const sx = p.x + Math.cos(a) * rr0;
      const sy = p.y + Math.sin(a) * rr0;
      const n = game.hash.query(sx, sy, 20, buf);
      for (let k = 0; k < n; k++) {
        const e = items[buf[k]];
        if (e.dead || now - e.hitAt[w.slot] < s.hitInterval) continue;
        const dx = e.x - sx;
        const dy = e.y - sy;
        const rr = e.r + 7;
        if (dx * dx + dy * dy >= rr * rr) continue;
        e.hitAt[w.slot] = now;
        damageEnemy(game, e, dmg, w, e.x - p.x, e.y - p.y, s.knockback);
      }
    }
  },
  draw(w, game, ctx) {
    if (w.active <= 0) return;
    const s = w.stats;
    const p = game.player;
    const spr = game.assets.sprite(w.def.sprite);
    const f = spr.anims.idle.frames[0];
    const radius = s.radius * p.stats.area;
    ctx.globalAlpha = Math.min(1, w.active / 0.3);
    const rings = w.def.rings ?? 1;
    for (let i = 0; i < s.count * rings; i++) {
      const inner = i >= s.count;
      const a = (inner ? -w.angle : w.angle) + (i / s.count) * Math.PI * 2;
      const r = inner ? radius * INNER : radius;
      ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, Math.round(p.x + Math.cos(a) * r - spr.w / 2), Math.round(p.y + Math.sin(a) * r - spr.h / 2 - 2), spr.w, spr.h);
    }
    ctx.globalAlpha = 1;
  },
};
