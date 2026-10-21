// "Aura" behavior: a persistent field around the player that slows enemies inside it
// and damages them every `tick` seconds. Used by: Group Policy Push, Domain Lockdown
// (evolved: users in the outer `edge` share of the field freeze solid for `freeze` s
// on each tick).
// stats: damage, tick, radius, slow, edge, freeze

import { damageEnemy, stunEnemy } from '../enemies.js';

const buf = new Int32Array(4096);

export default {
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    const radius = s.radius * p.stats.area;
    const r2 = radius * radius;
    const now = game.time;
    const tick = s.tick * p.stats.cooldown;
    const dmg = s.damage * p.stats.damage;
    const items = game.enemies.items;
    const inner2 = s.freeze ? (radius * (1 - s.edge)) ** 2 : Infinity;
    const n = game.hash.query(p.x, p.y, radius, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      if (e.slow > s.slow) e.slow = s.slow;
      if (now - e.hitAt[w.slot] >= tick) {
        e.hitAt[w.slot] = now;
        if (d2 > inner2) stunEnemy(e, s.freeze);
        damageEnemy(game, e, dmg, w, 0, 0, 0);
      }
    }
  },
  // Drawn under enemies so the field never covers them.
  drawUnder(w, game, ctx) {
    const p = game.player;
    const radius = w.stats.radius * p.stats.area;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = w.def.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 6, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = w.def.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -game.time * 12;
    ctx.stroke();
    ctx.setLineDash([]);
    if (w.stats.freeze) {
      // The frozen edge: an icy band around the field.
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#73eff7';
      ctx.lineWidth = radius * w.stats.edge;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 6, radius * (1 - w.stats.edge / 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.globalAlpha = 1;
  },
};
