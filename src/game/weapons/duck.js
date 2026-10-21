// "Duck" behavior: rubber ducks circle you at `orbit` px. Every `cooldown` seconds each
// one quacks: users within `radius` of it take damage and get flagged for `mark`
// seconds, taking `markAmp` extra damage from every tool meanwhile. Used by: Rubber Duck.
// stats: damage, cooldown, radius, orbit, rotSpeed, mark, markAmp

import { damageEnemy, markEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const buf = new Int32Array(4096);

export default {
  init(w) {
    w.angle = 0;
    w.quackT = 0; // seconds since the last quack, for the drawing
    w.timer = 1;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    w.angle += s.rotSpeed * p.stats.attackSpeed * dt;
    w.quackT += dt;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    w.quackT = 0;
    const count = 1 + (p.extraCount ?? 0);
    const orbit = s.orbit * p.stats.area;
    const radius = s.radius * p.stats.area;
    const dmg = s.damage * p.stats.damage;
    const items = game.enemies.items;
    for (let i = 0; i < count; i++) {
      const a = w.angle + (i / count) * Math.PI * 2;
      const dx0 = p.x + Math.cos(a) * orbit;
      const dy0 = p.y + Math.sin(a) * orbit * 0.8;
      const n = game.hash.query(dx0, dy0, radius + 16, buf);
      for (let k = 0; k < n; k++) {
        const e = items[buf[k]];
        if (e.dead) continue;
        const dx = e.x - dx0;
        const dy = e.y - dy0;
        if (dx * dx + dy * dy > (radius + e.r) ** 2) continue;
        markEnemy(e, s.mark, s.markAmp);
        damageEnemy(game, e, dmg, w, dx, dy, 30);
      }
      game.fx.ring(dx0, dy0 - 4, radius, '#ffcd75', 0.25);
    }
    sfx('quack', p.x);
  },
  draw(w, game, ctx) {
    const s = w.stats;
    const p = game.player;
    const spr = game.assets.sprite(w.def.sprite);
    const count = 1 + (p.extraCount ?? 0);
    const orbit = s.orbit * p.stats.area;
    const f = spr.anims.idle.frames[0];
    for (let i = 0; i < count; i++) {
      const a = w.angle + (i / count) * Math.PI * 2;
      const x = p.x + Math.cos(a) * orbit;
      const y = p.y + Math.sin(a) * orbit * 0.8;
      const bob = Math.round(Math.sin(game.time * 5 + i) * 1.5);
      const squash = w.quackT < 0.15 ? 1 : 0; // a little hop when it quacks
      const flip = Math.cos(a + Math.PI / 2) < 0; // faces the way it's swimming
      const dx = Math.round(x - spr.w / 2);
      const dy = Math.round(y - spr.h / 2 - 4 + bob - squash * 2);
      if (flip) ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, dx, dy, spr.w, spr.h);
      else ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, dx, dy, spr.w, spr.h);
    }
  },
};
