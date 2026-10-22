// The Rat's Nest (Server Room boss at 10:00): a tangle of patch cables dragging itself
// across the raised floor.
//   lash    red lines on the floor first, then 3-5 cables whip out along them
//   snag    loose cable loops land around you and slow you down while you stand in them
//   split   at `splitAt` HP it unplugs into three smaller nests (this one shrinks and two
//           more appear); the fight ends when all three are down (see Game.addBossPart)
//   fire    second phase, when the whole fight is down to `phase2.at`: every nest left
//           catches fire, moves faster, lashes more often, and sparks run down each
//           cable after it lands (a line of small blasts, shown as filling circles)

import { stepToward } from './chase.js';
import { spawnEnemy } from '../enemies.js';
import { hurtPlayer } from '../player.js';
import { sfx } from '../../engine/audio.js';
import { strokeAttack, blinkAlpha } from '../hazards.js';
import { belowPhase2, enterPhase2 } from './phase2.js';

const WALK = 0;
const LASH_TELL = 1;
const LASH = 2;
const LASH_SHOW = 0.3;
const BODY_Y = 0; // cables come out of the middle of the tangle (the collision center)
const COLORS = ['#41a6f6', '#ffcd75', '#38b764', '#ef7d57', '#b13e53'];

function startLash(e, game) {
  const p = e.params;
  const small = e.ai.small;
  const pl = game.player;
  const n = small ? 2 + ((Math.random() * 2) | 0) : 3 + ((Math.random() * 3) | 0);
  const base = Math.atan2(pl.y - (e.y + BODY_Y), pl.x - e.x);
  e.ai.lashAngles.length = 0;
  for (let i = 0; i < n; i++) e.ai.lashAngles.push(base + (i / n) * Math.PI * 2 + (i ? (Math.random() - 0.5) * 0.5 : 0));
  e.ai.state = LASH_TELL;
  e.ai.stateT = p.lashTelegraph;
  sfx('warn', e.x);
  e.anim = 'attack';
}

function lashHits(e, game) {
  const p = e.params;
  const pl = game.player;
  const len = p.lashLength * (e.ai.small ? 0.75 : 1);
  const dx = pl.x - e.x;
  const dy = pl.y - (e.y + BODY_Y);
  for (const a of e.ai.lashAngles) {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const along = dx * ux + dy * uy;
    const across = Math.abs(dx * uy - dy * ux);
    if (along > -pl.r && along < len + pl.r && across < p.lashWidth / 2 + pl.r) return true;
  }
  return false;
}

function snag(e, game) {
  const p = e.params;
  const pl = game.player;
  const n = e.ai.small ? 1 : p.snagCount;
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 10 : p.snagScatter * (0.5 + Math.random() * 0.5);
    const a = Math.random() * Math.PI * 2;
    game.zones.add(pl.x + Math.cos(a) * r, pl.y + 10 + Math.sin(a) * r, p.snag);
  }
  game.fx.burst(e.x, e.y + BODY_Y, ['#41a6f6', '#ffcd75', '#38b764'], 8);
  sfx('whoosh');
}

// On fire: sparks run down every cable of the lash that just landed.
function sparks(e, game, k) {
  const len = e.params.lashLength * (e.ai.small ? 0.75 : 1);
  for (const a of e.ai.lashAngles) {
    for (let i = 1; i <= k.count; i++) {
      const d = (len * i) / k.count;
      game.hazards.bomb(e.x + Math.cos(a) * d, e.y + BODY_Y + Math.sin(a) * d, k.radius, k.delay + i * k.step, k.damage);
    }
  }
}

// Unplugged: shrink into one of three smaller nests sharing what HP is left.
function split(e, game) {
  const p = e.params;
  const def = game.assets.sprite(p.small);
  e.ai.small = true;
  const share = e.hp / 3;
  e.hp = share;
  e.spr = def;
  e.r = 16;
  e.foot = 16;
  for (const side of [-1, 1]) {
    const c = spawnEnemy(game, p.small, e.x + side * 30, e.y);
    if (!c) continue;
    c.hp = share;
    c.kx = side * 160;
    c.ai.lashIn = 1 + Math.random();
    c.ai.snagIn = 3 + Math.random() * 2;
    game.addBossPart(c);
  }
  game.hud.banner('UNPLUGGED', 'It split into three. Close all of them.', 2.5);
  game.fx.ring(e.x, e.y + BODY_Y, 70, '#41a6f6', 0.5);
  game.fx.burst(e.x, e.y + BODY_Y, ['#41a6f6', '#ffcd75', '#38b764', '#ef7d57'], 30);
  game.camera.shake(6);
  sfx('siren');
  e.ai.state = WALK;
  e.anim = 'walk';
  e.ai.lashIn = 2;
}

