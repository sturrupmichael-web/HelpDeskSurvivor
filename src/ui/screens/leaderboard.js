// leaderboard: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { topScores } from '../../game/leaderboard.js';
import { profileScreen } from '../profile.js';
import { LEADERBOARD } from '../../../data/leaderboard.js';
import { DIGITS, esc } from './common.js';

// Character select: pick an unlocked tech, or unlock one with Overtime Pay.
// Map select: each map unlocks after a won shift on the one before it.
// Online leaderboard: top CSAT per map, one map at a time (1-4 or the tabs).
export function leaderboard(scr, mapId = this.game.meta.data.map) {
  const tabs = MAP_ORDER.map(
    (id, i) => `<button class="tab ${id === mapId ? 'selected' : ''}" data-map="${id}">${MAPS[id].name} <kbd>${i + 1}</kbd></button>`,
  ).join('');
  scr.show(
    `<div class="panel wide board">
      <h2>LEADERBOARD</h2>
      <p class="sub">Top ${LEADERBOARD.top} CSAT scores per map. Tap a name to see that player's profile.</p>
      <div class="tabs">${tabs}</div>
      <div class="board-body"><p class="board-msg">Loading…</p></div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined && MAP_ORDER[DIGITS[code]]) scr.leaderboard(MAP_ORDER[DIGITS[code]]);
      else if (code === 'Escape' || code === 'Enter') scr.title();
      else return false;
    },
  );
  scr.bind('.tab', (i, el) => scr.leaderboard(el.dataset.map));
  scr.bind('[data-act=back]', () => scr.title());
  const body = scr.root.querySelector('.board-body');
  topScores(mapId).then((r) => {
    if (scr.root.querySelector('.board-body') !== body) return; // screen changed meanwhile
    if (!r.ok) body.innerHTML = '<p class="board-msg">Couldn\'t reach the leaderboard. Check your connection and try again.</p>';
    else if (!r.rows.length) body.innerHTML = '<p class="board-msg">No scores on scr map yet. Be the first.</p>';
    else
      body.innerHTML = `<table class="stats board-table">
        <tr class="head"><td>#</td><td>Name</td><td>Technician</td><td>Time</td><td>CSAT</td></tr>
        ${r.rows
          .map(
            (row, i) => `<tr${row.name === scr.game.meta.data.playerName ? ' class="me"' : ''}><td>${i + 1}</td><td><button class="name-link" data-name="${esc(row.name)}">${esc(row.name)}</button></td>
            <td>${esc(row.character)}</td><td>${fmtTime(Number(row.seconds) || 0)}${row.won ? ' <b class="ok">✓</b>' : ''}</td><td>${Number(row.csat).toLocaleString()}</td></tr>`,
          )
          .join('')}
      </table>`;
    body.querySelectorAll('.name-link').forEach((el) =>
      el.addEventListener('click', () => {
        sfx('click');
        profileScreen(scr, el.dataset.name, () => scr.leaderboard(mapId));
      }),
    );
  });
}
