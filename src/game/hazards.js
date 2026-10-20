// Boss attacks that hurt the player: pooled bullets (ringing phones, slide decks) and
// telegraphed bombs (a warning circle that fills up, then goes off).

import { Pool } from '../engine/pool.js';
import { hurtPlayer } from './player.js';
import { sfx } from '../engine/audio.js';

export class Hazards {
  constructor(assets) {
    this.assets = assets;
    this.bullets = new Pool(600, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 4, damage: 0, life: 0, spr: null, rot: 0, spin: 0 }));
    this.bombs = new Pool(48, () => ({ x: 0, y: 0, r: 0, t: 0, delay: 0, damage: 0 }));
  }

  clear() {
    this.bullets.clear();
    this.bombs.clear();
  }

  // Fires a bullet from (x, y) at `angle`.
  bullet(x, y, angle, speed, damage, sprite, spin = 0) {
    const b = this.bullets.spawn();
    if (!b) return;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.r = 5;
    b.damage = damage;
    b.life = 6;
    b.spr = this.assets.sprite(sprite);
    b.rot = angle;
    b.spin = spin;
  }

  // A warning circle at (x, y) that detonates after `delay` seconds.
  bomb(x, y, radius, delay, damage) {
    const b = this.bombs.spawn();
    if (!b) return;
    b.x = x;
    b.y = y;
    b.r = radius;
    b.t = 0;
    b.delay = delay;
    b.damage = damage;
  }

  update(game, dt) {
    const p = game.player;
    const bl = this.bullets;
    for (let i = bl.count - 1; i >= 0; i--) {
      const b = bl.items[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.spin * dt;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const rr = b.r + p.r;
      if (dx * dx + dy * dy < rr * rr) {
        if (hurtPlayer(game, b.damage)) game.onPlayerHurt();
        game.fx.burst(b.x, b.y, ['#f4f4f4', '#b13e53'], 4);
        bl.removeAt(i);
      } else if ((b.life -= dt) <= 0) bl.removeAt(i);
    }
    const bm = this.bombs;
    for (let i = bm.count - 1; i >= 0; i--) {
      const b = bm.items[i];
      if ((b.t += dt) < b.delay) continue;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      if (dx * dx + dy * dy < (b.r + p.r) * (b.r + p.r) && hurtPlayer(game, b.damage)) game.onPlayerHurt();
      game.fx.ring(b.x, b.y, b.r, '#ffcd75', 0.35, true);
      game.fx.ring(b.x, b.y, b.r * 1.2, '#b13e53', 0.45);
      game.fx.burst(b.x, b.y, ['#b13e53', '#ffcd75', '#f4f4f4'], 10);
      game.camera.shake(3);
      sfx('boom');
      bm.removeAt(i);
    }
  }

  // Bomb telegraph circles, drawn over the horde (under the player) so they stay visible.
  drawTelegraphs(ctx) {
    const bm = this.bombs;
    for (let i = 0; i < bm.count; i++) {
      const b = bm.items[i];
      const k = b.t / b.delay;
      const blink = k > 0.7 && (b.t * 12) & 1;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#b13e53';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = blink ? 1 : 0.7;
      ctx.strokeStyle = blink ? '#ffcd75' : '#b13e53';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    const bl = this.bullets;
    for (let i = 0; i < bl.count; i++) {
      const b = bl.items[i];
      const s = b.spr;
      const f = s.anims.idle.frames[0];
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.rotate(b.rot);
      ctx.drawImage(s.image, f[0], f[1], s.w, s.h, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
  }
}
