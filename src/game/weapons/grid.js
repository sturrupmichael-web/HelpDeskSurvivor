// "Grid" behavior: on cooldown, plans a square grid of tiles centered where you stand.
// After `plan` seconds the grid applies: for `live` seconds every tile hits each user on
// it once. Used by: Terraform Apply, Terraform Destroy (evolved: with `hitInterval`, live
// tiles hit the same user again every that many seconds).
// stats: damage, cooldown, size (tiles per side), tile (px), plan, live, knockback, hitInterval

import { damageEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

export default {
  init(w) {
    w.grids = []; // { x, y, half, t } (t counts up from 0: planning, then live)
  },

  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if ((w.timer -= dt) <= 0) {
      w.timer += s.cooldown * p.stats.cooldown;
      w.grids.push({ x: p.x, y: p.y + 4, half: (s.size * s.tile * p.stats.area) / 2, t: 0, cast: game.time });
      sfx('blip', p.x);
    }
    const items = game.enemies.items;
    const dmg = s.damage * p.stats.damage;
    for (let i = w.grids.length - 1; i >= 0; i--) {
      const g = w.grids[i];
      const was = g.t;
      g.t += dt;
      if (g.t < s.plan) continue;
      if (was < s.plan) {
        sfx('zap', g.x);
        game.camera.shake(2);
      }
      if (g.t > s.plan + s.live) {
        w.grids.splice(i, 1);
        continue;
      }
      const n = game.hash.query(g.x, g.y, g.half * 1.42, buf);
      for (let k = 0; k < n; k++) {
        const e = items[buf[k]];
        // One hit per user per grid (hitAt remembers which grid last hit it), or one per
        // hitInterval seconds (hitAt is then the time of the last hit).
        if (e.dead || (s.hitInterval ? game.time - e.hitAt[w.slot] < s.hitInterval : e.hitAt[w.slot] === g.cast)) continue;
        if (Math.abs(e.x - g.x) > g.half + e.r * 0.5 || Math.abs(e.y - g.y) > g.half + e.r * 0.5) continue;
        e.hitAt[w.slot] = s.hitInterval ? game.time : g.cast;
        damageEnemy(game, e, dmg, w, e.x - g.x, e.y - g.y, s.knockback);
      }
    }
  },

  // On the floor: dashed outlines while planning, then the tiles light up.
  drawUnder(w, game, ctx) {
    const s = w.stats;
    for (const g of w.grids) {
      const size = s.size;
      const tile = (g.half * 2) / size;
      const x0 = g.x - g.half;
      const y0 = g.y - g.half;
      if (g.t < s.plan) {
        const k = g.t / s.plan;
        ctx.globalAlpha = 0.25 + 0.35 * k;
        ctx.strokeStyle = w.def.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) ctx.strokeRect(Math.round(x0 + i * tile) + 1.5, Math.round(y0 + j * tile) + 1.5, Math.round(tile) - 3, Math.round(tile) - 3);
        ctx.setLineDash([]);
        // The plan fills in tile by tile.
        const done = Math.floor(k * size * size);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = w.def.color;
        for (let t = 0; t < done; t++) ctx.fillRect(Math.round(x0 + (t % size) * tile) + 2, Math.round(y0 + Math.floor(t / size) * tile) + 2, Math.round(tile) - 4, Math.round(tile) - 4);
      } else {
        const k = 1 - (g.t - s.plan) / s.live;
        ctx.globalAlpha = 0.55 * k;
        ctx.fillStyle = w.def.color;
        ctx.fillRect(Math.round(x0), Math.round(y0), Math.round(g.half * 2), Math.round(g.half * 2));
        ctx.globalAlpha = 0.8 * k;
        ctx.strokeStyle = '#f4f4f4';
        ctx.lineWidth = 1;
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) ctx.strokeRect(Math.round(x0 + i * tile) + 0.5, Math.round(y0 + j * tile) + 0.5, Math.round(tile) - 1, Math.round(tile) - 1);
      }
    }
    ctx.globalAlpha = 1;
  },
};
