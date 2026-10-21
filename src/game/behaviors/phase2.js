// Boss second phases (idea 14): at `params.phase2.at` of its HP a boss gets angry and
// picks up a new attack. The switch always looks and sounds the same, so players learn
// it: a banner, a shockwave, the "phase2" growl, and from then on a red glow under the
// boss, embers coming off it and an orange HUD bar (see drawEnemies and Hud.update).

import { sfx } from '../../engine/audio.js';

const EMBERS = ['#b13e53', '#ef7d57', '#ffcd75'];

// Has this boss (or, with `whole`, the whole fight across split pieces) dropped below
// the phase 2 line? `whole` is for bosses that split before their second phase.
export function belowPhase2(e, game, whole = false) {
  const ph = e.params.phase2;
  if (!ph) return false;
  return (whole ? game.bossHpFrac() : e.hp / e.maxHp) < ph.at;
}

// Switches a boss into its second phase. The banner and sound play once per fight even
// when several pieces of a split boss switch together.
export function enterPhase2(e, game) {
  const ph = e.params.phase2;
  e.angry = true;
  e.ai.phase2 = true;
  game.fx.ring(e.x, e.y, 90, '#b13e53', 0.6);
  game.fx.ring(e.x, e.y, 50, '#ef7d57', 0.4, true);
  game.fx.burst(e.x, e.y - 10, EMBERS, 24);
  if (game.bossPhase2) return;
  game.bossPhase2 = true;
  if (ph.title) game.hud.banner(ph.title, ph.text, 2.5);
  game.camera.shake(7);
  sfx('phase2', e.x);
}

// Embers while angry; called every tick from updateEnemies.
export function angryTick(e, game, dt) {
  if ((e.angryT -= dt) > 0) return;
  e.angryT = 0.2;
  game.fx.burst(e.x + (Math.random() - 0.5) * e.r * 1.4, e.y - e.r * 0.6, EMBERS, 2);
}

// The red glow under an angry boss, drawn before its shadow.
export function drawAngryGlow(e, game, ctx) {
  const fy = e.y + e.foot;
  const w = 30 * e.scale;
  ctx.globalAlpha = 0.28 + 0.14 * Math.sin(game.time * 8);
  ctx.fillStyle = '#b13e53';
  ctx.beginPath();
  ctx.ellipse(e.x, fy - 3, w, w * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
