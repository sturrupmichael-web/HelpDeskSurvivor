// Map twists (data/maps.js `twist`): the one special rule each unlockable map adds.
// update() runs every tick after the floor hazards; drawOverlay() runs in screen space
// after the world is drawn.

import { sfx } from '../engine/audio.js';

export class MapTwist {
  constructor() {
    this.t = 0;
    this.hot = false; // player is standing in a hot aisle (HUD shows it)
    this.dimT = 0; // Night Janitor "lights out": seconds left
    this.dimScale = 1;
  }

  reset() {
    this.t = 0;
    this.hot = false;
    this.dimT = 0;
  }

  // Shrinks the flashlight to `scale` for `time` seconds (dark maps only).
  dim(time, scale) {
    this.dimT = time;
    this.dimScale = scale;
  }

  update(game, dt) {
    const tw = game.map.twist;
    if (this.dimT > 0) this.dimT -= dt;
    if (!tw) return;
    const p = game.player;
    if (tw.type === 'hotAisles') {
      this.hot = game.floor.isHot(p.x, p.y);
      if (this.hot) {
        p.slow *= 1 + tw.speed;
        if (!p.god && p.invuln <= 0 && game.victoryT <= 0) p.hp -= tw.drain * dt;
      }
    } else if (tw.type === 'phones') {
      if ((this.t += dt) < tw.every || game.victoryT > 0) return;
      this.t = 0;
      // A desk phone somewhere near you starts ringing; it goes off after the delay.
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 110;
      const dmg = tw.damage + tw.damagePerMin * (game.time / 60);
      game.hazards.bomb(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, tw.radius, tw.delay, dmg);
      sfx('ring');
    }
  }

  // Night Shift darkness: everything outside a flickering flashlight circle fades to black.
  // Returns true when it drew something.
  drawOverlay(game, ctx, px, py) {
    const tw = game.map.twist;
    if (tw?.type !== 'dark') return false;
    const s = game.view.scale;
    const wobble = 1 - tw.flicker * (Math.sin(performance.now() / 70) * 0.5 + 0.5) * (Math.random() < 0.03 ? 3 : 1);
    // Lights out: ease down to dimScale, then back up over the last second.
    const dim = this.dimT > 0 ? 1 - (1 - this.dimScale) * Math.min(1, this.dimT) : 1;
    const r = tw.radius * s * wobble * dim;
    const g = ctx.createRadialGradient(px, py, r * 0.35, px, py, r);
    g.addColorStop(0, 'rgba(8, 9, 16, 0)');
    g.addColorStop(0.7, 'rgba(8, 9, 16, 0.75)');
    g.addColorStop(1, 'rgba(8, 9, 16, 0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
    return true;
  }
}
