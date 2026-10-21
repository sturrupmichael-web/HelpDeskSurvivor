// The Hostile Takeover (Merger Day boss at 10:00): the new parent company's CEO, touring
// the floor.
//   absorb    any user it touches is acquired: gone (no ticket), and the boss heals
//             `heal` HP and grows a little (up to x`maxScale`), at most `perSec` a second
//   memo      Restructuring: `lanes` long strips light up across your position, then a
//             memo slams down each one
//   allhands  calls in `pairs` pairs of Synergy Consultants around you
//   spin off  at `spinAt` HP it spins off The Subsidiary (a smaller boss that only sends
//             memos); the fight ends when both are down (see Game.addBossPart)
// The Subsidiary uses this behavior too, with `isSmall` and only the memo attack.

import { stepToward } from './chase.js';
import { spawnEnemy } from '../enemies.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';

const WALK = 0;
const MEMO_TELL = 1;
const MEMO = 2;
const POSE = 3;
const MEMO_SHOW = 0.35;
const POSE_TIME = 0.7;
const MEMO_POSE = 0; // attack-animation frames (sprites/defs/bosses.js)
const WIDE_POSE = 1;

// Lanes run horizontally or vertically through the player, with the others to either side.
function startMemo(e, game) {
  const m = e.params.memo;
  const pl = game.player;
  e.ax = Math.random() < 0.5 ? 1 : 0; // 1 = horizontal strips
  e.lines.length = 0;
  const shift = (Math.random() - 0.5) * m.width * 0.6;
  for (let i = 0; i < m.lanes; i++) {
    const off = (i - (m.lanes - 1) / 2) * m.gap + shift;
    e.lines.push(e.ax ? pl.y + off : pl.x + off);
  }
  e.ay = e.ax ? pl.x : pl.y; // middle of the strips along their length
  e.state = MEMO_TELL;
  e.stateT = m.telegraph;
  e.anim = 'attack';
  e.pose = MEMO_POSE;
  sfx('warn', e.x);
}

function memoHits(e, game) {
  const m = e.params.memo;
  const pl = game.player;
  const across = e.ax ? pl.y : pl.x;
  const along = e.ax ? pl.x : pl.y;
  if (Math.abs(along - e.ay) > m.length / 2) return false;
  return e.lines.some((c) => Math.abs(across - c) < m.width / 2 + pl.r);
}

function allHands(e, game) {
  const a = e.params.allhands;
  const pl = game.player;
  const hpMult = game.spawner.sample(game.time, 'hpMult');
  for (let i = 0; i < a.pairs; i++) {
    const ang = (i / a.pairs) * Math.PI * 2 + Math.random();
    spawnEnemy(game, a.id, pl.x + Math.cos(ang) * a.radius, pl.y + Math.sin(ang) * a.radius, hpMult);
  }
  // The banner the first time; after that everyone knows the drill.
  if (!e.ay2) game.hud.banner('ALL-HANDS MEETING', 'Mandatory. Cameras on. The consultants are here to help.', 2);
  else game.fx.text(pl.x, pl.y - 34, 'ALL-HANDS!', '#ffcd75');
  e.ay2 = 1;
  game.fx.ring(e.x, e.y, 60, '#ffcd75', 0.5);
  sfx('alarm');
}

function spinOff(e, game) {
  const p = e.params;
  e.phase = 1;
  const c = spawnEnemy(game, p.spin, e.x + 40, e.y);
  if (!c) return;
  c.kx = 180;
  c.t0 = 1.5;
  game.addBossPart(c);
  game.hud.banner('SPIN-OFF', 'It spun off a Subsidiary. Close them both.', 2.5);
  game.fx.ring(e.x, e.y, 70, '#ffcd75', 0.5);
  game.fx.burst(e.x, e.y, e.def.particle, 30);
  game.camera.shake(6);
  sfx('siren');
}

function startAttack(e, game) {
  const list = e.params.attacks;
  let i = (Math.random() * list.length) | 0;
  if (list.length > 1 && list[i] === e.n) i = (i + 1) % list.length; // no repeats
  e.n = list[i];
  if (e.n === 'memo') return startMemo(e, game);
  e.state = POSE;
  e.stateT = POSE_TIME;
  e.anim = 'attack';
  e.pose = WIDE_POSE;
  allHands(e, game);
}

