// leaderboard: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { topScores } from '../../game/leaderboard.js';
import { profileScreen } from '../profile.js';
import { LEADERBOARD } from '../../../data/leaderboard.js';
import { DIGITS, esc } from './common.js';
import { icon } from '../icons.js';
import { POLICIES } from '../../../data/policies.js';
import { parseMods, fmtMult } from '../../game/policies.js';

// Clean-only filter, remembered while the page is open.
let cleanOnly = false;

// The policies on a row, as small icons. Names show on hover, or on a tap (phones can't hover).
function modsCell(row) {
  const ids = parseMods(row.mods);
  if (!ids.length) return '<span class="tiny">—</span>';
  const names = ids.map((id) => (id === 'reorg' ? 'Reorg bonus' : POLICIES[id].name)).join(', ');
  const label = `${names} (${fmtMult(Number(row.mult) || 1)})`;
  return `<span class="mods" title="${label}" data-label="${label}">${ids
    .map((id) => (id === 'reorg' ? '🎲' : icon(POLICIES[id].icon, 14)))
    .join('')}</span>`;
}

// Character select: pick an unlocked tech, or unlock one with Overtime Pay.
// Map select: each map unlocks after a won shift on the one before it.
// Online leaderboard: top scores (CSAT x Shift Policies) per map, one map at a time (1-5
// or the tabs), optionally only shifts without policies (C).
export function leaderboard(scr, mapId = this.game.meta.data.map) {
  const tabs = MAP_ORDER.map(
    (id, i) => `<button class="tab ${id === mapId ? 'selected' : ''}" data-map="${id}">${MAPS[id].name} <kbd>${i + 1}</kbd></button>`,
  ).join('');
  scr.show(
    `<div class="panel wide board">
      <h2>LEADERBOARD</h2>
      <p class="sub">Top ${LEADERBOARD.top} per map. Score = CSAT x the shift's policies. Tap a player to see their profile, or tap the policy icons to see their names.</p>
      <div class="tabs">${tabs}</div>
      <div class="tabs board-filter">
        <button class="tab ${cleanOnly ? '' : 'selected'}" data-clean="0">All shifts</button>
        <button class="tab ${cleanOnly ? 'selected' : ''}" data-clean="1">No policies only <kbd>C</kbd></button>
      </div>
      <div class="board-body"><p class="board-msg">Loading…</p></div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (DIGITS[code] !== undefined && MAP_ORDER[DIGITS[code]]) scr.leaderboard(MAP_ORDER[DIGITS[code]]);
      else if (code === 'KeyC') {
        cleanOnly = !cleanOnly;
        scr.leaderboard(mapId);
      }
      else if (code === 'Escape' || code === 'Enter') scr.title();
      else return false;
    },
  );
  scr.bind('.tab[data-map]', (i, el) => scr.leaderboard(el.dataset.map));
  scr.bind('.tab[data-clean]', (i, el) => {
    cleanOnly = el.dataset.clean === '1';
    sfx('click');
    scr.leaderboard(mapId);
  });
  scr.bind('[data-act=back]', () => scr.title());
  const body = scr.root.querySelector('.board-body');
  topScores(mapId, cleanOnly).then((r) => {
    if (scr.root.querySelector('.board-body') !== body) return; // screen changed meanwhile
    if (!r.ok) body.innerHTML = '<p class="board-msg">Couldn\'t reach the leaderboard. Check your connection and try again.</p>';
    else if (!r.rows.length) body.innerHTML = '<p class="board-msg">No scores on this map yet. Be the first.</p>';
    else
      body.innerHTML = `<table class="stats board-table">
        <tr class="head"><td>#</td><td>Name</td><td>Technician</td><td>Time</td><td>Policies</td><td>Score</td></tr>
        ${r.rows
          .map(
            (row, i) => `<tr data-name="${esc(row.name)}"${row.name === scr.game.meta.data.playerName ? ' class="me"' : ''}><td>${i + 1}</td><td><button class="name-link" data-name="${esc(row.name)}">${esc(row.name)}</button></td>
            <td>${esc(row.character)}</td><td>${fmtTime(Number(row.seconds) || 0)}${row.won ? ' <b class="ok">✓</b>' : ''}</td><td>${modsCell(row)}</td><td>${Number(row.score ?? row.csat).toLocaleString()}</td></tr>`,
          )
          .join('')}
      </table>`;
    // The whole row opens the profile, so it's an easy tap target (the name stays a button
    // for keyboard and controller). Tapping the policy icons shows their names instead.
    body.querySelectorAll('tr[data-name]').forEach((tr) =>
      tr.addEventListener('click', () => {
        sfx('click');
        profileScreen(scr, tr.dataset.name, () => scr.leaderboard(mapId));
      }),
    );
    body.querySelectorAll('.mods').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        el.classList.toggle('named');
        if (el.classList.contains('named')) {
          el.dataset.icons = el.innerHTML;
          el.textContent = el.dataset.label;
        } else el.innerHTML = el.dataset.icons;
      }),
    );
  });
}
