// "Nuke" behavior: long cooldown, hits everything in a large radius very hard.
// Used by: Reimage.
// stats: damage, cooldown, radius, knockback

import { damageEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';

export default {
  init(w) {
    w.timer = 3;
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if ((w.timer -= dt) > 0) return;
    w.timer += s.cooldown * p.stats.cooldown;
    sfx('wipe');
    const radius = s.radius * p.stats.area;
    const r2 = radius * radius;
    const dmg = s.damage * p.stats.damage;
    const items = game.enemies.items;
    const n = game.hash.query(p.x, p.y, radius, buf);
    for (let k = 0; k < n; k++) {
      const e = items[buf[k]];
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < r2) damageEnemy(game, e, dmg, w, dx, dy, s.knockback);
    }
    game.fx.ring(p.x, p.y, radius, '#f4f4f4', 0.5, true);
    game.fx.ring(p.x, p.y, radius, w.def.color, 0.7);
    game.camera.shake(6);
  },
};
