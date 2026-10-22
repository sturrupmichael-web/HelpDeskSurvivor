// "Cluster" behavior: on cooldown, finds the most bunched-up users within `range` of you
// and blasts that spot. Each user caught takes `damage`, plus `crowdBonus` for every other
// user in the blast (up to `crowdMax` of them). Used by: Dedupe (the def's `bonusVs`
// doubles its damage against the duplicates, see damageEnemy), Golden Record (evolved:
// `blasts` bunches per cast, and the def's `merge`: users it closes drop no tickets of
// their own, see killEnemy; each blast drops one ticket worth all of them times `merge`).
// stats: damage, cooldown, radius, range, crowdBonus, crowdMax, knockback, blasts

import { damageEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { hitBuf as buf } from '../../engine/spatialHash.js';
import { dropTicket } from '../pickups.js';

const SAMPLES = 12; // candidate centers checked per blast

export default {
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    if ((w.timer -= dt) > 0) return;
    const items = game.enemies.items;
    const radius = s.radius * p.stats.area;
    const range = s.range * p.stats.area;
    const near = game.scratch;
    const m = game.hash.query(p.x, p.y, range, near);
    const spots = []; // centers blasted this cast, so a second blast picks another bunch
    for (let b = 0; b < (s.blasts ?? 1); b++) {
      // Candidates: a sample of users in range. The best is the one with the most company.
      let best = null;
      let bestN = 0;
      for (let k = 0; k < Math.min(m, SAMPLES); k++) {
        const e = items[near[(k * 7919 + b * 13) % m]];
        if (e.dead || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > range * range) continue;
        if (spots.some((c) => (e.x - c.x) ** 2 + (e.y - c.y) ** 2 < 4 * radius * radius)) continue;
        const n = game.hash.query(e.x, e.y, radius, buf);
        if (n > bestN) (bestN = n), (best = e);
      }
      if (!best) break;
      spots.push({ x: best.x, y: best.y });
      blast(w, game, best.x, best.y, radius);
    }
    if (!spots.length) {
      w.timer = 0.2; // nobody near: check again soon
      return;
    }
    w.timer += s.cooldown * p.stats.cooldown;
    sfx('zap', spots[0].x);
  },
};

function blast(w, game, cx, cy, radius) {
  const s = w.stats;
  const p = game.player;
  const items = game.enemies.items;
  const n = game.hash.query(cx, cy, radius, buf);
  const hit = [];
  for (let k = 0; k < n; k++) {
    const e = items[buf[k]];
    if (!e.dead && (e.x - cx) ** 2 + (e.y - cy) ** 2 < (radius + e.r) ** 2) hit.push(e);
  }
  const dmg = s.damage * p.stats.damage * (1 + s.crowdBonus * Math.min(s.crowdMax, Math.max(0, hit.length - 1)));
  w.mergeXp = 0;
  for (const e of hit) damageEnemy(game, e, dmg, w, e.x - cx, e.y - cy, s.knockback);
  if (w.mergeXp > 0) dropTicket(game, cx, cy, w.mergeXp * w.def.merge);
  game.fx.ring(cx, cy, radius, w.def.color, 0.35, true);
  game.fx.ring(cx, cy, radius, '#f4f4f4', 0.45);
}
