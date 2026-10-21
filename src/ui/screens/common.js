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
    <div class="review-head"><span>PERFORMANCE REVIEW</span><span>${s.character}</span></div>
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
