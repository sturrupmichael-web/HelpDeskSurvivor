// Entry point: load sprite sheets, start input, sound and the game loop.

import { loadAssets } from './engine/assets.js';
import { initInput, pollGamepad } from './engine/input.js';
import { initAudio } from './engine/audio.js';
import { startLoop } from './engine/loop.js';
import { Game } from './game/game.js';
import { account } from './game/account.js';
import { VERSION } from './version.js';
import { watchErrors } from './ui/bugreport.js';

watchErrors(); // so a bug report can include errors from startup on

// Chrome/Android offer "install this app"; keep the offer for the title screen's button.
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.installPrompt = e;
  if (document.querySelector('.panel.title')) window.game.screens.title(); // show the button now
});

// Coming back from Google sign-in: pick up the account before anything else.
const signIn = await account.init().catch(() => null);
if (signIn === 'redirect') await new Promise(() => {}); // off to Google again
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
console.info('Helpdesk Survivors version', VERSION);
if (signIn === 'linked' || signIn === 'signed-in') game.hud.toast({ icon: 'key', label: 'SIGNED IN WITH GOOGLE', name: account.user.email || 'Your progress now follows you' });
else if (signIn === 'error') game.hud.toast({ icon: 'key', label: "GOOGLE SIGN-IN DIDN'T FINISH", name: 'See the Account screen (U)' });
game.cloud.sync();

// Offline support for the installed app (sw.js). Not on dev.html, so code edits always
// show up straight away while developing.
if ('serviceWorker' in navigator && !location.pathname.endsWith('dev.html')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.getElementById('boot')?.remove();
