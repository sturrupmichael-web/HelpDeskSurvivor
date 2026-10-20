// "Projectile" behavior: on cooldown, fires a quick burst of shots at the nearest
// enemies. Used by: Ticket Auto-Close, Automated Triage (evolved: `homing` shots that
// each pick a different target and steer toward it at `turn` rad/s), Auto-Scaling
// (`scalePer`: one extra shot per that many users within `scaleRadius`, up to `maxCount`).
// stats: damage, cooldown, count, speed, pierce, life, knockback, homing, turn,
//        scaleRadius, scalePer, maxCount

import { fireProjectile } from '../projectiles.js';
import { nearestEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const BURST_GAP = 0.08;
const MAX_TARGETS = 16;

export default {
  init(w) {
    w.burstLeft = 0;
    w.burstT = 0;
    w.targets = new Int32Array(MAX_TARGETS); // uids already targeted in this burst
    w.targetN = 0;
    w.skip = (e) => {
      for (let i = 0; i < w.targetN; i++) if (w.targets[i] === e.uid) return true;
      return false;
    };
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    w.timer -= dt;
    if (w.timer <= 0) {
      w.timer += s.cooldown * p.stats.cooldown;
      w.burstLeft = s.count + (p.extraCount ?? 0);
      if (s.scalePer) {
        const crowd = game.hash.query(p.x, p.y, s.scaleRadius * p.stats.area, game.scratch);
        w.burstLeft = Math.min(s.maxCount + (p.extraCount ?? 0), w.burstLeft + Math.floor(crowd / s.scalePer));
      }
      w.burstT = 0;
      w.targetN = 0;
    }
    if (w.burstLeft <= 0 || (w.burstT -= dt) > 0) return;
    w.burstT = BURST_GAP;
    w.burstLeft--;
    sfx('shoot');
    const t = nearestEnemy(game, p.x, p.y, 420, s.homing ? w.skip : undefined);
    if (t && s.homing && w.targetN < MAX_TARGETS) w.targets[w.targetN++] = t.uid;
    const dx = t ? t.x - p.x : p.flip ? -1 : 1;
    const dy = t ? t.y - p.y : 0;
    fireProjectile(game, w, p.x, p.y - 4, dx, dy, {
      spr: w.def.sprite, speed: s.speed * p.stats.attackSpeed, damage: s.damage * p.stats.damage,
      pierce: s.pierce, life: s.life, knockback: s.knockback, r: 5 * p.stats.area,
      kind: s.homing ? 'homing' : 'straight', target: s.homing ? t : null, turn: s.turn,
    });
  },
};