export default {
  init(e) {
    // This boss's own state (pool objects are reused, so it's made fresh each fight).
    e.ai = {
      state: WALK,
      stateT: 0, // seconds left in the current state
      lashIn: 2, // seconds until the next lash
      snagIn: 4, // seconds until the next cable snag
      small: !!e.def.params.isSmall, // one of the three nests after the split
      lashAngles: [], // directions of the cables in the current lash
      phase2: false, // on fire (behaviors/phase2.js)
    };
  },

  update(e, game, dt) {
    const p = e.params;
    const pl = game.player;
    if (!e.ai.small && p.splitAt && e.hp < e.maxHp * p.splitAt) split(e, game);
    // On fire once the whole fight (all three nests) is low enough.
    if (!e.ai.phase2 && e.ai.small && belowPhase2(e, game, true)) enterPhase2(e, game);
    const small = e.ai.small;
    const fire = e.ai.phase2 ? p.phase2 : null;
    if (e.ai.state === WALK) {
      e.anim = 'walk';
      stepToward(e, pl.x, pl.y, e.speed * (small ? 1.5 : 1) * (fire ? fire.speed : 1) * e.slow * e.buff, dt);
      if ((e.ai.lashIn -= dt) <= 0) startLash(e, game);
    } else if (e.ai.state === LASH_TELL) {
      if ((e.ai.stateT -= dt) <= 0) {
        e.ai.state = LASH;
        e.ai.stateT = LASH_SHOW;
        if (lashHits(e, game) && hurtPlayer(game, p.lashDamage)) game.onPlayerHurt();
        if (fire) sparks(e, game, fire.sparks);
        game.camera.shake(small ? 2 : 4);
        sfx('snap', e.x);
      }
    } else if ((e.ai.stateT -= dt) <= 0) {
      e.ai.state = WALK;
      e.ai.lashIn = p.lashEvery * (small ? 1.4 : 1) * (fire ? fire.lashEvery : 1);
    }
    if ((e.ai.snagIn -= dt) <= 0) {
      e.ai.snagIn = p.snagEvery * (small ? 1.5 : 1);
      snag(e, game);
    }
  },

  // Telegraph: thin red strips where the cables will land; then the cables themselves.
  drawUnder(e, game, ctx) {
    if (e.ai.state === WALK) return;
    const p = e.params;
    const len = p.lashLength * (e.ai.small ? 0.75 : 1);
    const x = e.x;
    const y = e.y + BODY_Y;
    ctx.save();
    ctx.translate(x, y);
    if (e.ai.state === LASH_TELL) {
      const k = 1 - e.ai.stateT / p.lashTelegraph;
      const edge = blinkAlpha(game);
      for (const a of e.ai.lashAngles) {
        ctx.save();
        ctx.rotate(a);
        ctx.globalAlpha = 0.2 + 0.25 * k;
        ctx.fillStyle = '#b13e53';
        ctx.fillRect(0, -p.lashWidth / 2, len, p.lashWidth);
        ctx.beginPath();
        ctx.rect(0, -p.lashWidth / 2, len, p.lashWidth);
        strokeAttack(ctx, '#b13e53', 1.5, edge);
        ctx.restore();
      }
    } else {
      const t = 1 - e.ai.stateT / LASH_SHOW;
      ctx.globalAlpha = Math.min(1, (e.ai.stateT / LASH_SHOW) * 2);
      ctx.lineCap = 'round';
      e.ai.lashAngles.forEach((a, i) => {
        ctx.save();
        ctx.rotate(a);
        const reach = len * Math.min(1, t * 3);
        const wob = Math.sin(t * Math.PI * 3 + i) * 8;
        // Dark rim, bright edge, then the cable's own colour (see strokeAttack).
        for (const [col, lw] of [['#1a1c2c', 9], ['#ffcd75', 7], ['#1a1c2c', 5], [COLORS[i % COLORS.length], 3]]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(reach * 0.33, wob, reach * 0.66, -wob, reach, 0);
          ctx.stroke();
        }
        ctx.fillStyle = '#f4f4f4'; // RJ45 plug
        ctx.fillRect(Math.round(reach - 3), -2, 6, 4);
        ctx.restore();
      });
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
