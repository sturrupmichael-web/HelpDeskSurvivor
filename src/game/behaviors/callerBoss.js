// The Angry Caller (Call Center boss at 10:00): a huge customer on a headset who keeps
// their distance and shouts. Attacks, never the same one twice in a row:
//   hold        "Please hold": a ring of desk phones around you goes off, with a gap
//               (`gap` phones missing) to escape through; a phone under you too.
//               Enraged: a second, wider ring with the gap in the same place.
//   scream      "I want your manager!": a red cone first, then a shout that hurts and
//               shoves you back
//   conference  dials everyone in: a ring of Reply-All Randys closing in on you
// Second phase (ESCALATED, at `phase2.at` HP): the gaps between attacks shrink, "please
// hold" fires two rings, and it learns
//   transfer    a red circle marks a spot just behind you; then it transfers itself
//               there and lands with a shout that hurts and shoves you out

import { spawnEnemy } from '../enemies.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';
import { belowPhase2, enterPhase2 } from './phase2.js';

const WALK = 0;
const SCREAM_TELL = 1;
const POSE = 2;
const TRANSFER_TELL = 3;
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

// Transfer: it lands on the marked spot (e.ai.tx, ty).
function transfer(e, game, t) {
  const pl = game.player;
  game.fx.burst(e.x, e.y + MOUTH_Y, e.def.particle, 14);
  e.x = e.ai.tx;
  e.y = e.ai.ty;
  const dx = pl.x - e.x;
  const dy = pl.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d < t.radius + pl.r) {
    if (hurtPlayer(game, t.damage)) game.onPlayerHurt();
    pl.kx += (dx / d) * t.push;
    pl.ky += (dy / d) * t.push;
  }
  game.fx.ring(e.x, e.y, t.radius, '#b13e53', 0.4);
  game.fx.ring(e.x, e.y, t.radius * 0.6, '#73eff7', 0.3, true);
  game.camera.shake(5);
  sfx('scream', e.x);
}

function startAttack(e, game) {
  const p = e.params;
  const list = e.ai.phase2 ? p.phase2.attacks : p.attacks;
  let i = (Math.random() * list.length) | 0;
  if (list[i] === e.ai.lastAttack) i = (i + 1) % list.length; // no repeats
  e.ai.lastAttack = list[i];
  e.anim = 'attack';
  aim(e, game);
  if (e.ai.lastAttack === 'transfer') {
    // The spot just behind you, as seen from the caller.
    const t = p.phase2.transfer;
    const pl = game.player;
    e.ai.tx = pl.x + e.ai.aimX * t.behind;
    e.ai.ty = pl.y + e.ai.aimY * t.behind;
    e.ai.state = TRANSFER_TELL;
    e.ai.stateT = t.telegraph;
    e.pose = PHONE;
    sfx('ring');
  } else if (e.ai.lastAttack === 'scream') {
    e.ai.state = SCREAM_TELL;
    e.ai.stateT = p.scream.telegraph;
    sfx('warn', e.x);
    e.pose = SCREAM;
  } else {
    e.ai.state = POSE;
    e.ai.stateT = POSE_TIME;
    e.pose = PHONE;
    if (e.ai.lastAttack === 'hold') hold(e, game, p.hold, e.ai.phase2);
    else conference(e, game, p.conference);
  }
}

// Transfer telegraph: a red circle on the landing spot that fills up.
function drawTransfer(e, game, ctx) {
  const t = e.params.phase2.transfer;
  const k = 1 - e.ai.stateT / t.telegraph;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#b13e53';
  ctx.beginPath();
  ctx.arc(e.ai.tx, e.ai.ty, t.radius * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = (game.time * 10) & 1 ? 0.9 : 0.5;
  ctx.strokeStyle = '#b13e53';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.ai.tx, e.ai.ty, t.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
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
      phase2: false, // escalated (behaviors/phase2.js)
      tx: 0, // where the transfer lands
      ty: 0,
    };
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    if (!e.ai.phase2 && belowPhase2(e, game)) enterPhase2(e, game);
    const enraged = e.ai.phase2;
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
      else if (e.ai.state === TRANSFER_TELL) transfer(e, game, p.phase2.transfer);
      e.ai.state = WALK;
      e.ai.attackIn = p.attackGap[enraged ? 1 : 0];
      if (Math.random() < 0.3) e.ai.strafe = -e.ai.strafe;
    }
  },

  drawUnder(e, game, ctx) {
    if (e.ai.state === TRANSFER_TELL) return drawTransfer(e, game, ctx);
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
