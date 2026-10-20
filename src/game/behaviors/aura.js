// The VIP: elite chaser whose "this is urgent" aura speeds up nearby end-users.
// params: radius (px), speedBuff (multiplier)

import chase from './chase.js';

// The aura circle is pre-rendered once per radius; drawing a cached image is much
// cheaper than filling a big arc for every VIP every frame.
const auraCache = new Map();
function auraImage(r) {
  let c = auraCache.get(r);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = r * 2 + 2;
    const g = c.getContext('2d');
    g.beginPath();
    g.arc(r + 1, r + 1, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(177, 62, 83, 0.09)';
    g.fill();
    g.strokeStyle = 'rgba(177, 62, 83, 0.45)';
    g.lineWidth = 1;
    g.stroke();
    auraCache.set(r, c);
  }
  return c;
}

export default {
  update: chase.update,
  // Runs after the spatial hash is built each tick.
  post(e, game) {
    const { radius, speedBuff } = e.params;
    const buf = game.scratch2;
    const n = game.hash.query(e.x, e.y, radius, buf);
    const r2 = radius * radius;
    for (let k = 0; k < n; k++) {
      const o = game.enemies.items[buf[k]];
      if (o === e || o.dead) continue;
      const dx = o.x - e.x;
      const dy = o.y - e.y;
      if (dx * dx + dy * dy < r2 && o.buff < speedBuff) o.buff = speedBuff;
    }
  },
  drawUnder(e, game, ctx) {
    const img = auraImage(e.params.radius);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.animT * 4);
    ctx.drawImage(img, Math.round(e.x - img.width / 2), Math.round(e.y + e.foot - img.height / 2));
    ctx.globalAlpha = 1;
  },
};
