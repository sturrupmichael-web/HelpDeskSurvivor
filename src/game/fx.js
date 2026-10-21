// Visual effects: death particles and floating damage numbers. Pooled; no gameplay.

import { Pool } from '../engine/pool.js';
import { drawPixelText } from '../engine/pixelfont.js';

// Cached number strings so damage numbers don't allocate.
const NUM = Array.from({ length: 1000 }, (_, i) => String(i));

export class Fx {
  constructor() {
    this.particles = new Pool(1500, () => ({ x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 0, color: '#fff' }));
    this.numbers = new Pool(140, () => ({ x: 0, y: 0, t: 0, text: '', color: '#fff', big: false }));
    this.showNumbers = true; // damage numbers on/off (settings)
    this.calm = false; // Reduce flashing (settings): softer filled flashes, no blinking telegraphs
    this.rings = new Pool(64, () => ({ x: 0, y: 0, r: 0, t: 0, life: 0, color: '#fff', fill: false }));
  }

  // Expanding ring (or filled flash when `fill`) for explosions and big hits.
  ring(x, y, r, color, life = 0.3, fill = false) {
    const g = this.rings.spawn();
    if (!g) return;
    g.x = x;
    g.y = y;
    g.r = r;
    g.t = 0;
    g.life = life;
    g.color = color;
    g.fill = fill;
  }

  clear() {
    this.particles.clear();
    this.numbers.clear();
    this.rings.clear();
  }

  burst(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      const p = this.particles.spawn();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 60;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 30;
      p.t = 0;
      p.life = 0.35 + Math.random() * 0.25;
      p.color = colors[i % colors.length];
    }
  }

  number(x, y, amount, color = '#f4f4f4') {
    if (!this.showNumbers) return;
    const n = this.numbers.spawn();
    if (!n) return;
    const v = Math.round(amount);
    n.text = v < 1000 ? NUM[Math.max(0, v)] : String(v);
    n.x = x + (Math.random() * 8 - 4);
    n.y = y;
    n.t = 0;
    n.color = color;
    n.big = false;
  }

  // Floating word(s), e.g. pickup labels. Same pool as damage numbers, drawn larger.
  text(x, y, str, color = '#ffcd75') {
    const n = this.numbers.spawn();
    if (!n) return;
    n.text = str;
    n.x = x;
    n.y = y;
    n.t = -0.6; // lives 0.6 s longer than a damage number
    n.color = color;
    n.big = true;
  }

  update(dt) {
    const ps = this.particles;
    for (let i = ps.count - 1; i >= 0; i--) {
      const p = ps.items[i];
      p.t += dt;
      if (p.t >= p.life) {
        ps.removeAt(i);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
    }
    const rs = this.rings;
    for (let i = rs.count - 1; i >= 0; i--) if ((rs.items[i].t += dt) >= rs.items[i].life) rs.removeAt(i);
    const ns = this.numbers;
    for (let i = ns.count - 1; i >= 0; i--) {
      const n = ns.items[i];
      n.t += dt;
      n.y -= 18 * dt;
      if (n.t > 0.6) ns.removeAt(i);
    }
  }

  draw(ctx) {
    const rs = this.rings;
    for (let i = 0; i < rs.count; i++) {
      const g = rs.items[i];
      const k = g.t / g.life;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r * (0.3 + 0.7 * k), 0, Math.PI * 2);
      if (g.fill) {
        ctx.globalAlpha = (this.calm ? 0.2 : 0.6) * (1 - k);
        ctx.fillStyle = g.color;
        ctx.fill();
      } else {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    }
    // Damage numbers at 1x, pickup labels at 2x, in the pixel font.
    const ns = this.numbers;
    for (let i = 0; i < ns.count; i++) {
      const n = ns.items[i];
      ctx.globalAlpha = n.t < 0.4 ? 1 : 1 - (n.t - 0.4) / 0.2;
      drawPixelText(ctx, n.text, n.x, n.y, n.color, n.big ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
}
