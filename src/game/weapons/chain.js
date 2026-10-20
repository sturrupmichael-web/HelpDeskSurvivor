// "Chain" behavior: zaps the nearest enemy, then jumps to the next nearest not yet hit,
// stunning each one. Used by: MFA Prompt.
// stats: damage, cooldown, jumps, jumpRange, stun

import { damageEnemy, nearestEnemy, stunEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const MAX_PATH = 24;

export default {
  init(w) {
    w.path = new Float32Array(MAX_PATH * 2);
    w.pathN = 0;
    w.flashT = 0;
    w.hitUids = new Int32Array(MAX_PATH);
    w.hitN = 0;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if (w.flashT > 0) w.flashT -= dt;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    const skip = (e) => {
      for (let i = 0; i < w.hitN; i++) if (w.hitUids[i] === e.uid) return true;
      return false;
    };
    w.hitN = 0;
    w.pathN = 0;
    w.path[w.pathN++] = p.x;
    w.path[w.pathN++] = p.y - 8;
    let x = p.x;
    let y = p.y;
    let range = 200 * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    for (let j = 0; j <= s.jumps && w.hitN < MAX_PATH - 1; j++) {
      const e = nearestEnemy(game, x, y, range, skip);
      if (!e) break;
      w.hitUids[w.hitN++] = e.uid;
      w.path[w.pathN++] = e.x;
      w.path[w.pathN++] = e.y - 6;
      stunEnemy(e, s.stun);
      damageEnemy(game, e, dmg, w, 0, 0, 0);
      x = e.x;
      y = e.y;
      range = s.jumpRange * p.stats.area;
    }
    if (w.hitN) {
      w.flashT = 0.22;
      sfx('zap');
    }
  },
  draw(w, game, ctx) {
    if (w.flashT <= 0 || w.pathN < 4) return;
    ctx.globalAlpha = Math.min(1, w.flashT / 0.12);
    ctx.lineWidth = 2;
    for (const [color, jitter] of [['#ffcd75', 5], ['#f4f4f4', 2]]) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(w.path[0], w.path[1]);
      for (let i = 2; i < w.pathN; i += 2) {
        const mx = (w.path[i - 2] + w.path[i]) / 2 + (Math.random() - 0.5) * jitter * 2;
        const my = (w.path[i - 1] + w.path[i + 1]) / 2 + (Math.random() - 0.5) * jitter * 2;
        ctx.lineTo(mx, my);
        ctx.lineTo(w.path[i], w.path[i + 1]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
