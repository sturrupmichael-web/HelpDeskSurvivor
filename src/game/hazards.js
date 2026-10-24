// Boss attacks that hurt the player: pooled bullets (ringing phones, slide decks) and
// telegraphed bombs (a warning circle that fills up, then goes off).
// Everything a boss throws is drawn with a bright outline (yellow, then a dark rim), so it
// stands out from a crowd of users in any colour. Outlines never blink, and telegraph
// borders only blink when Reduce flashing is off.

import { Pool } from '../engine/pool.js';
import { hurtPlayer } from './player.js';
import { sfx } from '../engine/audio.js';
import { blit } from '../engine/renderer.js';

const EDGE = '#ffcd75'; // the bright outline
const RIM = '#1a1c2c'; // dark rim outside it, for light floors and white flashes

// Strokes the current path as an attack border: a dark rim, a bright edge, then `color`.
// `alpha` is the border's strength (blinking telegraphs pass a lower one on off-beats).
export function strokeAttack(ctx, color, lineWidth, alpha = 0.9) {
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = RIM;
  ctx.lineWidth = lineWidth + 4;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = lineWidth + 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Border strength for a telegraph that blinks in the last moments (steady when calm).
export function blinkAlpha(game, on = 0.9, off = 0.5) {
  return game.fx.calm || (game.time * 10) & 1 ? on : off;
}

// A copy of a sprite's first frame with a 1px bright outline and a 1px dark rim around it
// (2px bigger on every side), made once per sprite.
const outlined = new WeakMap();
function outlinedFrame(s) {
  let c = outlined.get(s);
  if (c) return c;
  const f = s.anims.idle.frames[0];
  const w = s.w + 4;
  const h = s.h + 4;
  const tint = (color) => {
    const t = document.createElement('canvas');
    t.width = w;
    t.height = h;
    const g = t.getContext('2d');
    blit(g, s, f, 2, 2);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    return t;
  };
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const rim = tint(RIM);
  const edge = tint(EDGE);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) g.drawImage(rim, dx, dy);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g.drawImage(edge, dx, dy);
  blit(g, s, f, 2, 2);
  outlined.set(s, c);
  return c;
}

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
      } else if (game.floor.blocked(b.x, b.y)) {
        // Solid cubicles are cover: the shot hits the partition.
        game.fx.burst(b.x, b.y, ['#f4f4f4', '#8b9bb4'], 3);
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
  // Near the end the border blinks; with Reduce flashing it turns solid yellow instead.
  drawTelegraphs(game, ctx) {
    const bm = this.bombs;
    for (let i = 0; i < bm.count; i++) {
      const b = bm.items[i];
      const k = b.t / b.delay;
      const late = k > 0.7 && (game.fx.calm || (b.t * 12) & 1);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#b13e53';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      strokeAttack(ctx, late ? EDGE : '#b13e53', 2, late ? 1 : 0.8);
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    const bl = this.bullets;
    for (let i = 0; i < bl.count; i++) {
      const b = bl.items[i];
      const img = outlinedFrame(b.spr);
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.rotate(b.rot);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
  }
}
