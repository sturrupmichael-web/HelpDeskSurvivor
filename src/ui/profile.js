// Player profile: opened by tapping a name on the leaderboard (or "My profile" on the
// Account screen). Data comes from the player_profile function (supabase/profiles.sql).
// Everything in it was typed or saved by that player: escape before showing.

import { icon } from './icons.js';
import { fmtTime } from './hud.js';
import { playerProfile } from '../game/leaderboard.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { CHARACTERS } from '../../data/player.js';
import { MAPS, MAP_ORDER } from '../../data/maps.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const num = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString() : '—');

function body(p) {
  const since = new Date(p.since);
  const ch = Object.values(CHARACTERS).find((c) => c.name === p.favourite);
  const got = new Set(Array.isArray(p.achievements) ? p.achievements : []);
  const ach = ACHIEVEMENTS.filter((a) => got.has(a.id));
  const best = (Array.isArray(p.best) ? p.best : []).filter((b) => MAPS[b.map]).sort((a, b) => MAP_ORDER.indexOf(a.map) - MAP_ORDER.indexOf(b.map));
  return `
    <p class="sub">On the leaderboard since ${Number.isNaN(since.getTime()) ? '—' : since.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
    <div class="profile-top">
      ${p.favourite ? `<div class="title-char">${ch ? `<canvas data-spr="${ch.sprite}" width="64" height="64"></canvas>` : ''}
        <div><div class="tools-head">FAVOURITE TECHNICIAN</div><div class="card-name">${esc(p.favourite)}</div></div></div>` : ''}
      <table class="stats">
        <tr><td>Shifts worked</td><td>${num(p.shifts)}</td></tr>
        <tr><td>Scores posted</td><td>${num(p.posted)}</td></tr>
        <tr><td>Shifts survived (posted)</td><td>${num(p.wins)}</td></tr>
      </table>
    </div>
    <div class="section-head">BEST SHIFTS</div>
    ${best.length
      ? `<table class="stats profile-best">
          <tr class="head"><td>Map</td><td>Best score</td><td>Best clean</td><td>Longest</td></tr>
          ${best.map((b) => `<tr><td>${MAPS[b.map].name}</td><td>${num(b.score ?? b.csat)}</td><td>${b.clean === undefined ? num(b.csat) : b.clean === null ? '—' : num(b.clean)}</td><td>${fmtTime(Number(b.seconds) || 0)}${b.won ? ' <b class="ok">✓</b>' : ''}</td></tr>`).join('')}
        </table>`
      : '<p class="board-msg">No scores posted yet.</p>'}
    <div class="section-head">ACHIEVEMENTS · ${ach.length} / ${ACHIEVEMENTS.length}</div>
    ${ach.length
      ? `<div class="profile-ach">${ach.map((a) => `<span class="profile-badge" title="${a.desc}">${icon(a.icon, 20)}${a.name}</span>`).join('')}</div>`
      : `<p class="board-msg">${p.shifts == null ? 'Achievements show up once this player\'s progress is backed up.' : 'None unlocked yet.'}</p>`}`;
}

export function profileScreen(screens, name, back) {
  screens.show(
    `<div class="panel wide board profile">
      <h2>${esc(name)}</h2>
      <div class="profile-body"><p class="board-msg">Loading…</p></div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (code === 'Escape' || code === 'Enter') back();
      else return false;
    },
  );
  screens.bind('[data-act=back]', () => back());
  const el = screens.root.querySelector('.profile-body');
  playerProfile(name).then((r) => {
    if (screens.root.querySelector('.profile-body') !== el) return; // screen changed meanwhile
    if (!r.ok) el.innerHTML = '<p class="board-msg">Couldn\'t load this profile. Check your connection and try again.</p>';
    else if (!r.profile) el.innerHTML = '<p class="board-msg">No profile for this name. Its scores were posted before player accounts existed.</p>';
    else {
      el.innerHTML = body(r.profile);
      screens.drawThumbs();
    }
  });
}
