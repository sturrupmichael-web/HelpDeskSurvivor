// leaderboard: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { MAPS, MAP_ORDER } from '../../../data/maps.js';
import { topScores, myRank } from '../../game/leaderboard.js';
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

// Online leaderboard: top scores (CSAT x Shift Policies) per map, one map at a time (1-5
// or the swipeable map row), optionally only shifts without policies (C). Each row is
// rank, player (with tech, time and policies underneath) and score, so it fits a phone.
// Your own row is highlighted; when you're not in the top rows, your best rank shows below.
export function leaderboard(scr, mapId = scr.game.meta.data.map) {
  const me = scr.game.meta.data.playerName;
  const tabs = MAP_ORDER.map(
    (id, i) => `<button class="tab ${id === mapId ? 'selected' : ''}" data-map="${id}">${MAPS[id].name} <kbd>${i + 1}</kbd></button>`,
  ).join('');
  scr.show(
    `<div class="panel wide board">
      <h2>LEADERBOARD</h2>
      <p class="sub">Top ${LEADERBOARD.top} per map. Score = CSAT x the shift's policies. Tap a player for their profile.</p>
      <div class="board-maps">${tabs}</div>
      <button class="board-clean ${cleanOnly ? 'on' : ''}" data-clean aria-pressed="${cleanOnly}"><span class="switch"></span>No policies only <kbd>C</kbd></button>
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
  scr.root.querySelector('.board-maps .selected')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  scr.bind('.tab[data-map]', (i, el) => {
    sfx('click');
    scr.leaderboard(el.dataset.map);
  });
  scr.bind('[data-clean]', () => {
    cleanOnly = !cleanOnly;
    sfx('click');
    scr.leaderboard(mapId);
  });
  scr.bind('[data-act=back]', () => scr.title());
  const body = scr.root.querySelector('.board-body');
  const row = (r, rank, mine) => `<tr data-name="${esc(r.name)}"${mine ? ' class="me"' : ''}>
      <td class="rank">${rank ?? '—'}</td>
      <td class="player"><button class="name-link" data-name="${esc(r.name)}">${esc(r.name)}</button>${mine ? ' <b class="you">YOU</b>' : ''}
        <small>${esc(r.character)} · ${fmtTime(Number(r.seconds) || 0)}${r.won ? ' <b class="ok">✓</b>' : ''}</small></td>
      <td class="score">${Number(r.score ?? r.csat).toLocaleString()}${parseMods(r.mods).length ? `<small>${modsCell(r)}</small>` : ''}</td>
    </tr>`;
  const live = () => scr.root.querySelector('.board-body') === body; // false once the screen has changed
  topScores(mapId, cleanOnly).then(async (r) => {
    if (!live()) return;
    if (!r.ok) return (body.innerHTML = '<p class="board-msg">Couldn\'t reach the leaderboard. Check your connection and try again.</p>');
    const inTop = !!me && r.rows.some((x) => x.name === me);
    if (!r.rows.length) body.innerHTML = '<p class="board-msg">No scores on this map yet. Be the first.</p>';
    else
      body.innerHTML = `<table class="stats board-table">
        <tr class="head"><td>#</td><td>Player</td><td>Score</td></tr>
        ${r.rows.map((x, i) => row(x, i + 1, !!me && x.name === me)).join('')}
      </table>`;
    // Not in the top rows: look up this player's best on the map and add it under the table.
    if (me && !inTop) {
      const mine = await myRank(mapId, me, cleanOnly);
      if (!live() || !mine.ok || !mine.best) return wire();
      const table = body.querySelector('.board-table');
      const html = `<tr class="gap"><td colspan="3">⋯</td></tr>${row({ ...mine.best, name: me }, mine.rank, true)}`;
      if (table) table.insertAdjacentHTML('beforeend', html);
      else body.innerHTML = `<table class="stats board-table">${html}</table>`;
    }
    wire();
  });
  // The whole row opens the profile, so it's an easy tap target (the name stays a button
  // for keyboard and controller). Tapping the policy icons shows their names instead.
  function wire() {
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
  }
}
