// Help Desk Wiki screen: a codex of users, bosses, tools and passives that fills in as
// you meet them (records in src/game/wiki.js). Unknown entries show as a dark
// silhouette or a "???" card.

import { icon } from './icons.js';
import { sfx } from '../engine/audio.js';
import { ENEMIES } from '../../data/enemies.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { EVOLUTIONS } from '../../data/evolutions.js';
import { MAPS, MAP_ORDER } from '../../data/maps.js';
import { wikiData, isKnown } from '../game/wiki.js';

export const WIKI_TABS = [
  { id: 'users', name: 'Users' },
  { id: 'bosses', name: 'Bosses' },
  { id: 'tools', name: 'Tools' },
  { id: 'passives', name: 'Passives' },
];

const KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };

const USERS = Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss && !ENEMIES[id].wikiAs);
const BOSSES = Object.keys(ENEMIES).filter((id) => ENEMIES[id].boss && !ENEMIES[id].params?.isSmall);
const TOOLS = Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved);
const EVOLVED = Object.keys(WEAPONS).filter((id) => WEAPONS[id].evolved);
const ALL_TOOLS = TOOLS.flatMap((id) => [id, ...EVOLVED.filter((e) => WEAPONS[e].from === id)]);

const name = (id) => ENEMIES[id].name;

// Short field notes worked out from the user's data.
function userNotes(d) {
  const notes = [];
  if (d.onDeath) notes.push(d.onDeath.count === 1 ? `Comes back as ${name(d.onDeath.spawn)} when closed.` : `Splits into ${d.onDeath.count} ${name(d.onDeath.spawn)}s when closed.`);
  if (d.behavior === 'pair') notes.push('Always in pairs. Close one and the other gets faster and angrier.');
  if (d.behavior === 'tailgate') notes.push('Slows you down while she is close behind you.');
  if (d.loot) notes.push('Never moves. Always drops a pickup.');
  if (d.behavior === 'summoner') notes.push(`Keeps its distance and summons ${name(d.params.minion)}.`);
  if (d.behavior === 'dart') notes.push('Dashes at you every few seconds.');
  if (d.behavior === 'teleport') notes.push('Teleports next to you.');
  if (d.behavior === 'dropper') notes.push('Leaves paper jams that slow you down.');
  if (d.behavior === 'aura') notes.push('Speeds up the users around it.');
  if (d.explode) notes.push('Bumps into you once, then is gone.');
  if (d.resist) for (const [tag, m] of Object.entries(d.resist)) notes.push(`Takes ${Math.round(m * 100)}% damage from ${tag} tools.`);
  if (d.drops?.chest) notes.push('Sometimes drops a Change Approved.');
  return notes;
}

function bossWhere(id) {
  if (ENEMIES[id].final) return 'Every map at 20:00';
  const maps = MAP_ORDER.filter((m) => (MAPS[m].boss?.boss ?? 'incident') === id).map((m) => MAPS[m].name);
  return `${maps.join(', ')} at 10:00`;
}

function enemyCard(w, id, boss) {
  const d = ENEMIES[id];
  const known = isKnown(w, 'enemy', id);
  const size = 64;
  const thumb = `<canvas class="wiki-thumb" data-wiki-spr="${d.sprite}" ${known ? '' : 'data-dark="1"'} width="${size}" height="${size}"></canvas>`;
  if (!known) return `<div class="wiki-entry locked">${thumb}<div><b>???</b><span>${boss ? `Shows up: ${bossWhere(id)}.` : 'Not met yet.'}</span></div></div>`;
  const closed = w.closed[id] ?? 0;
  const facts = boss
    ? [`Shows up: ${bossWhere(id)}`, `${d.hp.toLocaleString()} HP`, closed ? `Closed ${closed.toLocaleString()}x` : 'Not closed yet']
    : [`${d.hp} HP`, `Speed ${d.speed}`, `Closed ${closed.toLocaleString()}`];
  const notes = boss ? [] : userNotes(d);
  return `<div class="wiki-entry">${thumb}<div><b>${d.name}</b>
    ${d.flavor ? `<i>${d.flavor}</i>` : ''}
    ${notes.map((n) => `<span>${n}</span>`).join('')}
    <span class="wiki-facts">${facts.join(' · ')}</span></div></div>`;
}

