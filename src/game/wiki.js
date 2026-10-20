// Help Desk Wiki: which users, bosses, tools and passives you've met, kept in the save
// (meta.data.wiki). An entry unlocks the first time you close that user, face that boss,
// or carry that tool or passive at the end of a shift.

import { ENEMIES } from '../../data/enemies.js';
import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES } from '../../data/passives.js';
import { CHARACTERS } from '../../data/player.js';

// Achievements earned before the wiki existed, and the entries they prove you've seen.
const BACKFILL = {
  incident: ['incident'],
  win: ['executive'],
  boss_ratsnest: ['ratsnest'],
  boss_caller: ['caller'],
  boss_janitor: ['janitor'],
  steve: ['steve'],
};

const SPRITE_TO_ENEMY = {};
for (const [id, d] of Object.entries(ENEMIES)) SPRITE_TO_ENEMY[d.sprite] ??= id;

// The save's wiki record, created (and filled from older progress) on first use.
export function wikiData(meta) {
  const d = meta.data;
  if (!d.wiki) {
    const w = { closed: {}, met: [], tools: [], passives: [] };
    for (const [ach, ids] of Object.entries(BACKFILL)) if (d.achievements?.[ach]) w.met.push(...ids);
    for (const c of d.unlocked) if (CHARACTERS[c]) w.tools.push(CHARACTERS[c].starter);
    w.met = [...new Set(w.met)];
    w.tools = [...new Set(w.tools)];
    d.wiki = w;
  }
  return d.wiki;
}

export function isKnown(w, kind, id) {
  if (kind === 'enemy') return (w.closed[id] ?? 0) > 0 || w.met.includes(id);
  if (kind === 'tool') return w.tools.includes(id);
  return w.passives.includes(id);
}

// Folds this shift into the wiki: users closed, bosses faced, tools and passives carried.
// Safe to call more than once per shift. Returns the names of newly unlocked entries.
export function recordWiki(game) {
  const run = game.achievements.run;
  if (run.wikiDone) return [];
  run.wikiDone = true;
  const w = wikiData(game.meta);
  const fresh = [];
  const add = (list, id, name) => {
    if (list.includes(id)) return;
    list.push(id);
    fresh.push(name);
  };
  for (const spr of run.bossesMet ?? []) {
    const id = SPRITE_TO_ENEMY[spr];
    if (!id || w.met.includes(id)) continue;
    if (!isKnown(w, 'enemy', id)) fresh.push(ENEMIES[id].name);
    w.met.push(id);
  }
  for (const [spr, n] of Object.entries(run.killsById)) {
    const id = SPRITE_TO_ENEMY[spr];
    if (!id) continue;
    if (!isKnown(w, 'enemy', id)) fresh.push(ENEMIES[id].name);
    w.closed[id] = (w.closed[id] ?? 0) + n;
  }
  const p = game.player;
  for (const wpn of p.weapons) {
    if (wpn.def.from) add(w.tools, wpn.def.from, WEAPONS[wpn.def.from].name);
    add(w.tools, wpn.id, wpn.def.name);
  }
  for (const id of Object.keys(p.passives)) add(w.passives, id, PASSIVES[id].name);
  game.meta.save();
  return fresh;
}
