// Level-up choices: rolls 3 weighted options from what the player can still take
// (new weapons/passives while slots remain, level-ups for owned items).
// Also: Change Approved chests, which evolve a weapon when one qualifies (max level +
// its paired passive, see data/evolutions.js) and otherwise grant random upgrades.

import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES, FALLBACK_REWARDS, MAX_WEAPONS, MAX_PASSIVES } from '../../data/passives.js';
import { createWeapon, setWeaponLevel } from './weapons/index.js';
import { recomputeStats } from './player.js';
import { EVOLUTIONS } from '../../data/evolutions.js';
import { CHEST_REWARDS } from '../../data/pickups.js';

export function rollChoices(game, count = 3) {
  const p = game.player;
  const pool = [];
  const owned = new Set(p.weapons.map((w) => w.id));
  for (const w of p.weapons) {
    if (w.level < w.def.levels.length) pool.push({ kind: 'weapon', id: w.id, level: w.level + 1, weight: w.def.weight });
  }
  if (p.weapons.length < MAX_WEAPONS) {
    for (const [id, d] of Object.entries(WEAPONS)) {
      if (owned.has(id) || d.evolved || p.weapons.some((w) => w.def.from === id)) continue;
      pool.push({ kind: 'weapon', id, level: 1, weight: d.weight });
    }
  }
  const passiveCount = Object.keys(p.passives).length;
  for (const [id, d] of Object.entries(PASSIVES)) {
    const lvl = p.passives[id] ?? 0;
    if (lvl >= d.maxLevel) continue;
    if (lvl === 0 && passiveCount >= MAX_PASSIVES) continue;
    pool.push({ kind: 'passive', id, level: lvl + 1, weight: d.weight });
  }

  const picks = [];
  while (picks.length < count && pool.length) {
    const total = pool.reduce((s, o) => s + o.weight, 0);
    let roll = Math.random() * total;
    let i = 0;
    while ((roll -= pool[i].weight) > 0) i++;
    picks.push(pool.splice(i, 1)[0]);
  }
  if (!picks.length) picks.push({ kind: 'reward', id: 'pizza', level: 0 });
  return picks.map(describe);
}

// Adds display fields (name, icon, text) to a choice.
function describe(c) {
  if (c.kind === 'weapon') {
    const d = WEAPONS[c.id];
    const evo = EVOLUTIONS[c.id];
    const hint = evo && `Evolves at max level with ${PASSIVES[evo.passive].name} into ${WEAPONS[evo.into].name}.`;
    return { ...c, name: d.name, icon: d.icon, text: c.level === 1 ? d.desc : d.notes[c.level - 1], flavor: d.flavor, maxLevel: d.levels.length, hint };
  }
  if (c.kind === 'passive') {
    const d = PASSIVES[c.id];
    const evo = Object.entries(EVOLUTIONS).find(([, v]) => v.passive === c.id);
    const hint = evo && `Pairs with ${WEAPONS[evo[0]].name} to evolve it into ${WEAPONS[evo[1].into].name}.`;
    return { ...c, name: d.name, icon: d.icon, text: d.desc, flavor: d.flavor, maxLevel: d.maxLevel, hint };
  }
  const d = FALLBACK_REWARDS[c.id];
  return { ...c, name: d.name, icon: d.icon, text: d.desc, flavor: d.flavor };
}

export function applyChoice(game, c) {
  const p = game.player;
  if (c.kind === 'weapon') {
    const w = p.weapons.find((x) => x.id === c.id);
    if (w) setWeaponLevel(w, c.level);
    else p.weapons.push(createWeapon(c.id, p.weapons.length));
  } else if (c.kind === 'passive') {
    p.passives[c.id] = c.level;
    recomputeStats(p);
  } else if (c.kind === 'reward') {
    game.achievements.run.pizzas++;
    p.hp = Math.min(p.maxHp, p.hp + FALLBACK_REWARDS[c.id].heal);
  }
}

// The first owned weapon that can evolve right now, or null.
export function findEvolution(p) {
  for (const w of p.weapons) {
    const evo = EVOLUTIONS[w.id];
    if (evo && w.level >= w.def.levels.length && p.passives[evo.passive]) return { weapon: w, into: evo.into };
  }
  return null;
}

// Opens a chest: evolves a weapon if possible, otherwise applies 1-3 random upgrades.
// Returns what happened, for the chest screen: { evolved?: {from, to}, upgrades: [choice] }.
export function openChest(game) {
  const p = game.player;
  const evo = findEvolution(p);
  if (evo) {
    const old = evo.weapon;
    const i = p.weapons.indexOf(old);
    const w = createWeapon(evo.into, old.slot);
    w.damageDone = old.damageDone;
    p.weapons[i] = w;
    return { evolved: { from: old.def, to: w.def }, upgrades: [] };
  }
  let total = 0;
  for (const r of CHEST_REWARDS) total += r.weight;
  let roll = Math.random() * total;
  let n = CHEST_REWARDS[0].upgrades;
  for (const r of CHEST_REWARDS) if ((roll -= r.weight) <= 0) {
    n = r.upgrades;
    break;
  }
  const upgrades = [];
  for (let k = 0; k < n; k++) {
    const c = rollChoices(game, 1)[0];
    applyChoice(game, c);
    upgrades.push(c);
  }
  return { upgrades };
}
