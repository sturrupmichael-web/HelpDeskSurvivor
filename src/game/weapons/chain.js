// "Chain" behavior: zaps the nearest enemy, then jumps to the next nearest not yet hit,
// stunning each one. Used by: MFA Prompt, Passwordless (evolved: `chains` separate
// chains at once, each starting on a different user), Password Expired (`confuse`
// instead of `stun`: users walk the wrong way for that many seconds).
// stats: damage, cooldown, jumps, jumpRange, stun, confuse, chains
// def: colors (bolt colors, outer then inner), sound

import { damageEnemy, nearestEnemy, stunEnemy, confuseEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const MAX_PATH = 24;
const MAX_CHAINS = 6;
const MAX_HITS = MAX_PATH * MAX_CHAINS;
const COLORS = [['#ffcd75', 5], ['#f4f4f4', 2]];

export default {
  init(w) {
    w.paths = Array.from({ length: MAX_CHAINS }, () => new Float32Array(MAX_PATH * 2));
    w.pathN = new Int32Array(MAX_CHAINS);
    w.flashT = 0;
    w.hitUids = new Int32Array(MAX_HITS);
    w.hitN = 0;
    w.skip = (e) => {
      for (let i = 0; i < w.hitN; i++) if (w.hitUids[i] === e.uid) return true;
      return false;
    };
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if (w.flashT > 0) w.flashT -= dt;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    w.hitN = 0;
    const dmg = s.damage * p.stats.damage;
    const chains = Math.min(MAX_CHAINS, s.chains ?? 1);
    let any = false;
    for (let c = 0; c < chains; c++) {
      const path = w.paths[c];
      let n = 0;
      path[n++] = p.x;
      path[n++] = p.y - 8;
      let x = p.x;
      let y = p.y;
      let range = 200 * p.stats.area;
      for (let j = 0, hits = 0; j <= s.jumps && hits < MAX_PATH - 1 && w.hitN < MAX_HITS; j++, hits++) {
        const e = nearestEnemy(game, x, y, range, w.skip);
        if (!e) break;
        w.hitUids[w.hitN++] = e.uid;
        path[n++] = e.x;
        path[n++] = e.y - 6;
        if (s.stun) stunEnemy(e, s.stun);
        if (s.confuse) confuseEnemy(e, s.confuse);
        damageEnemy(game, e, dmg, w, 0, 0, 0);
        x = e.x;
        y = e.y;
        range = s.jumpRange * p.stats.area;
      }
      w.pathN[c] = n;
      if (n >= 4) any = true;
    }
    for (let c = chains; c < MAX_CHAINS; c++) w.pathN[c] = 0;
    if (any) {
      w.flashT = 0.22;
      sfx(w.def.sound ?? 'zap');
    }
  },
  draw(w, game, ctx) {
    if (w.flashT <= 0) return;
    ctx.globalAlpha = Math.min(1, w.flashT / 0.12);
    ctx.lineWidth = 2;
    for (let c = 0; c < MAX_CHAINS; c++) {
      const path = w.paths[c];
      const n = w.pathN[c];
      if (n < 4) continue;
      for (const [color, jitter] of w.def.colors ?? COLORS) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(path[0], path[1]);
        for (let i = 2; i < n; i += 2) {
          const mx = (path[i - 2] + path[i]) / 2 + (Math.random() - 0.5) * jitter * 2;
          const my = (path[i - 1] + path[i + 1]) / 2 + (Math.random() - 0.5) * jitter * 2;
          ctx.lineTo(mx, my);
          ctx.lineTo(path[i], path[i + 1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
};
