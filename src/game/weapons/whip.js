// "Whip" behavior: on cooldown, lashes a patch cable at a boss in reach, else the nearest
// user (or the way you face; behind you too from `sides: 2`), hitting everything in a
// long thin strip.
// Used by: Patch Cable, Fiber Backbone (evolved: `full: true` hits a whole circle).
// stats: damage, cooldown, range, width, sides, knockback, full

import { damageEnemy, nearestEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const SHOW = 0.2; // seconds the lash stays on screen
const buf = new Int32Array(4096);

export default {
  init(w) {
    w.flash = 0;
    w.ux = 1;
    w.uy = 0;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if (w.flash > 0) w.flash -= dt;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    w.flash = SHOW;
    const range = s.range * p.stats.area;
    const half = (s.width * p.stats.area) / 2;
    const dmg = s.damage * p.stats.damage;
    const cy = p.y - 4;
    // A boss in reach gets lashed first; otherwise the nearest user.
    const boss = game.bossAlive() ? game.boss : null;
    const target = boss && Math.hypot(boss.x - p.x, boss.y - cy) < range + boss.r ? boss : nearestEnemy(game, p.x, cy, range * 1.3);
    const tx = target ? target.x - p.x : p.flip ? -1 : 1;
    const ty = target ? target.y - cy : 0;
    const tl = Math.hypot(tx, ty) || 1;
    w.ux = tx / tl;
    w.uy = ty / tl;
    const items = game.enemies.items;
    const n = game.hash.query(p.x, cy, range + 16, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - cy;
      if (s.full) {
        if (dx * dx + dy * dy > (range + e.r) ** 2) continue;
        damageEnemy(game, e, dmg, w, dx, dy, s.knockback);
        continue;
      }
      if (Math.abs(dx * w.uy - dy * w.ux) > half + e.r) continue;
      const along = dx * w.ux + dy * w.uy;
      const hit = (along >= -e.r && along <= range + e.r) || (s.sides > 1 && -along >= -e.r && -along <= range + e.r);
      if (hit) damageEnemy(game, e, dmg, w, dx, dy, s.knockback);
    }
    sfx('whoosh');
  },
  draw(w, game, ctx) {
    if (w.flash <= 0) return;
    const s = w.stats;
    const p = game.player;
    const range = s.range * p.stats.area;
    const t = 1 - w.flash / SHOW; // 0 -> 1 over the lash
    const cy = p.y - 4;
    ctx.globalAlpha = Math.min(1, (w.flash / SHOW) * 1.6);
    ctx.lineCap = 'round';
    if (s.full) {
      // A cable whirling all the way round.
      const a0 = t * Math.PI * 2;
      for (const [col, lw] of [[w.def.color, 5], ['#f4f4f4', 1]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(p.x, cy, range * 0.85, a0, a0 + Math.PI * 1.6);
        ctx.stroke();
      }
    } else {
      for (let side = 0; side < (s.sides > 1 ? 2 : 1); side++) {
        const d = side ? -1 : 1;
        const ux = w.ux * d;
        const uy = w.uy * d;
        const len = range * Math.min(1, t * 2.5);
        const sag = Math.sin(t * Math.PI) * 10; // bows sideways, like a cable in flight
        const tipX = p.x + ux * len;
        const tipY = cy + uy * len;
        for (const [col, lw] of [[w.def.color, 3], ['#f4f4f4', 1]]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(p.x + ux * 6, cy + uy * 6);
          ctx.quadraticCurveTo(p.x + (ux * len) / 2 + uy * sag, cy + (uy * len) / 2 - ux * sag, tipX, tipY);
          ctx.stroke();
        }
        ctx.fillStyle = '#94b0c2'; // RJ45 plug
        ctx.fillRect(Math.round(tipX - 3), Math.round(tipY - 2), 6, 4);
      }
    }
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  },
};
