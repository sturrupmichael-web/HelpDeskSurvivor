// "Sweep" behavior: a radar beam circles you nonstop and hits every user it passes
// over (each user at most once per `hitInterval`). Used by: Ping Sweep, SIEM (evolved:
// `beams` evenly spaced beams, and every user hit is flagged for `mark` seconds,
// taking `markAmp` extra damage from everything meanwhile).
// stats: damage, range, rotSpeed, width (radians behind the beam that count as hit),
//        hitInterval, beams, mark, markAmp

import { damageEnemy, markEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

const TAU = Math.PI * 2;

export default {
  init(w) {
    w.angle = 0;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    const prev = w.angle;
    w.angle = (w.angle + s.rotSpeed * p.stats.attackSpeed * dt) % TAU;
    if (w.angle < prev) sfx('ping'); // the beam came all the way round
    const range = s.range * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const gap = TAU / (s.beams ?? 1);
    const items = game.enemies.items;
    const n = game.hash.query(p.x, p.y, range + 16, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead || now - e.hitAt[w.slot] < s.hitInterval) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (range + e.r) ** 2) continue;
      // How far the beam has passed it (with several beams, the nearest one behind it).
      const behind = (((w.angle - Math.atan2(dy, dx)) % gap) + gap) % gap;
      if (behind > s.width) continue;
      e.hitAt[w.slot] = now;
      if (s.mark) markEnemy(e, s.mark, s.markAmp);
      damageEnemy(game, e, dmg, w, 0, 0, 0);
    }
  },
  drawUnder(w, game, ctx) {
    const s = w.stats;
    const p = game.player;
    const range = s.range * p.stats.area;
    const beams = s.beams ?? 1;
    // Fading wedge behind each beam, then the beams themselves.
    for (let b = 0; b < beams; b++) {
      const a = w.angle + (b / beams) * TAU;
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.14 * (1 - i / 6);
        ctx.fillStyle = w.def.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, range, a - ((i + 1) * s.width) / 6, a - (i * s.width) / 6);
        ctx.closePath();
        ctx.fill();
      }
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
    for (let b = 0; b < beams; b++) {
      const a = w.angle + (b / beams) * TAU;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * range, p.y + Math.sin(a) * range);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
