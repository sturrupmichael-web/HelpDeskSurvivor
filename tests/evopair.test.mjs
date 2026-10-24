// Level-up cards flag an evolution pair: a tool card when you own its evolution passive,
// a new passive card when you own a tool it evolves. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPick, veteranSave } from './tools/bot.mjs';
import { EVOLUTIONS } from '../data/evolutions.js';
import { rollChoices } from '../src/game/upgrades.js';

// Every card that can show up in a few hundred rolls with this player.
function cards(g) {
  const seen = new Map();
  for (let i = 0; i < 400; i++) for (const c of rollChoices(g)) seen.set(c.kind + c.id, c);
  return seen;
}

export function evoPairTests() {
  test('evolution pair: badge only when you own the other half', () => {
    const g = headlessGame(manifest, { pick: botPick, save: veteranSave() });
    g.startShift('office', 'tier1');
    const p = g.player;
    const tool = p.weapons[0].id;
    const evo = EVOLUTIONS[tool];
    assert(evo, 'starter tool has no evolution: ' + tool);
    let c = cards(g);
    assert(!c.get('weapon' + tool)?.pair.length, 'tool card paired before owning the passive');
    const passive = c.get('passive' + evo.passive);
    assert(passive?.pair.length === 1 && passive.pair[0].name, 'new passive card not paired with the owned tool');
    assert(/completes the pair/.test(passive.hint), 'passive hint: ' + passive.hint);
    const other = [...c.values()].find((x) => x.kind === 'passive' && x.id !== evo.passive && !Object.entries(EVOLUTIONS).some(([f, v]) => f === tool && v.passive === x.id));
    assert(!other?.pair.length, 'an unrelated passive is paired: ' + other?.id);
    p.passives[evo.passive] = 1;
    c = cards(g);
    const t = c.get('weapon' + tool);
    assert(t?.pair.length === 1, 'tool card not paired once the passive is owned');
    assert(/You have/.test(t.hint), 'tool hint: ' + t.hint);
    assert(!c.get('passive' + evo.passive)?.pair.length, 'an owned passive should not be badged again');
  });
}
