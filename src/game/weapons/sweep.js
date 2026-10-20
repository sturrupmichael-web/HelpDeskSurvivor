// "Sweep" behavior: a radar beam circles you nonstop and hits every user it passes
// over (each user at most once per `hitInterval`). Used by: Ping Sweep.
// stats: damage, range, rotSpeed, width (radians behind the beam that count as hit),
//        hitInterval

import { damageEnemy } from '../enemies.js';

const TAU = Math.PI * 2;
const buf = new Int32Array(4096);

export default {
  init(w) {
    w.angle = 0;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    w.angle = (w.angle + s.rotSpeed * p.stats.attackSpeed * dt) % TAU;
    const range = s.range * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const items = game.enemies.items;
    const n = game.hash.query(p.x, p.y, range + 16, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead || now - e.hitAt[w.slot] < s.hitInterval) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (range + e.r) ** 2) continue;
      const behind = (((w.angle - Math.atan2(dy, dx)) % TAU) + TAU) % TAU; // how far the beam has passed it
      if (behind > s.width) continue;
      e.hitAt[w.slot] = now;
      damageEnemy(game, e, dmg, w, 0, 0, 0);
    }
  },
  drawUnder(w, game, ctx) {
    const s = w.stats;
    const p = game.player;
    const range = s.range * p.stats.area;
    // Fading wedge behind the beam, then the beam itself.
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.14 * (1 - i / 6);
      ctx.fillStyle = w.def.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, range, w.angle - ((i + 1) * s.width) / 6, w.angle - (i * s.width) / 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = w.def.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, range, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(w.angle) * range, p.y + Math.sin(w.angle) * range);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
