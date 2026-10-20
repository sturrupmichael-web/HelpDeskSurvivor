// "Boomerang" behavior: throws spinning projectiles that pierce everything, slow
// down, and fly back to the player. Used by: KB Article.
// stats: damage, cooldown, count, speed, range, knockback

import { fireProjectile } from '../projectiles.js';
import { nearestEnemy } from '../enemies.js';

export default {
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    const t = nearestEnemy(game, p.x, p.y, 400);
    const base = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.flip ? Math.PI : 0;
    const speed = s.speed * p.stats.attackSpeed;
    const range = s.range * p.stats.area;
    const count = s.count + (p.extraCount ?? 0);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * 0.55;
      fireProjectile(game, w, p.x, p.y - 4, Math.cos(a), Math.sin(a), {
        kind: 'boomerang', spr: w.def.sprite, speed, damage: s.damage * p.stats.damage,
        pierce: 999, life: 6, knockback: s.knockback, r: 7, spin: 10,
        decel: (speed * speed) / (2 * range), // stops after `range` px, then returns
      });
    }
  },
};
