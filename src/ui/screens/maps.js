// maps: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { DIGITS } from './common.js';

export function maps(scr) {
  const g = scr.game;
  const meta = g.meta;
  const act = (i) => {
    const id = MAP_ORDER[i];
    if (!id || !meta.selectMap(id)) return;
    sfx('chest');
    g.setMap(id);
    g.newRun(); // fresh floor behind the menu
    g.setState('title');
    scr.maps();
  };
  const card = (id, i) => {
    const m = MAPS[id];
    const unlocked = meta.mapUnlocked(id);
    const selected = meta.data.map === id;
    const best = meta.data.mapBest[id];
    const status = selected
      ? '<b class="ok">ON SHIFT</b>'
      : unlocked
        ? 'Select'
        : `Locked: win a shift in the ${MAPS[m.unlockAfter].name}`;
    return `<button class="card map ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${unlocked ? '' : 'disabled'}>
      <div class="card-head"><canvas data-map="${m.floor}" width="96" height="96"></canvas>
        <div><div class="card-name">${m.name}</div>
        <div class="card-level">${m.pay > 1 ? `${m.pay}x Overtime Pay` : 'Standard pay'}</div></div><kbd>${i + 1}</kbd></div>
      <div class="card-text">${m.twistText}</div>
      <div class="card-flavor">${m.blurb}</div>
      ${best ? `<div class="card-hint">Best: ${fmtTime(best.time)} · ${best.tickets.toLocaleString()} tickets · ${best.wins} won</div>` : ''}
      <div class="char-status">${status}</div>
    </button>`;
  };
  scr.show(
    `<div class="panel wide chars maps">
      <h2>OFFICE MAPS</h2>
      <p class="sub">Win a shift on a map to unlock the next one.</p>
      <div class="cards">${MAP_ORDER.map(card).join('')}</div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined) act(DIGITS[code]);
      else if (code === 'Escape' || code === 'Enter') scr.title();
      else return false;
    },
  );
  scr.bind('.card', (i) => act(i));
  scr.bind('[data-act=back]', () => scr.title());
  scr.drawMapThumbs();
}
