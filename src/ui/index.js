// The game's page UI: the SVG HUD, the HTML menus and the debug overlay. Passed to
// `new Game(canvas, assets, browserUi)`; src/game/headless.js has the stand-ins used when
// the game runs without a page.

import { conflictScreen } from './account.js';
import { Hud } from './hud.js';
import { Screens } from './screens.js';
import { Debug } from './debug.js';

export function browserUi(game) {
  return {
    hud: new Hud(document.getElementById('hud')),
    screens: new Screens(document.getElementById('overlay'), game),
    debug: new Debug(document.getElementById('debug'), game),
  };
}

// Hooks the page UI to the game once it exists: the HUD's pause button and the cloud
// save's prompts.
export function attachUi(game) {
  game.hud.onPause(() => {
    if (game.state === 'run') game.pause();
  });
  // Switching apps, a call or the notification shade: come back to the pause menu, not to
  // a shift that carries on the moment the page is visible again.
  const away = () => {
    if (game.state === 'run') game.pause();
  };
  document.addEventListener('visibilitychange', () => document.hidden && away());
  addEventListener('blur', away);
  // Both sides changed: ask on the next menu, never mid-shift.
  game.cloud.onConflict = (local, cloud, choose) => {
    const s = game.screens;
    s.pendingConflict = () => {
      s.pendingConflict = null;
      conflictScreen(s, local, cloud, choose);
    };
    if (s.root.querySelector('.panel.title')) s.title();
  };
  // The account's progress replaced this device's: refresh the title screen.
  game.cloud.onChange = () => {
    if (game.state !== 'title') return;
    game.setMap(game.meta.data.map);
    if (game.screens.root.querySelector('.panel.title')) game.screens.title();
  };
}
