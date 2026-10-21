// "Trail" behavior: leaves puddles behind you that hurt (and with `slow`, slow down)
// users standing in them. Used by: Coffee Run, Espresso Machine (evolved).
// stats: damage, tick, radius, life, gap, slow

import { damageEnemy } from '../enemies.js';
import { Pool } from '../../engine/pool.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

const MAX = 48;

// All puddles down: reuse the one closest to drying up.
function oldest(pool) {
  let best = pool.items[0];
  for (let i = 1; i < pool.count; i++) if (pool.items[i].life < best.life) best = pool.items[i];
  return best;
}

export default {
  init(w) {
    w.puddles = new Pool(MAX, () => ({ x: 0, y: 0, life: 0, max: 0, wob: 0 }));
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    const radius = s.radius * p.stats.area;
    if ((w.timer -= dt) <= 0) {
      w.timer += s.gap * p.stats.cooldown;
      const d = w.puddles.spawn() ?? oldest(w.puddles);
      d.x = p.x + (Math.random() - 0.5) * 6;
      d.y = p.y + 6;
      d.life = d.max = s.life;
      d.wob = Math.random() * 6;
    }
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const items = game.enemies.items;
    const pool = w.puddles;
    for (let i = pool.count - 1; i >= 0; i--) {
      const d = pool.items[i];
      if ((d.life -= dt) <= 0) {
        pool.removeAt(i);
        continue;
      }
      const n = game.hash.query(d.x, d.y, radius + 12, buf);
      for (let k = 0; k < n; k++) {
        const e = items[buf[k]];
        if (e.dead) continue;
        const dx = e.x - d.x;
        const dy = e.y + 4 - d.y;
        if (dx * dx + dy * dy > (radius + e.r) ** 2) continue;
        if (s.slow && e.slow > s.slow) e.slow = s.slow;
        if (now - e.hitAt[w.slot] < s.tick) continue;
        e.hitAt[w.slot] = now;
        damageEnemy(game, e, dmg, w, 0, 0, 0);
      }
    }
  },
  // Under everyone: a spreading brown puddle that fades out.
  drawUnder(w, game, ctx) {
    const radius = w.stats.radius * game.player.stats.area;
    const pool = w.puddles;
    for (let i = 0; i < pool.count; i++) {
      const d = pool.items[i];
      const k = Math.min(1, (d.max - d.life) * 6) * Math.min(1, d.life / 0.6);
      ctx.globalAlpha = 0.6 * k;
      ctx.fillStyle = w.def.color;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, radius * (0.9 + Math.sin(d.wob) * 0.1), radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 * k;
      ctx.fillStyle = '#a0703c';
      ctx.beginPath();
      ctx.ellipse(d.x - radius * 0.3, d.y - radius * 0.15, radius * 0.3, radius * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
