// Simulation tests in plain Node, no browser (src/game/headless.js): the game logic runs
// on its own, and the balance bot (tests/tools/bot.mjs) can play every map.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPilot, botPick, veteranSave } from './tools/bot.mjs';
import { MAPS } from '../data/maps.js';
import { CHARACTERS } from '../data/player.js';

export function simTests() {
  for (const map of Object.keys(MAPS)) {
    test(`node: ${map}: the bot plays the first 3 minutes without a browser`, async () => {
      const game = headlessGame(manifest, { pick: botPick, autopilot: botPilot });
      game.startShift(map);
      game.player.god = true;
      game.playShift(180);
      assert(game.time >= 180, `shift stopped at ${game.time.toFixed(0)} s`);
      assert(game.score.kills > 20, `only ${game.score.kills} users closed`);
      assert(game.player.level >= 2, `still level ${game.player.level}`);
    });
  }

  test('node: every tech can start a shift, and a lost shift reports a summary', async () => {
    const game = headlessGame(manifest, { pick: botPick, save: veteranSave() });
    for (const tech of Object.keys(CHARACTERS)) {
      game.startShift('office', tech);
      game.playShift(20);
      assert(game.player.def === CHARACTERS[tech], `${tech} did not start`);
    }
    const rookie = headlessGame(manifest); // no Union Rep from the shop to revive
    rookie.startShift('office');
    rookie.player.hp = 0;
    const r = rookie.playShift(5);
    assert(r && r.won === false && r.map === 'office', 'no summary after burnout: ' + JSON.stringify(r));
  });

  test('node: the 10:00 boss turns up on every map', async () => {
    const game = headlessGame(manifest, { pick: botPick, autopilot: botPilot, save: veteranSave() });
    for (const map of Object.keys(MAPS)) {
      game.startShift(map);
      game.player.god = true;
      game.time = 595;
      game.playShift(610);
      const boss = game.bossAlive() ? game.boss.def.sprite : game.achievements.run.bosses[0];
      assert(boss, `no boss on ${map} at 10:00`);
    }
  });
}
