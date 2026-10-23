// Solid cubicles on the Open Office (idea 51): the tech and users can't walk through a
// cubicle row, users find their way round one, boss bullets stop at it and pickups never
// land inside it. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPick } from './tools/bot.mjs';
import { spawnEnemy, updateEnemies, resolveEnemies } from '../src/game/enemies.js';
import { dropTicket } from '../src/game/pickups.js';

// A shift on `map` with nobody else on the floor, and the first cubicle row near the start.
function quietShift(map = 'office') {
  const g = headlessGame(manifest, { pick: botPick });
  g.startShift(map, 'tier1');
  g.spawner.stopped = true;
  g.enemies.clear();
  let row = null;
  for (let cy = 0; cy < 6 && !row; cy++) for (let cx = 0; cx < 6 && !row; cx++) row = g.floor.solidRects(cx, cy)[0] ?? null;
  return { g, row };
}

export function collisionTests() {
  test('collision: only the Open Office has solid cubicles', async () => {
    assert(quietShift('office').g.floor.solid, 'office not solid');
    assert(!quietShift('server').g.floor.solid, 'server room solid');
  });

  test('collision: the tech stops at a cubicle row and slides along it', async () => {
    const { g, row } = quietShift();
    const p = g.player;
    const mid = row[0] + row[2] / 2;
    p.x = mid;
    p.y = row[1] + row[3] + 20; // below the row
    g.autopilot = (game, axis) => ((axis.x = 0), (axis.y = -1)); // walk up into it
    for (let i = 0; i < 120; i++) g.update(1 / 60);
    assert(p.y + 10 >= row[1] + row[3] + 4, `walked into the row (feet at ${p.y + 10}, row bottom ${row[1] + row[3]})`);
    g.autopilot = (game, axis) => ((axis.x = 0.7), (axis.y = -0.7));
    const x0 = p.x;
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    assert(p.x > x0 + 10, 'no slide along the row');
  });

  test('collision: a user behind a row walks round it', async () => {
    const { g, row } = quietShift();
    const p = g.player;
    p.x = row[0] + row[2] / 2;
    p.y = row[1] + row[3] + 40; // below the row
    p.god = true;
    const e = spawnEnemy(g, 'pam', p.x, row[1] - 30); // straight above it
    let blockedAt = -1;
    for (let i = 0; i < 60 * 15 && blockedAt < 0; i++) {
      updateEnemies(g, 1 / 60);
      g.hash.build(g.enemies.items, g.enemies.count, p.x, p.y);
      resolveEnemies(g, 1 / 60);
      if (Math.hypot(e.x - p.x, e.y - p.y) < 20) blockedAt = i;
      assert(!g.floor.blocked(e.x, e.y + e.foot), 'user walked into the row');
    }
    assert(blockedAt >= 0, `user never got round the row (stuck at ${e.x.toFixed(0)}, ${e.y.toFixed(0)})`);
  });

  test('collision: boss bullets stop at a row, pickups land outside it', async () => {
    const { g, row } = quietShift();
    g.player.x = row[0] - 400;
    g.hazards.bullet(row[0] + 20, row[1] - 20, Math.PI / 2, 200, 5, 'hazard_phone');
    for (let i = 0; i < 30; i++) g.hazards.update(g, 1 / 60);
    assert(g.hazards.bullets.count === 0, 'bullet flew through the row');
    for (let i = 0; i < 20; i++) dropTicket(g, row[0] + 5 + i * 9, row[1] + 10, 1);
    for (let i = 0; i < g.tickets.count; i++) {
      const t = g.tickets.items[i];
      assert(!g.floor.blocked(t.x, t.y), `ticket inside the row at ${t.x}, ${t.y}`);
    }
  });
}