function toolCard(w, id) {
  const d = WEAPONS[id];
  const known = isKnown(w, 'tool', id);
  if (d.evolved) {
    const base = WEAPONS[d.from];
    const passive = PASSIVES[EVOLUTIONS[d.from].passive];
    if (!known) {
      const hint = isKnown(w, 'tool', d.from) ? `Evolves from ${base.name}. Max it out and bring the right passive.` : 'An evolved tool.';
      return `<div class="wiki-entry locked evolved">${icon(d.icon, 32)}<div><b>???</b><span>${hint}</span></div></div>`;
    }
    return `<div class="wiki-entry evolved">${icon(d.icon, 32)}<div><b>${d.name}</b><i>${d.flavor ?? ''}</i><span>${d.desc}</span>
      <span class="wiki-facts">Evolved: ${base.name} at max level + ${passive.name}</span></div></div>`;
  }
  if (!known) return `<div class="wiki-entry locked">${icon(d.icon, 32)}<div><b>???</b><span>Not used yet.</span></div></div>`;
  const evo = EVOLUTIONS[id];
  const into = evo && WEAPONS[evo.into];
  const evoLine = evo
    ? `<span class="wiki-facts">Evolves with ${PASSIVES[evo.passive].name} into ${isKnown(w, 'tool', evo.into) ? into.name : '???'}</span>`
    : '';
  return `<div class="wiki-entry">${icon(d.icon, 32)}<div><b>${d.name}</b><i>${d.flavor ?? ''}</i><span>${d.desc}</span>${evoLine}</div></div>`;
}

function passiveCard(w, id) {
  const d = PASSIVES[id];
  if (!isKnown(w, 'passive', id)) return `<div class="wiki-entry locked">${icon(d.icon, 32)}<div><b>???</b><span>Not picked yet.</span></div></div>`;
  const evolves = Object.entries(EVOLUTIONS)
    .filter(([, e]) => e.passive === id)
    .map(([t]) => WEAPONS[t].name);
  return `<div class="wiki-entry">${icon(d.icon, 32)}<div><b>${d.name}</b><i>${d.flavor ?? ''}</i><span>${d.desc}</span>
    ${evolves.length ? `<span class="wiki-facts">Evolves: ${evolves.join(', ')}</span>` : ''}</div></div>`;
}

const SECTIONS = {
  users: { ids: USERS, kind: 'enemy', card: (w, id) => enemyCard(w, id, false) },
  bosses: { ids: BOSSES, kind: 'enemy', card: (w, id) => enemyCard(w, id, true) },
  tools: { ids: ALL_TOOLS, kind: 'tool', card: toolCard },
  passives: { ids: Object.keys(PASSIVES), kind: 'passive', card: passiveCard },
};

// Entries found / total, across every tab.
export function wikiProgress(meta) {
  const w = wikiData(meta);
  let found = 0;
  let total = 0;
  for (const s of Object.values(SECTIONS)) {
    total += s.ids.length;
    found += s.ids.filter((id) => isKnown(w, s.kind, id)).length;
  }
  return { found, total };
}

// Draws each sprite thumbnail scaled to fit, as a dark silhouette when not met yet.
function drawThumbs(root, assets) {
  root.querySelectorAll('canvas[data-wiki-spr]').forEach((c) => {
    const spr = assets.sprite(c.dataset.wikiSpr);
    const f = spr.anims.walk.frames[0];
    const s = Math.max(1, Math.floor(Math.min(c.width / spr.w, c.height / spr.h)));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(spr.image, f[0], f[1], spr.w, spr.h, (c.width - spr.w * s) / 2, (c.height - spr.h * s) / 2, spr.w * s, spr.h * s);
    if (c.dataset.dark) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#333c57';
      g.fillRect(0, 0, c.width, c.height);
    }
  });
}

export function wikiScreen(screens, tab = 'users', back = () => screens.title()) {
  const game = screens.game;
  const w = wikiData(game.meta);
  const sec = SECTIONS[tab];
  const found = sec.ids.filter((id) => isKnown(w, sec.kind, id)).length;
  const all = wikiProgress(game.meta);
  const go = (t) => {
    sfx('click');
    wikiScreen(screens, t, back);
  };
  const tabs = WIKI_TABS.map(
    (t, i) => `<button class="tab ${t.id === tab ? 'selected' : ''}" data-tab="${t.id}">${t.name} <kbd>${i + 1}</kbd></button>`,
  ).join('');
  screens.show(
    `<div class="panel wide board wiki">
      <h2>HELP DESK WIKI</h2>
      <p class="sub">${all.found} of ${all.total} articles written. New ones appear as you meet users and use tools.</p>
      <div class="tabs">${tabs}</div>
      <div class="section-head">${WIKI_TABS.find((t) => t.id === tab).name.toUpperCase()} · ${found} / ${sec.ids.length}</div>
      <div class="wiki-grid">${sec.ids.map((id) => sec.card(w, id)).join('')}</div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (KEYS[code] !== undefined) go(WIKI_TABS[KEYS[code]].id);
      else if (code === 'Escape' || code === 'Enter') back();
      else return false;
    },
  );
  screens.bind('.tab', (i, el) => go(el.dataset.tab));
  screens.bind('[data-act=back]', () => back());
  drawThumbs(screens.root, game.assets);
}
