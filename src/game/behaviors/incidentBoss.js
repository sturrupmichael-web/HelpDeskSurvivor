// Major Incident (10:00 boss): a speakerphone on a cart, dragging the whole bridge call
// toward you. Every `ringEvery` s it telegraphs, then fires a ring of ringing phones
// outward with one gap (shown in green during the telegraph: stand there). Below
// `enrageAt` HP it fires a second, offset ring through the same gap and rings faster.
// Every `minionEvery` s it releases `minionCount` Status Update Requests.

import { stepToward } from './chase.js';
import { spawnEnemy } from '../enemies.js';
import { sfx } from '../../engine/audio.js';

const WALK = 0;
const RINGING = 1;
const DOUBLE_GAP = 0.45; // seconds between the two rings when enraged
const MOUTH_Y = -14; // phones come out of the speaker, above the collision center

function fireRing(e, game, p, offset) {
  const step = (Math.PI * 2) / p.ringBullets;
  const half = (p.ringGap * step) / 2;
  for (let i = 0; i < p.ringBullets; i++) {
    const a = e.ax + half + step * (i + 0.5 + offset);
    let rel = a - e.ax;
    rel -= Math.round(rel / (Math.PI * 2)) * Math.PI * 2;
    if (Math.abs(rel) < half) continue; // the way out
    game.hazards.bullet(e.x, e.y + MOUTH_Y, a, p.bulletSpeed, p.bulletDamage, 'hazard_phone', 6);
  }
  game.fx.ring(e.x, e.y + MOUTH_Y, 40, '#ffcd75', 0.35);
  game.camera.shake(2);
}

export default {
  init(e) {
    e.t0 = 2.5; // until the first ring
    e.t1 = 1.5; // until the first minions
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    const enraged = e.hp < e.maxHp * p.enrageAt;
    if (e.state === WALK) {
      e.anim = 'walk';
      stepToward(e, pl.x, pl.y, e.speed * e.slow * e.buff, dt);
      if ((e.t0 -= dt) <= 0) {
        e.state = RINGING;
        e.stateT = p.ringTelegraph;
        e.ax = Math.random() * Math.PI * 2; // gap direction
        e.n = enraged ? 2 : 1;
        e.anim = 'attack';
        sfx('ring');
      }
    } else {
      e.flip = pl.x < e.x;
      if ((e.stateT -= dt) <= 0) {
        fireRing(e, game, p, e.n === 1 ? 0 : 0.5);
        if (--e.n > 0) e.stateT = DOUBLE_GAP;
        else {
          e.state = WALK;
          e.t0 = p.ringEvery * (enraged ? 0.75 : 1);
        }
      }
    }
    if ((e.t1 -= dt) <= 0) {
      e.t1 = p.minionEvery;
      const hp = game.spawner.sample(game.time, 'hpMult');
      for (let i = 0; i < p.minionCount; i++) {
        const a = (i / p.minionCount) * Math.PI * 2;
        spawnEnemy(game, p.minion, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, hp);
      }
      game.fx.burst(e.x, e.y + MOUTH_Y, ['#ffcd75', '#f4f4f4'], 8);
    }
  },

  // Telegraph: a red ring around the boss with the safe lane in green.
  drawUnder(e, game, ctx) {
    if (e.state !== RINGING) return;
    const p = e.params;
    const half = (p.ringGap * Math.PI) / p.ringBullets;
    const x = e.x;
    const y = e.y + MOUTH_Y;
    const pulse = (game.time * 10) & 1;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#38b764';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 160, e.ax - half, e.ax + half);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = pulse ? 0.9 : 0.6;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b13e53';
    ctx.beginPath();
    ctx.arc(x, y, 44, e.ax + half, e.ax - half + Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#38b764';
    ctx.beginPath();
    ctx.arc(x, y, 44, e.ax - half, e.ax + half);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
