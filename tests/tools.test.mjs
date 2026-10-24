// Every tool hurts users: each base tool at every level, and each evolution, alone on a
// quiet floor with users standing around the tech and a few walking up to them. A tool
// that silently does nothing (a typo in its numbers, a broken behavior) fails here.
// Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, veteranSave } from './tools/bot.mjs';
import { WEAPONS } from '../data/weapons.js';
import { createWeapon, setWeaponLevel } from '../src/game/weapons/index.js';
import { spawnEnemy } from '../src/game/enemies.js';

function dummy(g, x, y, speed = 0) {
  const e = spawnEnemy(g, 'pam', g.player.x + x, g.player.y + y);
  e.hp = e.maxHp = 1e6;
  if (!speed) e.speed = 0;
  return e;
}

// Damage `id` at `level` does in 6 s of game time.
function damageOf(id, level) {
  const g = headlessGame(manifest, { save: veteranSave() });
  g.startShift('office', 'tier1');
  g.spawner.stopped = true;
  g.player.god = true;
  const w = createWeapon(id, 1);
  setWeaponLevel(w, level);
  g.player.weapons = [w];
  for (let i = 0; i < 12; i++) dummy(g, Math.cos(i) * (30 + i * 6), Math.sin(i) * (30 + i * 6));
  for (let i = 0; i < 4; i++) dummy(g, Math.cos(i * 1.6) * 150, Math.sin(i * 1.6) * 150, 1);
  for (let t = 0; t < 6 * 60; t++) g.update(1 / 60);
  return w.damageDone;
}

export function toolTests() {
  test('tools: every base tool damages users at every level', () => {
    const none = [];
    for (const [id, def] of Object.entries(WEAPONS)) {
      if (def.evolved) continue;
      for (let lvl = 1; lvl <= def.levels.length; lvl++) if (!(damageOf(id, lvl) > 0)) none.push(`${id} level ${lvl}`);
    }
    assert(!none.length, 'no damage from ' + none.join(', '));
  });

  test('tools: every evolution damages users', () => {
    const none = Object.entries(WEAPONS).filter(([id, def]) => def.evolved && !(damageOf(id, 1) > 0)).map(([id]) => id);
    assert(!none.length, 'no damage from ' + none.join(', '));
  });
}
