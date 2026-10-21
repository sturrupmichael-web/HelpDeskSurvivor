// shiftSetup: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { CHARACTERS } from '../../../data/player.js';
import { WEAPONS } from '../../../data/weapons.js';
import { gamepadConnected } from '../../engine/input.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { DIGITS, PAY } from './common.js';

// Clock In: pick a tech, then a map, then confirm, all in one flow. Both start on the
// last shift's picks, which are saved when the shift starts. Locked ones show why.
export function shiftSetup(scr, step = 'char', pick) {
  const g = scr.game;
  const meta = g.meta;
  pick ??= { char: meta.data.selected, map: meta.data.map };
  const chars = Object.keys(CHARACTERS);
  const isChar = step === 'char';
  const ids = isChar ? chars : MAP_ORDER;
  const usable = (id) => (isChar ? meta.isUnlocked(id) : meta.mapUnlocked(id));
  const again = () => scr.shiftSetup(step, pick);
  const next = () => {
    sfx('click');
    if (isChar) return scr.shiftSetup('map', pick);
    meta.select(pick.char);
    meta.selectMap(pick.map);
    g.newRun();
  };
  const back = () => {
    sfx('click');
    if (isChar) scr.title();
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
            : `Locked: ${PAY(c.cost)}`;
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
      <p class="setup-step">STEP ${isChar ? 1 : 2} OF 2</p>
      <h2>${isChar ? 'PICK YOUR TECH' : 'PICK YOUR MAP'}</h2>
      ${
        isChar
          ? `<p class="sub">Overtime Pay: ${PAY(meta.data.pay)}</p>`
          : `<button class="setup-tech" data-act="back"><canvas data-spr="${tech.sprite}" width="64" height="64"></canvas>
              <span><b>${tech.name}</b><small>Change tech</small></span></button>`
      }
      <div class="cards">${ids.map(isChar ? charCard : mapCard).join('')}</div>
      <div class="setup-bar">
        <button data-act="back">${isChar ? 'Cancel' : 'Back'} <kbd>Esc</kbd></button>
        <button class="primary" data-act="next">${isChar ? 'Next: Map' : `Clock In: ${MAPS[pick.map].name}`} <kbd>Enter</kbd></button>
      </div>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined) choose(DIGITS[code]);
      else if (code === 'ArrowRight' || code === 'ArrowDown' || code === 'KeyD' || code === 'KeyS') move(1);
      else if (code === 'ArrowLeft' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyW') move(-1);
      else if (code === 'Enter' || code === 'Space') next();
      else if (code === 'Escape' || code === 'Backspace') back();
      else return false;
    },
  );
  scr.bind('.card', (i) => choose(i));
  scr.bind('[data-act=back]', back);
  scr.bind('[data-act=next]', next);
  scr.drawThumbs();
  if (!isChar) scr.drawMapThumbs();
  const picked = scr.root.querySelector('.card.selected');
  picked?.scrollIntoView({ block: 'nearest' });
  if (gamepadConnected()) picked?.focus();
}
