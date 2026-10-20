// "Shield" behavior: every `cooldown` seconds a bubble pops up around you for
// `duration` seconds. Users touching it take damage and get shoved out; boss bullets
// that reach it bounce off and vanish. Used by: Out-of-Office Reply.
// stats: cooldown, duration, radius, damage, knockback

import { damageEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const HIT_EVERY = 0.25;
const buf = new Int32Array(4096);

export default {
  init(w) {
    w.active = 0;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if (w.active <= 0) {
      if ((w.timer -= dt) > 0) return;
      w.timer = s.cooldown * p.stats.cooldown;
      w.active = s.duration;
      sfx('bubble');
    }
    w.active -= dt;
    const radius = s.radius * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const now = game.time;
    const items = game.enemies.items;
    const n = game.hash.query(p.x, p.y, radius + 20, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (radius + e.r) ** 2) continue;
      if (now - e.hitAt[w.slot] < HIT_EVERY) continue;
      e.hitAt[w.slot] = now;
      damageEnemy(game, e, dmg, w, dx || 1, dy, s.knockback);
    }
    const bl = game.hazards.bullets;
    for (let i = bl.count - 1; i >= 0; i--) {
      const b = bl.items[i];
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 > radius * radius) continue;
      game.fx.burst(b.x, b.y, ['#73eff7', '#f4f4f4'], 4);
      bl.removeAt(i);
    }
  },
  draw(w, game, ctx) {
    if (w.active <= 0) return;
    const p = game.player;
    const radius = w.stats.radius * p.stats.area;
    const fade = Math.min(1, w.active / 0.3);
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = w.def.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = (0.6 + Math.sin(game.time * 20) * 0.2) * fade;
    ctx.strokeStyle = w.def.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Tiny envelope at the top: the auto-reply.
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 4 - radius - 3), 8, 6);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 4 - radius - 2), 2, 1);
    ctx.fillRect(Math.round(p.x + 1), Math.round(p.y - 4 - radius - 2), 2, 1);
    ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 4 - radius - 1), 2, 1);
    ctx.globalAlpha = 1;
  },
};