function endAttack(e) {
  const p = e.params;
  e.state = WALK;
  e.anim = 'walk';
  e.pose = -1;
  e.t0 = p.attackGap[e.hp < e.maxHp * p.enrageAt ? 1 : 0];
}

export default {
  init(e) {
    e.lines = e.lines ?? [];
    e.lines.length = 0;
    e.t0 = e.params.isSmall ? 1.5 : 2.5; // until the first attack
    e.t1 = 0; // absorb budget (users it may still acquire this second)
    e.ay2 = 0; // has it called an all-hands yet?
    e.n = '';
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    if (p.absorb) e.t1 = Math.min(p.absorb.perSec, e.t1 + p.absorb.perSec * dt);
    if (e.phase === 0 && p.spinAt && e.hp < e.maxHp * p.spinAt) spinOff(e, game);
    switch (e.state) {
      case WALK:
        stepToward(e, pl.x, pl.y, e.speed * e.slow * e.buff, dt);
        if ((e.t0 -= dt) <= 0) startAttack(e, game);
        break;
      case MEMO_TELL:
        if ((e.stateT -= dt) <= 0) {
          e.state = MEMO;
          e.stateT = MEMO_SHOW;
          if (memoHits(e, game) && hurtPlayer(game, p.memo.damage)) game.onPlayerHurt();
          game.camera.shake(3);
          sfx('whoosh', e.x);
        }
        break;
      case MEMO:
      case POSE:
        if ((e.stateT -= dt) <= 0) endAttack(e);
        break;
    }
  },

  // After the spatial hash is built: acquire the users it is touching.
  post(e, game) {
    const a = e.params.absorb;
    if (!a || e.t1 < 1) return;
    const buf = game.scratch2;
    const n = game.hash.query(e.x, e.y, e.r + 10, buf);
    for (let k = 0; k < n && e.t1 >= 1; k++) {
      const o = game.enemies.items[buf[k]];
      if (o === e || o.dead || o.def.boss || o.def.anchored) continue;
      const rr = e.r + o.r;
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 > rr * rr) continue;
      o.dead = true; // acquired: no ticket for you
      e.t1 -= 1;
      e.hp = Math.min(e.maxHp, e.hp + a.heal);
      if (e.scale < a.maxScale) {
        e.scale = Math.min(a.maxScale, e.scale + a.grow);
        e.r = e.def.radius * e.scale;
      }
      game.fx.burst(o.x, o.y - 6, ['#ffcd75', '#1f2a5c', '#f4f4f4'], 4);
      if (Math.random() < 0.15) game.fx.text(o.x, o.y - 18, 'ACQUIRED', '#ffcd75');
    }
  },

  // Restructuring telegraph: red strips with a blinking border, then the memo itself.
  drawUnder(e, game, ctx) {
    if (e.state !== MEMO_TELL && e.state !== MEMO) return;
    const m = e.params.memo;
    const half = m.length / 2;
    for (const c of e.lines) {
      const [x, y, w, h] = e.ax ? [e.ay - half, c - m.width / 2, m.length, m.width] : [c - m.width / 2, e.ay - half, m.width, m.length];
      if (e.state === MEMO_TELL) {
        const k = 1 - e.stateT / m.telegraph;
        ctx.globalAlpha = 0.18 + 0.25 * k;
        ctx.fillStyle = '#b13e53';
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = (game.time * 10) & 1 ? 0.9 : 0.5;
        ctx.strokeStyle = '#b13e53';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      } else {
        // The memo: a sheet of paper sliding down the whole lane.
        ctx.globalAlpha = Math.min(1, (e.stateT / MEMO_SHOW) * 2);
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#94b0c2';
        if (e.ax) for (let i = 8; i < w - 8; i += 24) ctx.fillRect(x + i, y + h / 2 - 1, 14, 2);
        else for (let i = 8; i < h - 8; i += 24) ctx.fillRect(x + w / 2 - 1, y + i, 2, 14);
      }
    }
    ctx.globalAlpha = 1;
  },
};
