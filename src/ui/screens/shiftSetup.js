// shiftSetup: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { CHARACTERS } from '../../../data/player.js';
import { WEAPONS } from '../../../data/weapons.js';
import { gamepadConnected } from '../../engine/input.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { DIGITS, PAY } from './common.js';
import { policiesStep } from './policies.js';
import { HARDCORE } from '../../../data/policies.js';
import { icon } from '../icons.js';

// Clock In: pick a tech, then a map, then (once you've finished a shift) Shift Policies,
// then confirm, all in one flow. Everything starts on the last shift's picks, which are
// saved when the shift starts. Locked ones show why.
// Clock In from the title or training: skips a step that has nothing to choose (one tech
// and nothing affordable to hire, or one open map), so a brand-new player goes straight
// to work. "Change Tech or Map" on the end-of-shift screen still shows every step.
export function clockIn(scr) {
  const meta = scr.game.meta;
  const pick = { char: meta.data.selected, map: meta.data.map, policies: [...meta.data.policies], reorg: meta.data.reorg, hardcore: meta.hardcoreOn(), skipped: {} };
  const chars = Object.keys(CHARACTERS);
  const hireable = (id) => !meta.isUnlocked(id) && meta.itemUnlocked('characters', id) && meta.data.pay >= CHARACTERS[id].cost;
  pick.skipped.char = chars.filter((id) => meta.isUnlocked(id)).length === 1 && !chars.some(hireable);
  pick.skipped.map = MAP_ORDER.filter((id) => meta.mapUnlocked(id)).length === 1;
  if (!pick.skipped.char) return shiftSetup(scr, 'char', pick);
  if (!pick.skipped.map) return shiftSetup(scr, 'map', pick);
  if (meta.policiesOpen()) return shiftSetup(scr, 'policies', pick);
  sfx('click');
  meta.select(pick.char);
  meta.selectMap(pick.map);
  scr.game.newRun();
}

