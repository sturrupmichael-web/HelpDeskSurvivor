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

  // Each boss's second phase (src/game/behaviors/phase2.js): knock it down below the
  // line, then watch for its new attack.
  const SECOND_PHASE = {
    incident: (e) => e.ai.state === 3, // spiral
    ratsnest: (e, g) => g.hazards.bombs.count > 0, // sparks down the cables
    caller: (e) => e.ai.lastAttack === 'transfer',
    janitor: (e) => e.ai.state === 5 || e.ai.recharged, // spin-out or double charge
    takeover: (e) => e.ai.cross, // Reorg
    executive: (e) => e.ai.lastAttack === 'calendar',
  };
  test('node: every boss has a second phase with a new attack', async () => {
    const game = headlessGame(manifest, { pick: botPick, save: veteranSave() });
    const fights = [...Object.keys(MAPS).map((m) => [m, 600]), ['office', 1200]];
    for (const [map, at] of fights) {
      game.startShift(map);
      game.player.god = true;
      game.player.weapons.length = 0;
      game.time = at - 2;
      game.playShift(at + 1);
      assert(game.bossAlive(), `no boss on ${map} at ${at} s`);
      const id = game.boss.def.sprite;
      let used = false;
      for (let t = 0; t < 30 * 60 && !used; t++) {
        for (const [e] of game.bossParts) if (!e.dead) e.hp = Math.max(1, Math.min(e.hp, e.maxHp * 0.2));
        game.update(1 / 60);
        for (const [e] of game.bossParts) if (!e.dead && e.def.sprite === id && SECOND_PHASE[id]?.(e, game)) used = true;
        if (!game.bossAlive()) break;
      }
      assert(game.bossPhase2, `${id}: never reached its second phase`);
      assert(used, `${id}: second-phase attack never seen in 30 s`);
    }
  });
}
