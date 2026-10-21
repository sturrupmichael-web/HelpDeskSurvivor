// Floor hazards: pooled circles that slow the player (Printer Jammer paper jams, Rat's
// Nest cable loops) or make the floor slippery (`slip`: Night Janitor wet floor).

import { Pool } from '../engine/pool.js';

export class Zones {
  constructor(assets) {
    this.assets = assets;
    this.spr = assets.sprite('paperjam');
    this.pool = new Pool(96, () => ({ x: 0, y: 0, r: 0, life: 0, max: 0, slow: 1, slip: false, spr: null }));
  }
  clear() {
    this.pool.clear();
  }
  add(x, y, params) {
    const z = this.pool.spawn() ?? this.pool.items[0]; // when full, recycle the oldest slot
    z.x = x;
    z.y = y;
    z.r = params.radius;
    z.life = z.max = params.life;
    z.slow = params.slow ?? 1;
    z.slip = !!params.slip;
    z.spr = params.sprite ? this.assets.sprite(params.sprite) : this.spr;
  }
  // Ages zones and sets the player's slow multiplier and slip flag for this tick.
  update(game, dt) {
    const p = game.player;
    p.slow = p.tailgate; // Badge Brenda (set this tick in resolveEnemies) is a slow too
    p.tailgate = 1;
    p.slip = false;
    const pool = this.pool;
    for (let i = pool.count - 1; i >= 0; i--) {
      const z = pool.items[i];
      if ((z.life -= dt) <= 0) {
        pool.removeAt(i);
        continue;
      }
      const dx = p.x - z.x;
      const dy = p.y + 10 - z.y; // the player's feet
      if (dx * dx + dy * dy < z.r * z.r) {
        if (z.slow < p.slow) p.slow = z.slow;
        if (z.slip) p.slip = true;
      }
    }
  }
  draw(ctx) {
    const pool = this.pool;
    for (let i = 0; i < pool.count; i++) {
      const z = pool.items[i];
      const s = z.spr;
      const f = s.anims.idle.frames[0];
      // Drawn at native size (crisp pixels); the slow radius is tuned to roughly match.
      ctx.globalAlpha = 0.8 * Math.min(1, z.life / 0.6, (z.max - z.life) / 0.2);
      ctx.drawImage(s.image, f[0], f[1], s.w, s.h, Math.round(z.x - s.w / 2), Math.round(z.y - s.h / 2), s.w, s.h);
    }
    ctx.globalAlpha = 1;
  }
}
