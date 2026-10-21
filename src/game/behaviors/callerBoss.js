// The Angry Caller (Call Center boss at 10:00): a huge customer on a headset who keeps
// their distance and shouts. Attacks, never the same one twice in a row:
//   hold        "Please hold": a ring of desk phones around you goes off, with a gap
//               (`gap` phones missing) to escape through; a phone under you too.
//               Enraged: a second, wider ring with the gap in the same place.
//   scream      "I want your manager!": a red cone first, then a shout that hurts and
//               shoves you back
//   conference  dials everyone in: a ring of Reply-All Randys closing in on you
// Below `enrageAt` HP the gaps between attacks shrink.

import { spawnEnemy } from '../enemies.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';

const WALK = 0;
const SCREAM_TELL = 1;
const POSE = 2;
const POSE_TIME = 0.7;
const MOUTH_Y = -20;
const SCREAM = 0; // attack-animation frames (sprites/defs/bosses.js)
const PHONE = 1;

function hold(e, game, h, enraged) {
  const pl = game.player;
  const gapAt = Math.random() * Math.PI * 2;
  const step = (Math.PI * 2) / h.count;
  const rings = enraged ? 2 : 1;
  for (let r = 0; r < rings; r++) {
    const rad = h.radius * (1 + r * 0.8);
    const count = Math.round(h.count * (1 + r * 0.8));
    const st = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const a = gapAt + st * (i + 0.5);
      let rel = a - gapAt;
      rel -= Math.round(rel / (Math.PI * 2)) * Math.PI * 2;
      if (Math.abs(rel) < (h.gap * step) / 2 + 0.01) continue; // the way out
      game.hazards.bomb(pl.x + Math.cos(a) * rad, pl.y + Math.sin(a) * rad, h.bombRadius, h.delay + r * h.ringGap, h.damage);
    }
  }
  game.hazards.bomb(pl.x, pl.y, h.bombRadius, h.delay, h.damage);
  sfx('ring');
}

function conference(e, game, c) {
  const pl = game.player;
  const hp = game.spawner.sample(game.time, 'hpMult');
  const a0 = Math.random() * Math.PI * 2;
  for (let i = 0; i < c.count; i++) {
    const a = a0 + (i / c.count) * Math.PI * 2;
    spawnEnemy(game, c.id, pl.x + Math.cos(a) * c.radius, pl.y + Math.sin(a) * c.radius, hp);
  }
  game.fx.burst(e.x, e.y + MOUTH_Y, ['#73eff7', '#f4f4f4'], 12);
  sfx('ring');
}

function aim(e, game) {
  const pl = game.player;
  const dx = pl.x - e.x;
  const dy = pl.y - (e.y + MOUTH_Y);
  const d = Math.hypot(dx, dy) || 1;
  e.ai.aimX = dx / d;
  e.ai.aimY = dy / d;
  e.flip = dx < 0;
}

function scream(e, game, s) {
  const pl = game.player;
  const dx = pl.x - e.x;
  const dy = pl.y - (e.y + MOUTH_Y);
  const d = Math.hypot(dx, dy) || 1;
  const off = Math.acos(Math.max(-1, Math.min(1, (dx * e.ai.aimX + dy * e.ai.aimY) / d)));
  if (d < s.range && off < s.spread / 2) {
    if (hurtPlayer(game, s.damage)) game.onPlayerHurt();
    pl.kx += (dx / d) * s.push;
    pl.ky += (dy / d) * s.push;
  }
  game.fx.ring(e.x, e.y + MOUTH_Y, 60, '#b13e53', 0.4);
  game.camera.shake(5);
  sfx('scream', e.x);
}

function startAttack(e, game) {
  const p = e.params;
  let i = (Math.random() * p.attacks.length) | 0;
  if (p.attacks[i] === e.ai.lastAttack) i = (i + 1) % p.attacks.length; // no repeats
  e.ai.lastAttack = p.attacks[i];
  e.anim = 'attack';
  aim(e, game);
  if (e.ai.lastAttack === 'scream') {
    e.ai.state = SCREAM_TELL;
    e.ai.stateT = p.scream.telegraph;
    sfx('warn', e.x);
    e.pose = SCREAM;
  } else {
    e.ai.state = POSE;
    e.ai.stateT = POSE_TIME;
    e.pose = PHONE;
    if (e.ai.lastAttack === 'hold') hold(e, game, p.hold, e.hp < e.maxHp * p.enrageAt);
    else conference(e, game, p.conference);
  }
}

export default {
  init(e) {
    // This boss's own state (pool objects are reused, so it's made fresh each fight).
    e.ai = {
      state: WALK,
      stateT: 0, // seconds left in the current state
      attackIn: 2.5, // seconds until the next attack
      lastAttack: '', // never the same attack twice in a row
      strafe: Math.random() < 0.5 ? 1 : -1, // which way it circles you
      aimX: 1, // unit vector of the scream
      aimY: 0,
    };
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    const enraged = e.hp < e.maxHp * p.enrageAt;
    if (e.ai.state === WALK) {
      e.anim = 'walk';
      e.pose = -1;
      // Keep a shouting distance: close in, back off, or circle around you.
      const dx = pl.x - e.x;
      const dy = pl.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const [near, far] = p.keepAway;
      const sp = e.speed * e.slow * e.buff * dt;
      if (d > far) {
        e.x += (dx / d) * sp;
        e.y += (dy / d) * sp;
      } else if (d < near) {
        e.x -= (dx / d) * sp;
        e.y -= (dy / d) * sp;
      } else {
        e.x += (-dy / d) * sp * e.ai.strafe;
        e.y += (dx / d) * sp * e.ai.strafe;
      }
      e.flip = dx < 0;
      if ((e.ai.attackIn -= dt) <= 0) startAttack(e, game);
    } else if ((e.ai.stateT -= dt) <= 0) {
      if (e.ai.state === SCREAM_TELL) scream(e, game, p.scream);
      e.ai.state = WALK;
      e.ai.attackIn = p.attackGap[enraged ? 1 : 0];
      if (Math.random() < 0.3) e.ai.strafe = -e.ai.strafe;
    }
  },

  drawUnder(e, game, ctx) {
    if (e.ai.state !== SCREAM_TELL) return;
    const s = e.params.scream;
    const a = Math.atan2(e.ai.aimY, e.ai.aimX);
    const x = e.x;
    const y = e.y + MOUTH_Y;
    const blink = (game.time * 10) & 1;
    ctx.globalAlpha = 0.2 + 0.25 * (1 - e.ai.stateT / s.telegraph);
    ctx.fillStyle = '#b13e53';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, s.range, a - s.spread / 2, a + s.spread / 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = blink ? 0.9 : 0.5;
    ctx.strokeStyle = '#b13e53';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
