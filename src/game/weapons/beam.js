// "Beam" behavior: on cooldown, projects a wide beam at the nearest user (or the way
// you face) for `duration` seconds, sweeping it back and forth across the crowd, and
// hurts every user in it every `tick` seconds. Used by: Screen Share.
// stats: damage, cooldown, duration, tick, length, width, knockback

import { damageEnemy, nearestEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

const SWEEP = 0.6; // radians either side of the aim the beam swings through

export default {
  init(w) {
    w.active = 0;
    w.aim = 0;
    w.ux = 1;
    w.uy = 0;
    w.timer = 0.8;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if (w.active <= 0) {
      if ((w.timer -= dt) > 0) return;
      w.timer = s.cooldown * p.stats.cooldown;
      w.active = s.duration;
      const t = nearestEnemy(game, p.x, p.y, s.length * p.stats.area * 1.5);
      w.aim = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.flip ? Math.PI : 0;
      w.dir = Math.random() < 0.5 ? 1 : -1;
      sfx('projector');
    }
    w.active -= dt;
    // One slow pass from one side of the aim to the other, like a presenter waving at the slide.
    const a = w.aim + w.dir * SWEEP * Math.cos((Math.PI * w.active) / s.duration);
    w.ux = Math.cos(a);
    w.uy = Math.sin(a);
    const len = s.length * p.stats.area;
    const half = (s.width * p.stats.area) / 2;
    const dmg = s.damage * p.stats.damage;
    const tick = s.tick * p.stats.cooldown;
    const now = game.time;
    const cx = p.x + (w.ux * len) / 2;
    const cy = p.y - 4 + (w.uy * len) / 2;
    const items = game.enemies.items;
    const n = game.hash.query(cx, cy, len / 2 + half + 16, buf);
    for (let i = 0; i < n; i++) {
      const e = items[buf[i]];
      if (e.dead || now - e.hitAt[w.slot] < tick) continue;
      const dx = e.x - p.x;
      const dy = e.y - (p.y - 4);
      const along = dx * w.ux + dy * w.uy;
      if (along < -e.r || along > len + e.r) continue;
      // The beam widens a little toward the far end, like a projector.
      if (Math.abs(dx * w.uy - dy * w.ux) > half * (0.6 + 0.4 * Math.max(0, along) / len) + e.r) continue;
      e.hitAt[w.slot] = now;
      damageEnemy(game, e, dmg, w, w.ux, w.uy, s.knockback);
    }
  },
  draw(w, game, ctx) {
    if (w.active <= 0) return;
    const s = w.stats;
    const p = game.player;
    const len = s.length * p.stats.area;
    const half = (s.width * p.stats.area) / 2;
    const x0 = p.x;
    const y0 = p.y - 4;
    const nx = -w.uy;
    const ny = w.ux;
    const ex = x0 + w.ux * len;
    const ey = y0 + w.uy * len;
    const fade = Math.min(1, w.active / 0.2, (s.duration - w.active) / 0.08);
    const flicker = 0.85 + Math.sin(game.time * 40) * 0.15;
    // The light cone.
    ctx.globalAlpha = 0.22 * fade * flicker;
    ctx.fillStyle = w.def.color;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * half * 0.6, y0 + ny * half * 0.6);
    ctx.lineTo(ex + nx * half, ey + ny * half);
    ctx.lineTo(ex - nx * half, ey - ny * half);
    ctx.lineTo(x0 - nx * half * 0.6, y0 - ny * half * 0.6);
    ctx.closePath();
    ctx.fill();
    // A bright core and scanlines.
    ctx.globalAlpha = 0.5 * fade;
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = w.def.color;
    const off = (game.time * 60) % 8;
    for (let d = off; d < len; d += 8) {
      const h = half * (0.6 + (0.4 * d) / len);
      const px = x0 + w.ux * d;
      const py = y0 + w.uy * d;
      ctx.beginPath();
      ctx.moveTo(px + nx * h, py + ny * h);
      ctx.lineTo(px - nx * h, py - ny * h);
      ctx.stroke();
    }
    // The slide everyone is squinting at, at the far end.
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(Math.round(ex - 7), Math.round(ey - 5), 14, 10);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(Math.round(ex - 6), Math.round(ey - 4), 12, 8);
    ctx.fillStyle = '#41a6f6';
    ctx.fillRect(Math.round(ex - 5), Math.round(ey - 3), 10, 2);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(Math.round(ex - 5), Math.round(ey), 7, 1);
    ctx.fillRect(Math.round(ex - 5), Math.round(ey + 2), 5, 1);
    ctx.globalAlpha = 1;
  },
};
