// Runs the game without a page: no canvas, no HUD, no menus, no sound. For tests and
// balance bots in Node (tests/sim.test.mjs, tests/tools/bot.mjs), many times faster than
// real time. Nothing here is part of the published game.
//
//   const game = headlessGame(manifest, { pick, autopilot, save });
//   game.startShift('office', 'tier1');
//   const result = game.playShift(); // the shift summary, as the game-over screen gets it
//
// `manifest` is sprites/out/manifest.json (sizes and animations; no images are loaded).
// `pick(game, choices)` chooses a level-up card (default: the first), `autopilot(game,
// axis)` steers by setting axis.x / axis.y (default: stand still), `save` replaces the
// fresh save (for example, everything unlocked).

import { Game } from './game.js';
import { assetsWithoutImages } from '../engine/assets.js';

const STEP = 1 / 60;
const noop = () => {};

// Stand-ins for the HUD, menus and debug overlay (src/ui/index.js has the real ones).
function headlessUi(game, pick) {
  const hud = new Proxy({}, { get: () => noop });
  const screens = {
    root: { querySelector: () => null },
    levelUp: (choices, tip, reroll, rerolls, done) => done(pick(game, choices)),
    chest: (result, done) => done(),
    gameOver: (summary) => (game.lastShift = summary),
    onKey: () => false,
    title: noop,
    hide: noop,
    pause: noop,
    trainingDone: noop,
  };
  const debug = { on: false, allowed: false, frame: noop, toggle: noop, hotkey: noop };
  return { hud, screens, debug };
}

export function headlessGame(manifest, { pick = (g, choices) => choices[0], autopilot = null, save = null } = {}) {
  const game = new Game(null, assetsWithoutImages(manifest), (g) => headlessUi(g, pick));
  if (save) game.meta.replace(save);
  game.autopilot = autopilot;

  // Starts a shift on `map` with technician `character` (ids from data/maps.js and
  // data/player.js; locked ones are allowed).
  game.startShift = (map = 'office', character = game.meta.data.selected) => {
    game.meta.data.map = map;
    game.setMap(map);
    game.lastShift = null;
    game.newRun(character);
  };

  // Steps the shift until it ends or `maxTime` seconds of game time pass. Returns the
  // shift summary, or null if it was still going.
  game.playShift = (maxTime = Infinity) => {
    while (game.state !== 'over' && game.time < maxTime) game.update(STEP);
    return game.lastShift;
  };
  return game;
}
