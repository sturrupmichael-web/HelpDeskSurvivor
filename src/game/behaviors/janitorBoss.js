// The Night Janitor (Parking Garage boss at 10:00): rides a floor buffer, leaves a wet
// trail, and you slide on wet floor (see Zones / updatePlayer). Attacks, never the same
// one twice in a row:
//   mop     swings the mop: a fan of wet patches toward you
//   charge  points the buffer at you (red lane on the floor), then charges down it
//   lights  kills the lights: the flashlight shrinks for a few seconds (dark maps only;
//           elsewhere he charges instead)
// Below `enrageAt` HP the gaps between attacks shrink.

import { stepToward } from './chase.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';

const WALK = 0;
const CHARGE_TELL = 1;
const CHARGING = 2;
const POSE = 3;
const POSE_TIME = 0.6;
const MOP = 0; // attack-animation frames (sprites/defs/bosses.js)
const LEAN = 1;

function aim(e, game) {
  const pl = game.player;
  const dx = pl.x - e.x;
  const dy = pl.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.ai.aimX = dx / d;
  e.ai.aimY = dy / d;
  e.flip = dx < 0;
}

function mop(e, game, m, wet) {
  const base = Math.atan2(e.ai.aimY, e.ai.aimX);
  for (let i = 0; i < m.count; i++) {
    const a = base + (i / (m.count - 1) - 0.5) * m.spread;
    const r = m.reach * (0.45 + 0.55 * ((i * 7) % m.count) / m.count);
    game.zones.add(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, wet);
  }
  game.fx.burst(e.x + e.ai.aimX * 30, e.y + e.ai.aimY * 30, ['#41a6f6', '#f4f4f4'], 12);
  sfx('slosh', e.x);
}

function startAttack(e, game) {
  const p = e.params;
  const list = game.map.twist?.type === 'dark' ? p.attacks : p.attacks.filter((a) => a !== 'lights');
  let i = (Math.random() * list.length) | 0;
  if (list[i] === e.ai.lastAttack) i = (i + 1) % list.length; // no repeats
  e.ai.lastAttack = list[i];
  e.anim = 'attack';
  aim(e, game);
  if (e.ai.lastAttack === 'charge') {
    e.ai.state = CHARGE_TELL;
    e.ai.stateT = p.charge.telegraph;
    sfx('warn', e.x);
    e.pose = LEAN;
  } else {
    e.ai.state = POSE;
    e.ai.stateT = POSE_TIME;
    e.pose = MOP;
    if (e.ai.lastAttack === 'mop') mop(e, game, p.mop, p.wet);
    else {
      game.twist.dim(p.lights.time, p.lights.scale);
      game.hud.banner('LIGHTS OUT', 'The janitor found the breaker panel.', 1.5);
      sfx('alarm');
    }
  }
}

function endAttack(e, enraged) {
  e.ai.state = WALK;
  e.anim = 'walk';
  e.pose = -1;
  e.ai.attackIn = e.params.attackGap[enraged ? 1 : 0];
}

export default {
  init(e) {
    // This boss's own state (pool objects are reused, so it's made fresh each fight).
    e.ai = {
      state: WALK,
      stateT: 0, // seconds left in the current state
      attackIn: 2.5, // seconds until the next attack
      trailIn: 0, // seconds until the next wet patch behind the buffer
      lastAttack: '', // never the same attack twice in a row
      aimX: 1, // unit vector of the current attack
      aimY: 0,
      chargeHit: false, // has this charge hit you yet?
    };
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    const enraged = e.hp < e.maxHp * p.enrageAt;
    // The buffer leaves a wet trail wherever it goes.
    if ((e.ai.trailIn -= dt) <= 0) {
      e.ai.trailIn = e.ai.state === CHARGING ? p.trailEvery / 3 : p.trailEvery;
      game.zones.add(e.x, e.y + e.foot - 6, p.wet);
    }
    switch (e.ai.state) {
      case WALK:
        stepToward(e, pl.x, pl.y, e.speed * e.slow * e.buff, dt);
        e.animT += dt;
        if ((e.ai.attackIn -= dt) <= 0) startAttack(e, game);
        break;
      case CHARGE_TELL:
        if ((e.ai.stateT -= dt) <= 0) {
          e.ai.state = CHARGING;
          e.ai.stateT = p.charge.time;
          e.ai.lastAttack = 'charge';
          e.ai.chargeHit = false;
          e.pose = -1;
          sfx('charge', e.x);
        }
        break;
      case CHARGING: {
        e.x += e.ai.aimX * p.charge.speed * dt;
        e.y += e.ai.aimY * p.charge.speed * dt;
        e.animT += dt * 3;
        const rr = e.r + pl.r + 4;
        if (!e.ai.chargeHit && (pl.x - e.x) ** 2 + (pl.y - e.y) ** 2 < rr * rr) {
          e.ai.chargeHit = true;
          if (hurtPlayer(game, p.charge.damage)) game.onPlayerHurt();
          pl.kx += e.ai.aimX * 220;
          pl.ky += e.ai.aimY * 220;
          game.camera.shake(5);
        }
        if ((e.ai.stateT -= dt) <= 0) {
          game.camera.shake(3);
          endAttack(e, enraged);
        }
        break;
      }
      case POSE:
        if ((e.ai.stateT -= dt) <= 0) endAttack(e, enraged);
        break;
    }
  },

  drawUnder(e, game, ctx) {
    if (e.ai.state !== CHARGE_TELL) return;
    const c = e.params.charge;
    const len = c.speed * c.time;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(e.ai.aimY, e.ai.aimX));
    ctx.globalAlpha = 0.22 + 0.25 * (1 - e.ai.stateT / c.telegraph);
    ctx.fillStyle = '#b13e53';
    ctx.fillRect(0, -e.r, len, e.r * 2);
    ctx.globalAlpha = (game.time * 10) & 1 ? 0.9 : 0.5;
    ctx.strokeStyle = '#b13e53';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -e.r, len, e.r * 2);
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
