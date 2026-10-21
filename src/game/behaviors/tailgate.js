// Badge Brenda: chases you, and while she is within `radius` of you, you move at x`slow`
// (she's right behind you at every door). Her badge reader circle shows when it's on you.
// params: radius (px), slow (multiplier)

import chase from './chase.js';

export default {
  update: chase.update,
  post(e, game) {
    const p = game.player;
    const { radius, slow } = e.params;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    e.n = dx * dx + dy * dy < radius * radius ? 1 : 0;
    if (e.n && slow < p.tailgate) p.tailgate = slow;
  },
  drawUnder(e, game, ctx) {
    if (!e.n) return;
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.animT * 8);
    ctx.strokeStyle = '#b13e53';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(e.x, e.y + e.foot, e.params.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },
};
