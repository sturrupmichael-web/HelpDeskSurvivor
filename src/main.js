// Entry point: load sprite sheets, start input, sound and the game loop.

import { loadAssets } from './engine/assets.js';
import { initInput, pollGamepad } from './engine/input.js';
import { initAudio } from './engine/audio.js';
import { startLoop } from './engine/loop.js';
import { Game } from './game/game.js';

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
document.getElementById('boot')?.remove();
