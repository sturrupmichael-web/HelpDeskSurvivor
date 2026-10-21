// "Trap" behavior: on cooldown, drops traps on the floor around you. The first users to
// walk over one get tied down (stunned for `root` seconds) and hurt; a trap snaps after
// `uses` users or `life` seconds. Used by: Zip Ties.
// stats: damage, cooldown, count, radius (trigger size), root, uses, life, spread (how
//        far from you they land)

import { damageEnemy, stunEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

const MAX = 40;

export default {
  init(w) {
    w.traps = [];
    w.timer = 0.6;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if ((w.timer -= dt) <= 0) {
      w.timer += s.cooldown * p.stats.cooldown;
      const count = s.count + (p.extraCount ?? 0);
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        if (w.traps.length >= MAX) w.traps.shift();
        const a = a0 + (i / count) * Math.PI * 2;
        const d = s.spread * (0.5 + Math.random() * 0.5);
        w.traps.push({ x: p.x + Math.cos(a) * d, y: p.y + 6 + Math.sin(a) * d * 0.8, life: s.life, uses: s.uses, snap: 0 });
      }
      sfx('ziptie');
    }
    const radius = s.radius * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const items = game.enemies.items;
    for (let i = w.traps.length - 1; i >= 0; i--) {
      const t = w.traps[i];
      if (t.snap > 0) {
        // Just used up: show the zip tie pulled tight for a moment.
        if ((t.snap -= dt) <= 0) w.traps.splice(i, 1);
        continue;
      }
      if ((t.life -= dt) <= 0) {
        w.traps.splice(i, 1);
        continue;
      }
      const n = game.hash.query(t.x, t.y, radius + 12, buf);
      for (let k = 0; k < n && t.uses > 0; k++) {
        const e = items[buf[k]];
        if (e.dead || now - e.hitAt[w.slot] < s.root) continue;
        const dx = e.x - t.x;
        const dy = e.y + 4 - t.y;
        if (dx * dx + dy * dy > (radius + e.r) ** 2) continue;
        e.hitAt[w.slot] = now;
        t.uses--;
        stunEnemy(e, s.root);
        damageEnemy(game, e, dmg, w, 0, 0, 0);
        game.fx.burst(e.x, e.y, ['#94b0c2', '#f4f4f4'], 3);
      }
      if (t.uses <= 0) t.snap = 0.25;
    }
  },
  // On the floor, under everyone: a loop of white zip tie that cinches shut when used.
  drawUnder(w, game, ctx) {
    const radius = w.stats.radius * game.player.stats.area;
    ctx.lineWidth = 2;
    for (const t of w.traps) {
      const k = t.snap > 0 ? t.snap / 0.25 : Math.min(1, t.life / 0.5);
      const r = t.snap > 0 ? radius * 0.3 : radius * 0.8;
      ctx.globalAlpha = 0.9 * k;
      ctx.strokeStyle = '#94b0c2';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#f4f4f4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y - 1, r, r * 0.55, 0, Math.PI, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineWidth = 2;
      // The ratchet head and the loose tail.
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(Math.round(t.x + r - 3), Math.round(t.y - 3), 6, 6);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(Math.round(t.x + r - 2), Math.round(t.y - 2), 4, 4);
      ctx.fillRect(Math.round(t.x + r + 2), Math.round(t.y - 1), 5, 2);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  },
};
