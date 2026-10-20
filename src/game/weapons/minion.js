// "Minion" behavior: helpers who follow you around and tackle users near you.
// Used by: Delegate, Outsourced Team (evolved: more, faster, harder-hitting helpers in
// the def's own `sprite`).
// stats: count, damage, speed, leash, hitInterval, knockback

import { damageEnemy, nearestEnemy } from '../enemies.js';

const buf = new Int32Array(4096);

export default {
  init(w) {
    w.minions = [];
  },
  update(w, game, dt) {
    const s = w.stats;
    const p = game.player;
    const count = s.count + (p.extraCount ?? 0);
    while (w.minions.length < count) w.minions.push({ x: p.x, y: p.y, target: null, uid: 0, flip: false, animT: 0, cd: 0 });
    w.minions.length = count;
    const leash = s.leash * p.stats.area;
    const dmg = s.damage * p.stats.damage * (p.summonDamage ?? 1);
    const speed = s.speed * p.stats.moveSpeed;
    const now = game.time;
    const items = game.enemies.items;
    w.minions.forEach((m, i) => {
      // Too far behind: catch up instantly (they took the stairs).
      if (Math.hypot(m.x - p.x, m.y - p.y) > leash * 1.8) {
        m.x = p.x;
        m.y = p.y;
      }
      if (!m.target || m.target.dead || m.target.uid !== m.uid || Math.hypot(m.target.x - p.x, m.target.y - p.y) > leash) {
        // Spread out: prefer a user nobody else on the team is already tackling.
        const far = (e) => Math.hypot(e.x - p.x, e.y - p.y) > leash;
        m.target =
          nearestEnemy(game, m.x, m.y, leash, (e) => far(e) || w.minions.some((o) => o !== m && o.target === e)) ??
          nearestEnemy(game, m.x, m.y, leash, far);
        m.uid = m.target ? m.target.uid : 0;
      }
      // Head for the target, or back to a spot in the formation around you.
      const a = (i / count) * Math.PI * 2 + now * 0.5;
      const gx = m.target ? m.target.x : p.x + Math.cos(a) * 22;
      const gy = m.target ? m.target.y : p.y + Math.sin(a) * 16;
      const dx = gx - m.x;
      const dy = gy - m.y;
      const d = Math.hypot(dx, dy);
      if (d > 3) {
        const step = Math.min(d, speed * dt);
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        if (Math.abs(dx) > 1) m.flip = dx < 0;
        m.animT += dt;
      } else m.animT = 0;
      // Each helper swings on its own timer and hits everyone in reach.
      if ((m.cd -= dt) > 0) return;
      const n = game.hash.query(m.x, m.y, 16, buf);
      for (let k = 0; k < n; k++) {
        const e = items[buf[k]];
        if (e.dead) continue;
        const ex = e.x - m.x;
        const ey = e.y - m.y;
        if (ex * ex + ey * ey > (e.r + 7) ** 2) continue;
        m.cd = s.hitInterval;
        damageEnemy(game, e, dmg, w, ex, ey, s.knockback);
      }
    });
  },
  draw(w, game, ctx) {
    const spr = game.assets.sprite(w.def.sprite);
    const frames = spr.anims.walk.frames;
    for (const m of w.minions) {
      const f = frames[m.animT > 0 ? Math.floor(m.animT * spr.fps) % frames.length : 0];
      const x = Math.round(m.x - spr.anchor[0]);
      const y = Math.round(m.y + 6 - spr.anchor[1]);
      if (m.flip) ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, x, y, spr.w, spr.h);
      else ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, x, y, spr.w, spr.h);
    }
  },
};
