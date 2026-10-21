// characters: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { sfx } from '../../engine/audio.js';
import { CHARACTERS } from '../../../data/player.js';
import { WEAPONS } from '../../../data/weapons.js';
import { MAPS } from '../../../data/maps.js';
import { DIGITS, PAY } from './common.js';

export function characters(scr) {
  const meta = scr.game.meta;
  const ids = Object.keys(CHARACTERS);
  const act = (i) => {
    const id = ids[i];
    if (!id) return;
    if (meta.isUnlocked(id)) meta.select(id);
    else if (!meta.unlock(id)) return;
    else scr.game.achievements.check();
    sfx(meta.isUnlocked(id) ? 'chest' : 'click');
    scr.characters();
  };
  const card = (id, i) => {
    const c = CHARACTERS[id];
    const unlocked = meta.isUnlocked(id);
    const selected = meta.data.selected === id;
    const hireable = meta.itemUnlocked('characters', id); // some need a map win first (data/unlocks.js)
    const afford = hireable && meta.data.pay >= c.cost;
    const status = selected
      ? '<b class="ok">ON SHIFT</b>'
      : unlocked
        ? 'Select'
        : !hireable
          ? `Locked: win a shift in the ${MAPS[meta.unlockedBy('characters', id)].name}`
          : afford
            ? `Hire for ${PAY(c.cost)}`
            : `Locked: ${PAY(c.cost)}`;
    return `<button class="card char ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${!unlocked && !afford ? 'disabled' : ''}>
      <div class="card-head"><canvas data-spr="${c.sprite}" width="64" height="64"></canvas>
        <div class="card-name">${c.name}</div><kbd>${i + 1}</kbd></div>
      <div class="card-level">Starts with ${WEAPONS[c.starter].name}</div>
      <div class="card-text">${c.perk}</div>
      <div class="card-flavor">${c.blurb}</div>
      <div class="char-status">${status}</div>
    </button>`;
  };
  scr.show(
    `<div class="panel wide chars">
      <h2>CHARACTERS</h2>
      <p class="sub">Overtime Pay: ${PAY(meta.data.pay)}</p>
      <div class="cards">${ids.map(card).join('')}</div>
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
  scr.drawThumbs();
}
