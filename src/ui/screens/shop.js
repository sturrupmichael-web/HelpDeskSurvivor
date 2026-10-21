// shop: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { icon } from '../icons.js';
import { sfx } from '../../engine/audio.js';
import { SHOP } from '../../../data/meta.js';
import { DIGITS, PAY } from './common.js';

// Overtime Pay shop: permanent upgrades.
export function shop(scr) {
  const meta = scr.game.meta;
  const ids = Object.keys(SHOP);
  const buy = (i) => {
    const id = ids[i];
    if (!id) return;
    if (meta.buy(id)) {
      sfx('chest');
      scr.game.achievements.check();
      scr.shop();
    }
  };
  const row = (id, i) => {
    const d = SHOP[id];
    const lvl = meta.level(id);
    const cost = meta.nextCost(id);
    const max = d.costs.length;
    return `<button class="shop-row" data-i="${i}" ${cost === null || meta.data.pay < cost ? 'disabled' : ''}>
      ${icon(d.icon, 32)}
      <div class="shop-info"><div class="card-name">${d.name} <span class="pips">${'▮'.repeat(lvl)}${'▯'.repeat(max - lvl)}</span></div>
        <div class="card-text">${d.desc}</div><div class="card-flavor">${d.flavor}</div></div>
      <div class="shop-cost">${cost === null ? '<b class="ok">MAXED</b>' : PAY(cost)}</div>
      <kbd>${i + 1}</kbd>
    </button>`;
  };
  scr.show(
    `<div class="panel wide">
      <h2>OVERTIME SHOP</h2>
      <p class="sub">Balance: ${PAY(meta.data.pay)}. Upgrades are permanent and apply to every character.</p>
      <div class="shop-list">${ids.map(row).join('')}</div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined) buy(DIGITS[code]);
      else if (code === 'Escape' || code === 'Enter') scr.title();
      else return false;
    },
  );
  scr.bind('.shop-row', (i) => buy(i));
  scr.bind('[data-act=back]', () => scr.title());
}
