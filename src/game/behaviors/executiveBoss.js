// The Executive (20:00 final boss). Walks at you between attacks; every attack is
// telegraphed on the floor first:
//   charge  points at you (red lane on the floor), then sprints down that lane
//   cone    a wedge of slide decks thrown at you (more volleys in later phases)
//   bombs   "urgent meeting" circles drop on and around you, then go off
//   summon  calls in VIPs
// Phases start at the HP fractions in params.phases; each phase is faster, has a
// shorter gap between attacks, and opens with a banner and a VIP summon.

import { stepToward } from './chase.js';
import { spawnEnemy } from '../enemies.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';

const WALK = 0;
const CHARGE_TELL = 1;
const CHARGING = 2;
const CONE_TELL = 3;
const CONE = 4;
const POSE = 5; // bombs / summon: holds the phone up for a moment

const HAND_Y = -10; // where thrown things come from, relative to the collision center
const VOLLEY_GAP = 0.35;
const POSE_TIME = 0.6;
const POINT = 0; // attack-animation frames (sprites/defs/bosses.js)
const PHONE = 1;

function aimAtPlayer(e, game) {
  const pl = game.player;
  const dx = pl.x - e.x;
  const dy = pl.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.ax = dx / d;
  e.ay = dy / d;
  e.flip = dx < 0;
}

function throwCone(e, game, c) {
  const base = Math.atan2(e.ay, e.ax);
  for (let i = 0; i < c.bullets; i++) {
    const a = base + (c.bullets > 1 ? (i / (c.bullets - 1) - 0.5) * c.spread : 0);
    game.hazards.bullet(e.x, e.y + HAND_Y, a, c.speed, c.damage, 'hazard_slide');
  }
  sfx('whoosh');
}

function summon(e, game, s) {
  const hp = game.spawner.sample(game.time, 'hpMult');
  for (let i = 0; i < s.count; i++) {
    const a = Math.random() * Math.PI * 2;
    spawnEnemy(game, s.id, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, hp);
  }
  game.fx.burst(e.x, e.y + HAND_Y, e.def.particle, 12);
}

function startAttack(e, game) {
  const p = e.params;
  const list = p.attacks[e.phase];
  let i = (Math.random() * list.length) | 0;
  if (list.length > 1 && list[i] === e.n) i = (i + 1) % list.length; // no repeats
  const name = list[i];
  e.n = name;
  e.anim = 'attack';
  aimAtPlayer(e, game);
  if (name === 'charge') {
    e.state = CHARGE_TELL;
    e.stateT = p.charge.telegraph;
    e.pose = POINT;
  } else if (name === 'cone') {
    e.state = CONE_TELL;
    e.stateT = p.cone.telegraph;
    e.pose = POINT;
  } else {
    e.state = POSE;
    e.stateT = POSE_TIME;
    e.pose = PHONE;
    if (name === 'bombs') {
      const b = p.bombs;
      const pl = game.player;
      for (let k = 0; k < b.count; k++) {
        const r = k === 0 ? 0 : b.scatter * (0.4 + Math.random() * 0.6);
        const a = Math.random() * Math.PI * 2;
        game.hazards.bomb(pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r, b.radius, b.delay + k * 0.08, b.damage);
      }
      sfx('alarm');
    } else summon(e, game, p.summon);
  }
}

function endAttack(e) {
  e.state = WALK;
  e.anim = 'walk';
  e.pose = -1;
  e.t0 = e.params.attackGap[e.phase];
}

export default {
  init(e) {
    e.t0 = 2;
    e.n = '';
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;

    // Phase changes.
    const frac = e.hp / e.maxHp;
    let phase = 0;
    while (phase < p.phases.length && frac < p.phases[phase]) phase++;
    if (phase > e.phase) {
      e.phase = phase;
      const b = p.phaseBanners[phase];
      if (b) game.hud.banner(b[0], b[1], 3);
      game.camera.shake(6);
      game.fx.ring(e.x, e.y, 80, '#b13e53', 0.6);
      summon(e, game, p.summon);
      sfx('siren');
    }

    switch (e.state) {
      case WALK:
        stepToward(e, pl.x, pl.y, e.speed * (1 + 0.25 * e.phase) * e.slow * e.buff, dt);
        if ((e.t0 -= dt) <= 0) startAttack(e, game);
        break;
      case CHARGE_TELL:
        if ((e.stateT -= dt) <= 0) {
          e.state = CHARGING;
          e.stateT = p.charge.time;
          e.t1 = 0; // has the charge hit you yet?
          e.anim = 'walk';
          e.pose = -1;
          sfx('whoosh');
        }
        break;
      case CHARGING: {
        e.x += e.ax * p.charge.speed * dt;
        e.y += e.ay * p.charge.speed * dt;
        e.animT += dt * 2; // legs pump faster
        const rr = e.r + pl.r + 4;
        if (!e.t1 && (pl.x - e.x) ** 2 + (pl.y - e.y) ** 2 < rr * rr) {
          e.t1 = 1;
          if (hurtPlayer(game, p.charge.damage)) game.onPlayerHurt();
          game.camera.shake(5);
        }
        if ((e.stateT -= dt) <= 0) {
          game.camera.shake(3);
          game.fx.burst(e.x, e.y + 20, ['#566c86', '#94b0c2'], 10);
          endAttack(e);
        }
        break;
      }
      case CONE_TELL:
        if ((e.stateT -= dt) <= 0) {
          e.state = CONE;
          e.t1 = p.cone.volleys[e.phase];
          e.stateT = 0;
        }
        break;
      case CONE:
        if ((e.stateT -= dt) <= 0) {
          if (e.t1-- <= 0) endAttack(e);
          else {
            aimAtPlayer(e, game);
            throwCone(e, game, p.cone);
            e.stateT = VOLLEY_GAP;
          }
        }
        break;
      case POSE:
        if ((e.stateT -= dt) <= 0) endAttack(e);
        break;
    }
  },

  // Floor telegraphs for the charge lane and the slide-deck cone.
  drawUnder(e, game, ctx) {
    const p = e.params;
    const blink = (game.time * 10) & 1;
    if (e.state === CHARGE_TELL) {
      const len = p.charge.speed * p.charge.time;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.atan2(e.ay, e.ax));
      ctx.globalAlpha = 0.22 + 0.25 * (1 - e.stateT / p.charge.telegraph);
      ctx.fillStyle = '#b13e53';
      ctx.fillRect(0, -e.r, len, e.r * 2);
      ctx.globalAlpha = blink ? 0.9 : 0.5;
      ctx.strokeStyle = '#b13e53';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -e.r, len, e.r * 2);
      ctx.restore();
    } else if (e.state === CONE_TELL) {
      const a = Math.atan2(e.ay, e.ax);
      const y = e.y + HAND_Y;
      ctx.globalAlpha = 0.2 + 0.25 * (1 - e.stateT / p.cone.telegraph);
      ctx.fillStyle = '#b13e53';
      ctx.beginPath();
      ctx.moveTo(e.x, y);
      ctx.arc(e.x, y, 170, a - p.cone.spread / 2, a + p.cone.spread / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = blink ? 0.9 : 0.5;
      ctx.strokeStyle = '#b13e53';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
