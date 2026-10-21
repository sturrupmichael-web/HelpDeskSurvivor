// Level-up choices: rolls LEVEL_UP_CHOICES weighted options from what the player can still take
// (new weapons/passives while slots remain, level-ups for owned items).
// Also: Change Approved chests, which evolve a weapon when one qualifies (max level +
// its paired passive, see data/evolutions.js) and otherwise grant random upgrades.

import { WEAPONS } from '../../data/weapons.js';
import { PASSIVES, FALLBACK_REWARDS, LEVEL_UP_CHOICES } from '../../data/passives.js';
import { createWeapon, setWeaponLevel } from './weapons/index.js';
import { recomputeStats } from './player.js';
import { EVOLUTIONS } from '../../data/evolutions.js';
import { CHEST_REWARDS } from '../../data/pickups.js';

// Lucky Lanyard: the rarer cards (weight below RARE_WEIGHT) turn up more often.
const RARE_WEIGHT = 8;
const lucky = (weight, luck) => (weight < RARE_WEIGHT ? weight * luck : weight);
// Level-ups for things you already own are offered a bit more often than new items, so
// with 20 tools and 13 passives your build still comes together.
const OWNED_WEIGHT = 1.35;

// Hot Desking (policy) shows fewer cards and favours the rare ones (`rareCards`).
export function rollChoices(game, count = game.policy?.cards || LEVEL_UP_CHOICES) {
  const p = game.player;
  const luck = p.stats.luck * (game.policy?.rareCards ?? 1);
  const pool = [];
  const owned = new Set(p.weapons.map((w) => w.id));
  for (const w of p.weapons) {
    if (w.level < w.def.levels.length) pool.push({ kind: 'weapon', id: w.id, level: w.level + 1, weight: w.def.weight * OWNED_WEIGHT });
  }
  if (p.weapons.length < p.maxWeapons) {
    for (const [id, d] of Object.entries(WEAPONS)) {
      if (owned.has(id) || d.evolved || p.weapons.some((w) => w.def.from === id) || p.locked?.('tools', id)) continue;
      pool.push({ kind: 'weapon', id, level: 1, weight: lucky(d.weight, luck) });
    }
  }
  const passiveCount = Object.keys(p.passives).length;
  for (const [id, d] of Object.entries(PASSIVES)) {
    const lvl = p.passives[id] ?? 0;
    if (lvl >= d.maxLevel) continue;
    if (lvl === 0 && (passiveCount >= p.maxPassives || p.locked?.('passives', id))) continue;
    pool.push({ kind: 'passive', id, level: lvl + 1, weight: lucky(d.weight, luck) * (lvl ? OWNED_WEIGHT : 1) });
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
  return picks.map((c) => describe(c, p));
}

// An evolution this shift can reach (unlocked on this save, and no Change Freeze).
const canEvolve = (p, evo) => evo && !p?.noEvolve && !p?.locked?.('evolutions', evo.into);

// Adds display fields (name, icon, text) to a choice.
function describe(c, p) {
  if (c.kind === 'weapon') {
    const d = WEAPONS[c.id];
    const evo = EVOLUTIONS[c.id];
    const hint = canEvolve(p, evo) && `Evolves at max level with ${PASSIVES[evo.passive].name} into ${WEAPONS[evo.into].name}.`;
    return { ...c, name: d.name, icon: d.icon, text: c.level === 1 ? d.desc : d.notes[c.level - 1], flavor: d.flavor, maxLevel: d.levels.length, hint };
  }
  if (c.kind === 'passive') {
    const d = PASSIVES[c.id];
    const evos = Object.entries(EVOLUTIONS).filter(([, v]) => v.passive === c.id && canEvolve(p, v));
    const hint = evos.length ? `Pairs with ${evos.map(([from, v]) => `${WEAPONS[from].name} (into ${WEAPONS[v.into].name})`).join(' and ')} to evolve it.` : undefined;
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
    if (PASSIVES[c.id].revives) p.warranty += PASSIVES[c.id].revives; // Extended Warranty
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
    if (canEvolve(p, evo) && w.level >= w.def.levels.length && p.passives[evo.passive]) return { weapon: w, into: evo.into };
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
  // Lucky Lanyard makes the bigger chest rewards more likely.
  const weight = (r) => (r.upgrades > 1 ? r.weight * p.stats.luck : r.weight);
  let total = 0;
  for (const r of CHEST_REWARDS) total += weight(r);
  let roll = Math.random() * total;
  let n = CHEST_REWARDS[0].upgrades;
  for (const r of CHEST_REWARDS) if ((roll -= weight(r)) <= 0) {
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
