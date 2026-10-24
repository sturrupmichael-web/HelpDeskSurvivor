// Small helpers shared by the menu screens.

import { CHARACTERS } from '../../../data/player.js';
import { WEAPONS } from '../../../data/weapons.js';
import { PASSIVES } from '../../../data/passives.js';

export const pickLine = (list) => list[(Math.random() * list.length) | 0];

// The HR performance review on the end-of-shift screen (worked out in src/game/review.js).
export function reviewCard(s) {
  const r = s.review;
  const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
  return `<div class="review rating-${r.ratingId}">
    <div class="review-head"><span>PERFORMANCE REVIEW${s.hardcore ? ' <b class="hc-tag">HARDCORE</b>' : ''}</span><span>${s.character}</span></div>
    <div class="review-rating"><span class="review-stars" aria-label="${r.stars} out of 5">${stars}</span><b>${r.rating}</b></div>
    <div class="review-label">Manager's comments</div>
    <ul>${r.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <div class="review-goal"><span class="review-label">Goal for next quarter</span> ${r.goal}</div>
    <div class="review-sign">Signed, <i>${r.manager}</i></div>
  </div>`;
}
export const DIGITS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad7: 6, Numpad8: 7, Numpad9: 8 };
// Display name of a map-win unlock ({ kind, id } from Meta.unlocksFor).
export const unlockName = ({ kind, id }) =>
  kind === 'characters' ? `${CHARACTERS[id].name} (hire)` : kind === 'passives' ? PASSIVES[id].name : kind === 'evolutions' ? `${WEAPONS[id].name} (evolution)` : WEAPONS[id].name;
export const PAY = (n) => `<span class="pay">$${n.toLocaleString()}</span>`;
// Names on the leaderboard come from other players: always escape before showing them.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const ITEM_HINT = 'Hover or tap a tool or passive to see what it does.';
export const itemLevel = (t) => (t.level >= t.maxLevel ? 'MAX' : `Lv ${t.level}`);

// Tool and passive rows (data-item = index into `items`, each { name, desc, level, maxLevel })
// on the shift summary and the pause menu's Shift Stats.
// Shows one item's description in the .item-info box under the lists: on hover or keyboard focus,
// and on a tap for phones (tapping the same row again hides it). A tap moves the box
// to just under the row, so it's on screen even when the lists are long.
export function wireItems(root, items) {
  const box = root.querySelector('.item-info');
  if (!box) return;
  const rows = [...root.querySelectorAll('[data-item]')];
  const home = box.parentNode;
  let shown = null;
  const show = (row, under = false) => {
    shown = row;
    if (row && under) row.after(box);
    else home.append(box);
    rows.forEach((r) => r.classList.toggle('selected', r === row));
    if (!row) {
      box.textContent = ITEM_HINT;
      box.classList.remove('on');
      return;
    }
    const t = items[row.dataset.item];
    const level = t.maxLevel > 1 ? ` <span class="tool-lvl">${itemLevel(t)}</span>` : '';
    box.innerHTML = `<b>${t.name}</b>${level}<br>${t.desc ?? ''}`;
    box.classList.add('on');
  };
  let touch = false; // the pointer that's down is a finger or pen, not a mouse
  let pressing = false;
  for (const row of rows) {
    row.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show(row));
    row.addEventListener('pointerdown', (e) => {
      touch = e.pointerType !== 'mouse';
      pressing = true;
    });
    row.addEventListener('focus', () => !pressing && show(row)); // Tab key
    row.addEventListener('click', () => {
      pressing = false;
      show(touch && shown === row ? null : row, touch);
    });
  }
  root.querySelector('.item-list')?.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && show(null));
}
