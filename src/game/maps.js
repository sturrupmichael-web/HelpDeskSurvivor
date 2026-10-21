// Map twists (data/maps.js `twist`): the one special rule each unlockable map adds.
// update() runs every tick after the floor hazards; drawOverlay() runs in screen space
// after the world is drawn.

import { sfx } from '../engine/audio.js';
import { spawnEnemy } from './enemies.js';

export class MapTwist {
  constructor() {
    this.t = 0;
    this.hot = false; // player is standing in a hot aisle (HUD shows it)
    this.dimT = 0; // Night Janitor "lights out": seconds left
    this.dimScale = 1;
    this.phase = 0; // Merger Day: integration phases announced so far
  }

  reset() {
    this.t = 0;
    this.hot = false;
    this.dimT = 0;
    this.phase = 0;
  }

  // Merger Day: users who spawn on the parent company's floor are tougher...
  hpMult(game, x, y) {
    const tw = game.map.twist;
    return tw?.type === 'integration' && game.floor.isAcquired(x, y) ? tw.hpMult : 1;
  }

  // ...and their tickets count double in both ticketing systems.
  xpMult(game, x, y) {
    const tw = game.map.twist;
    return tw?.type === 'integration' && game.floor.isAcquired(x, y) ? tw.xpMult : 1;
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
    } else if (tw.type === 'integration') this.integration(game, tw, dt);
  }

  // The parent company's floor grows every `every` seconds; moving boxes keep turning up.
  integration(game, tw, dt) {
    const phase = Math.floor(game.time / tw.every);
    game.floor.setOwned(Math.min(tw.max, tw.start + phase * tw.step));
    if (phase > this.phase) {
      this.phase = phase;
      if (phase % 3 === 0 && game.time < 1190 && game.victoryT <= 0) {
        const pct = Math.round(Math.min(tw.max, tw.start + phase * tw.step) * 100);
        game.hud.banner('REBRANDED', `Integration phase ${phase / 3} done. The parent company owns ${pct}% of the floor.`, 3);
      }
    }
    if (game.spawner.stopped || (this.t += dt) < tw.boxEvery) return;
    this.t = 0;
    let boxes = 0;
    const pool = game.enemies;
    for (let i = 0; i < pool.count; i++) if (pool.items[i].def.anchored && !pool.items[i].dead) boxes++;
    if (boxes >= tw.boxMax) return;
    const p = game.player;
    const a = Math.random() * Math.PI * 2;
    const d = 140 + Math.random() * 90;
    spawnEnemy(game, 'moving_box', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, game.spawner.sample(game.time, 'hpMult'));
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