export function shiftSetup(scr, step = 'char', pick) {
  const g = scr.game;
  const meta = g.meta;
  pick ??= { char: meta.data.selected, map: meta.data.map, policies: [...meta.data.policies], reorg: meta.data.reorg, hardcore: meta.hardcoreOn() };
  if (step === 'policies') return policiesStep(scr, pick);
  const withPolicies = meta.policiesOpen();
  const skipped = pick.skipped ?? {};
  const steps = (withPolicies ? 3 : 2) - (skipped.char ? 1 : 0) - (skipped.map ? 1 : 0);
  const stepNo = isCharStep(step) ? 1 : skipped.char ? 1 : 2;
  const chars = Object.keys(CHARACTERS);
  const isChar = step === 'char';
  const ids = isChar ? chars : MAP_ORDER;
  const usable = (id) => (isChar ? meta.isUnlocked(id) : meta.mapUnlocked(id));
  const again = () => scr.shiftSetup(step, pick);
  const next = () => {
    sfx('click');
    if (isChar && !skipped.map) return scr.shiftSetup('map', pick);
    if (withPolicies) return scr.shiftSetup('policies', pick);
    meta.select(pick.char);
    meta.selectMap(pick.map);
    meta.setHardcore(pick.hardcore);
    g.newRun();
  };
  // Hardcore (data/policies.js HARDCORE): a switch under the maps once every map is won.
  const withHardcore = !isChar && meta.hardcoreOpen();
  const toggleHardcore = () => {
    if (!withHardcore) return false;
    pick.hardcore = !pick.hardcore;
    sfx(pick.hardcore ? 'warn' : 'click');
    again();
  };
  const back = () => {
    sfx('click');
    if (isChar || skipped.char) scr.title();
    else scr.shiftSetup('char', pick);
  };
  // Tapping the highlighted card again moves on, so a double tap (or A twice) is enough.
  const choose = (i) => {
    const id = ids[i];
    if (!id) return;
    if (id === pick[isChar ? 'char' : 'map'] && usable(id)) return next();
    if (isChar && !meta.isUnlocked(id)) {
      if (!meta.unlock(id)) return; // hire with Overtime Pay
      g.achievements.check();
      sfx('chest');
    } else if (!usable(id)) return;
    else sfx('click');
    pick[isChar ? 'char' : 'map'] = id;
    again();
  };
  const move = (dir) => {
    const open = ids.filter(usable);
    const at = open.indexOf(pick[isChar ? 'char' : 'map']);
    pick[isChar ? 'char' : 'map'] = open[(at + dir + open.length) % open.length];
    sfx('click');
    again();
  };
  const charCard = (id, i) => {
    const c = CHARACTERS[id];
    const unlocked = meta.isUnlocked(id);
    const hireable = meta.itemUnlocked('characters', id);
    const afford = hireable && meta.data.pay >= c.cost;
    const status = pick.char === id
      ? '<b class="ok">PICKED</b>'
      : unlocked
        ? 'Tap to pick'
        : !hireable
          ? `Locked: win a shift in the ${MAPS[meta.unlockedBy('characters', id)].name}`
          : afford
            ? `Hire for ${PAY(c.cost)}`
            : `Need ${PAY(c.cost)}`;
    return `<button class="card char ${pick.char === id ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${!unlocked && !afford ? 'disabled' : ''}>
      <div class="card-head"><canvas data-spr="${c.sprite}" width="64" height="64"></canvas>
        <div class="card-name">${c.name}</div><kbd>${i + 1}</kbd></div>
      <div class="card-level">Starts with ${WEAPONS[c.starter].name}</div>
      <div class="card-text">${c.perk}</div>
      <div class="char-status">${status}</div>
    </button>`;
  };
  const mapCard = (id, i) => {
    const m = MAPS[id];
    const unlocked = meta.mapUnlocked(id);
    const best = meta.data.mapBest[id];
    const status = pick.map === id ? '<b class="ok">PICKED</b>' : unlocked ? 'Tap to pick' : `Locked: win a shift in the ${MAPS[m.unlockAfter].name}`;
    return `<button class="card map ${pick.map === id ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${unlocked ? '' : 'disabled'}>
      <div class="card-head"><canvas data-map="${m.floor}" width="96" height="96"></canvas>
        <div><div class="card-name">${m.name}</div>
        <div class="card-level">${m.pay > 1 ? `${m.pay}x Overtime Pay` : 'Standard pay'}</div></div><kbd>${i + 1}</kbd></div>
      <div class="card-text">${m.twistText}</div>
      ${best ? `<div class="card-hint">Best: ${fmtTime(best.time)} · ${best.tickets.toLocaleString()} tickets · ${best.wins} won</div>` : ''}
      <div class="char-status">${status}</div>
    </button>`;
  };
  const tech = CHARACTERS[pick.char];
  scr.show(
    `<div class="panel wide chars setup">
      <p class="setup-step">STEP ${stepNo} OF ${steps}</p>
      <h2>${isChar ? 'PICK YOUR TECH' : 'PICK YOUR MAP'}</h2>
      ${
        isChar
          ? `<p class="sub">Overtime Pay: ${PAY(meta.data.pay)}</p>`
          : skipped.char
            ? ''
            : `<button class="setup-tech" data-act="back"><canvas data-spr="${tech.sprite}" width="64" height="64"></canvas>
              <span><b>${tech.name}</b><small>Change tech</small></span></button>`
      }
      <div class="cards">${ids.map(isChar ? charCard : mapCard).join('')}</div>
      ${
        withHardcore
          ? `<button class="hc-switch ${pick.hardcore ? 'on' : ''}" data-act="hardcore" aria-pressed="${!!pick.hardcore}">
              <span class="switch"></span>${icon('hardcore', 20)}<span><b>HARDCORE</b> ${pick.hardcore ? 'ON' : 'OFF'} <kbd>H</kbd>
              <small>${HARDCORE.desc}</small></span></button>`
          : ''
      }
      <div class="setup-bar">
        <button data-act="back">${isChar || skipped.char ? 'Cancel' : 'Back'} <kbd>Esc</kbd></button>
        <button class="primary" data-act="next">${isChar && !skipped.map ? 'Next: Map' : withPolicies ? 'Next: Policies' : `Clock In: ${MAPS[pick.map].name}${pick.hardcore && withHardcore ? ' (Hardcore)' : ''}`} <kbd>Enter</kbd></button>
      </div>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined) choose(DIGITS[code]);
      else if (code === 'ArrowRight' || code === 'ArrowDown' || code === 'KeyD' || code === 'KeyS') move(1);
      else if (code === 'ArrowLeft' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyW') move(-1);
      else if (code === 'Enter' || code === 'Space') next();
      else if (code === 'Escape' || code === 'Backspace') back();
      else if (code === 'KeyH') return toggleHardcore();
      else return false;
    },
  );
  scr.bind('.card', (i) => choose(i));
  scr.bind('[data-act=hardcore]', toggleHardcore);
  scr.bind('[data-act=back]', back);
  scr.bind('[data-act=next]', next);
  scr.drawThumbs();
  if (!isChar) scr.drawMapThumbs();
  const picked = scr.root.querySelector('.card.selected');
  picked?.scrollIntoView({ block: 'nearest' });
  if (gamepadConnected()) picked?.focus();
}

const isCharStep = (step) => step === 'char';
