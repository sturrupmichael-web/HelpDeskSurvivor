// Entry point: load sprite sheets, start input, sound and the game loop.

import { loadAssets } from './engine/assets.js';
import { initInput, pollGamepad } from './engine/input.js';
import { initAudio } from './engine/audio.js';
import { startLoop } from './engine/loop.js';
import { Game } from './game/game.js';

// Chrome/Android offer "install this app"; keep the offer for the title screen's button.
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.installPrompt = e;
  if (document.querySelector('.panel.title')) window.game.screens.title(); // show the button now
});

const assets = await loadAssets('sprites/out/');
const canvas = document.getElementById('game');
initInput(canvas);
// Browsers only start audio after a user gesture.
addEventListener('keydown', initAudio);
addEventListener('pointerdown', initAudio);
const game = new Game(canvas, assets);
startLoop(
  (dt) => game.update(dt),
  (dt) => {
    pollGamepad(dt);
    game.render(dt);
  },
);
window.game = game; // handy in the browser console

// Offline support for the installed app (sw.js). Not on dev.html, so code edits always
// show up straight away while developing.
if ('serviceWorker' in navigator && !location.pathname.endsWith('dev.html')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.getElementById('boot')?.remove();
