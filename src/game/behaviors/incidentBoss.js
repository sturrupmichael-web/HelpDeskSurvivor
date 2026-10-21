// Major Incident (10:00 boss): a speakerphone on a cart, dragging the whole bridge call
// toward you. Every `ringEvery` s it telegraphs, then fires a ring of ringing phones
// outward with one gap (shown in green during the telegraph: stand there). Every
// `minionEvery` s it releases `minionCount` Status Update Requests.
// Second phase (SEV 0, at `phase2.at` HP): it fires a second, offset ring through the
// same gap, rings faster, and every other attack is a spiral: `arms` streams of phones
// sweeping round it (the arms show on the floor first). Circle with them to dodge.

import { stepToward } from './chase.js';
import { spawnEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';
import { belowPhase2, enterPhase2 } from './phase2.js';

const WALK = 0;
const RINGING = 1;
const SPIRAL_TELL = 2;
const SPIRAL = 3;
const DOUBLE_GAP = 0.45; // seconds between the two rings when enraged
const MOUTH_Y = -14; // phones come out of the speaker, above the collision center

function fireRing(e, game, p, offset) {
  const step = (Math.PI * 2) / p.ringBullets;
  const half = (p.ringGap * step) / 2;
  for (let i = 0; i < p.ringBullets; i++) {
    const a = e.ai.gapAngle + half + step * (i + 0.5 + offset);
    let rel = a - e.ai.gapAngle;
    rel -= Math.round(rel / (Math.PI * 2)) * Math.PI * 2;
    if (Math.abs(rel) < half) continue; // the way out
    game.hazards.bullet(e.x, e.y + MOUTH_Y, a, p.bulletSpeed, p.bulletDamage, 'hazard_phone', 6);
  }
  game.fx.ring(e.x, e.y + MOUTH_Y, 40, '#ffcd75', 0.35);
  game.camera.shake(2);
}

// Spiral telegraph: red strips where the arms start, turning the way they will sweep.
function drawArms(e, game, ctx) {
  const sp = e.params.phase2.spiral;
  const k = 1 - e.ai.stateT / sp.telegraph;
  ctx.save();
  ctx.translate(e.x, e.y + MOUTH_Y);
  for (let i = 0; i < sp.arms; i++) {
    ctx.save();
    ctx.rotate(e.ai.spiralA + (i / sp.arms) * Math.PI * 2 - sp.turn * 0.4 * (1 - k));
    ctx.globalAlpha = 0.2 + 0.3 * k;
    ctx.fillStyle = '#b13e53';
    ctx.fillRect(0, -5, 170, 10);
    ctx.globalAlpha = (game.time * 10) & 1 ? 0.9 : 0.5;
    ctx.strokeStyle = '#b13e53';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -5, 170, 10);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

export default {
  init(e) {
    // This boss's own state (pool objects are reused, so it's made fresh each fight).
    e.ai = {
      state: WALK,
      stateT: 0, // seconds left in the current state
      ringIn: 2.5, // seconds until the next ring of phones
      minionsIn: 1.5, // seconds until the next Status Update Requests
      gapAngle: 0, // direction of the safe gap in the ring
      ringsLeft: 0, // rings still to fire in this attack (2 in phase 2)
      phase2: false, // SEV 0 (behaviors/phase2.js)
      spiralNext: false, // phase 2 alternates rings and spirals
      spiralA: 0, // current angle of the first spiral arm
      fireIn: 0, // seconds until the next phones of the spiral
    };
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    if (!e.ai.phase2 && belowPhase2(e, game)) enterPhase2(e, game);
    const enraged = e.ai.phase2;
    if (e.ai.state === WALK) {
      e.anim = 'walk';
      stepToward(e, pl.x, pl.y, e.speed * e.slow * e.buff, dt);
      if ((e.ai.ringIn -= dt) <= 0) {
        e.anim = 'attack';
        if (enraged && e.ai.spiralNext) {
          e.ai.state = SPIRAL_TELL;
          e.ai.stateT = p.phase2.spiral.telegraph;
          e.ai.spiralA = Math.atan2(pl.y - e.y, pl.x - e.x) + 0.6; // first arm just misses you
          sfx('warn', e.x);
        } else {
          e.ai.state = RINGING;
          e.ai.stateT = p.ringTelegraph;
          e.ai.gapAngle = Math.random() * Math.PI * 2; // gap direction
          e.ai.ringsLeft = enraged ? 2 : 1;
          sfx('ring');
        }
        e.ai.spiralNext = !e.ai.spiralNext;
      }
    } else if (e.ai.state === RINGING) {
      e.flip = pl.x < e.x;
      if ((e.ai.stateT -= dt) <= 0) {
        fireRing(e, game, p, e.ai.ringsLeft === 1 ? 0 : 0.5);
        if (--e.ai.ringsLeft > 0) e.ai.stateT = DOUBLE_GAP;
        else {
          e.ai.state = WALK;
          e.ai.ringIn = p.ringEvery * (enraged ? 0.75 : 1);
        }
      }
    } else {
      const sp = p.phase2.spiral;
      e.flip = pl.x < e.x;
      if ((e.ai.stateT -= dt) <= 0) {
        if (e.ai.state === SPIRAL_TELL) {
          e.ai.state = SPIRAL;
          e.ai.stateT = sp.time;
          e.ai.fireIn = 0;
          sfx('ring');
        } else {
          e.ai.state = WALK;
          e.ai.ringIn = p.ringEvery * 0.75;
        }
      } else if (e.ai.state === SPIRAL) {
        e.ai.spiralA += sp.turn * dt;
        if ((e.ai.fireIn -= dt) <= 0) {
          e.ai.fireIn = sp.every;
          for (let k = 0; k < sp.arms; k++) {
            const a = e.ai.spiralA + (k / sp.arms) * Math.PI * 2;
            game.hazards.bullet(e.x, e.y + MOUTH_Y, a, sp.speed, sp.damage, 'hazard_phone', 6);
          }
        }
      }
    }
    if ((e.ai.minionsIn -= dt) <= 0) {
      e.ai.minionsIn = p.minionEvery;
      const hp = game.spawner.sample(game.time, 'hpMult');
      for (let i = 0; i < p.minionCount; i++) {
        const a = (i / p.minionCount) * Math.PI * 2;
        spawnEnemy(game, p.minion, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, hp);
      }
      game.fx.burst(e.x, e.y + MOUTH_Y, ['#ffcd75', '#f4f4f4'], 8);
    }
  },

  // Telegraphs: the spiral's arms, or a red ring around the boss with the safe lane in green.
  drawUnder(e, game, ctx) {
    if (e.ai.state === SPIRAL_TELL) return drawArms(e, game, ctx);
    if (e.ai.state !== RINGING) return;
    const p = e.params;
    const half = (p.ringGap * Math.PI) / p.ringBullets;
    const x = e.x;
    const y = e.y + MOUTH_Y;
    const pulse = (game.time * 10) & 1;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#38b764';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 160, e.ai.gapAngle - half, e.ai.gapAngle + half);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = pulse ? 0.9 : 0.6;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b13e53';
    ctx.beginPath();
    ctx.arc(x, y, 44, e.ai.gapAngle + half, e.ai.gapAngle - half + Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#38b764';
    ctx.beginPath();
    ctx.arc(x, y, 44, e.ai.gapAngle - half, e.ai.gapAngle + half);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
