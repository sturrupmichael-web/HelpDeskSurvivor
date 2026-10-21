// Map twists (data/maps.js `twist`): the one special rule each unlockable map adds.
// Each twist type is an entry in TWISTS, with any of these hooks:
//   update(twist, game, tw, dt)          every tick, after the floor hazards
//   drawOverlay(twist, game, ctx, px, py) in screen space after the world; return true if
//                                          it drew (the dark map then redraws telegraphs)
//   hpMult(game, tw, x, y) / xpMult(...)  multipliers for users spawning / closed at (x, y)
// `twist` is the shared MapTwist (its fields are per-shift state), `tw` the map's data.
// A new twist type is a new entry here plus its numbers in data/maps.js.

import { sfx } from '../engine/audio.js';
import { spawnEnemy } from './enemies.js';

export const TWISTS = {
  // Server Room: red hot aisles drain sanity but speed you up.
  hotAisles: {
    update(twist, game, tw, dt) {
      const p = game.player;
      twist.hot = game.floor.isHot(p.x, p.y);
      if (twist.hot) {
        p.slow *= 1 + tw.speed;
        if (!p.god && p.invuln <= 0 && game.victoryT <= 0) p.hp -= tw.drain * dt;
      }
    },
  },

  // Call Center: a desk phone somewhere near you starts ringing; it goes off after the delay.
  phones: {
    update(twist, game, tw, dt) {
      if ((twist.t += dt) < tw.every || game.victoryT > 0) return;
      twist.t = 0;
      const p = game.player;
      const a = Math.random() * Math.PI * 2;
      const d = 30 + Math.random() * 110;
      const dmg = tw.damage + tw.damagePerMin * (game.time / 60);
      game.hazards.bomb(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, tw.radius, tw.delay, dmg);
      sfx('ring');
    },
  },

  // Merger Day: the parent company's floor grows every `every` seconds; moving boxes keep
  // turning up. Users who spawn on its floor are tougher, and their tickets count double.
  integration: {
    update(twist, game, tw, dt) {
      const phase = Math.floor(game.time / tw.every);
      game.floor.setOwned(Math.min(tw.max, tw.start + phase * tw.step));
      if (phase > twist.phase) {
        twist.phase = phase;
        if (phase % 3 === 0 && game.time < 1190 && game.victoryT <= 0) {
          const pct = Math.round(Math.min(tw.max, tw.start + phase * tw.step) * 100);
          game.hud.banner('REBRANDED', `Integration phase ${phase / 3} done. The parent company owns ${pct}% of the floor.`, 3);
        }
      }
      if (game.spawner.stopped || (twist.t += dt) < tw.boxEvery) return;
      twist.t = 0;
      let boxes = 0;
      const pool = game.enemies;
      for (let i = 0; i < pool.count; i++) if (pool.items[i].def.anchored && !pool.items[i].dead) boxes++;
      if (boxes >= tw.boxMax) return;
      const p = game.player;
      const a = Math.random() * Math.PI * 2;
      const d = 140 + Math.random() * 90;
      spawnEnemy(game, 'moving_box', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, game.spawner.sample(game.time, 'hpMult'));
    },
    hpMult: (game, tw, x, y) => (game.floor.isAcquired(x, y) ? tw.hpMult : 1),
    xpMult: (game, tw, x, y) => (game.floor.isAcquired(x, y) ? tw.xpMult : 1),
  },

  // Night Shift darkness: everything outside a flickering flashlight circle fades to black.
  dark: {
    drawOverlay(twist, game, ctx, px, py) {
      const tw = game.map.twist;
      const wobble = game.fx.calm ? 1 : 1 - tw.flicker * (Math.sin(performance.now() / 70) * 0.5 + 0.5) * (Math.random() < 0.03 ? 3 : 1);
      // Lights out: ease down to dimScale, then back up over the last second.
      const dim = twist.dimT > 0 ? 1 - (1 - twist.dimScale) * Math.min(1, twist.dimT) : 1;
      const r = tw.radius * wobble * dim;
      const g = ctx.createRadialGradient(px, py, r * 0.35, px, py, r);
      g.addColorStop(0, 'rgba(8, 9, 16, 0)');
      g.addColorStop(0.7, 'rgba(8, 9, 16, 0.75)');
      g.addColorStop(1, 'rgba(8, 9, 16, 0.96)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
      return true;
    },
  },
};

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

  // Toughness multiplier for a user spawning at (x, y) on the current map.
  hpMult(game, x, y) {
    const tw = game.map.twist;
    return tw && TWISTS[tw.type].hpMult ? TWISTS[tw.type].hpMult(game, tw, x, y) : 1;
  }

  // Ticket multiplier for a user closed at (x, y).
  xpMult(game, x, y) {
    const tw = game.map.twist;
    return tw && TWISTS[tw.type].xpMult ? TWISTS[tw.type].xpMult(game, tw, x, y) : 1;
  }

  // Shrinks the flashlight to `scale` for `time` seconds (dark maps only).
  dim(time, scale) {
    this.dimT = time;
    this.dimScale = scale;
  }

  update(game, dt) {
    if (this.dimT > 0) this.dimT -= dt;
    const tw = game.map.twist;
    if (tw) TWISTS[tw.type].update?.(this, game, tw, dt);
  }

  // Returns true when it drew something.
  drawOverlay(game, ctx, px, py) {
    const tw = game.map.twist;
    return !!tw && !!TWISTS[tw.type].drawOverlay?.(this, game, ctx, px, py);
  }
}
