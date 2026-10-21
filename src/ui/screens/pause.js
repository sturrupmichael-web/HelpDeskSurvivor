// pause: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { sfx } from '../../engine/audio.js';
import { bugScreen } from '../bugreport.js';
import { recordWiki } from '../../game/wiki.js';
import { PAUSE_LINES } from '../../../data/flavor.js';
import { pickLine } from './common.js';
import { POLICIES } from '../../../data/policies.js';
import { fmtMult } from '../../game/policies.js';

export function pause(scr) {
  const training = !!scr.game.tutorial;
  const pol = scr.game.policy;
  const policies = pol.ids.length
    ? `<p class="tiny pause-policies">Policies (${fmtMult(pol.mult)}): ${pol.ids.map((id) => `<b>${POLICIES[id].name}</b>`).join(', ')}</p>`
    : '';
  // Restart and Quit throw the shift away, so outside training they need a second press.
  let armed = null;
  let disarm = 0;
  const confirm = (act) => {
    if (training || armed === act) return true;
    clearTimeout(disarm);
    for (const b of scr.root.querySelectorAll('.confirm')) b.classList.remove('armed'), (b.innerHTML = b.dataset.label);
    armed = act;
    const b = scr.root.querySelector(`[data-act=${act}]`);
    b.classList.add('armed');
    b.innerHTML = `${act === 'restart' ? 'Restart' : 'Quit'}? This shift's pay is lost. ${matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Press'} again to confirm <kbd>${act === 'restart' ? 'R' : 'Q'}</kbd>`;
    sfx('hurt');
    disarm = setTimeout(() => {
      if (!b.isConnected) return;
      armed = null;
      b.classList.remove('armed');
      b.innerHTML = b.dataset.label;
    }, 3000);
    return false;
  };
  const go = (act) => {
    if ((act === 'restart' || act === 'quit') && !confirm(act)) return;
    clearTimeout(disarm);
    if (act === 'resume') scr.game.resume();
    else if (act === 'restart') {
      recordWiki(scr.game);
      if (scr.game.tutorial) scr.game.startTutorial();
      else scr.game.newRun();
    } else if (act === 'quit') {
      recordWiki(scr.game);
      scr.game.newRun();
      scr.game.setState('title');
      scr.title();
    } else if (act === 'stats') scr.stats();
    else if (act === 'settings') scr.settings(() => scr.pause());
    else if (act === 'bug') bugScreen(scr, 'pause', () => scr.pause());
  };
  const restartLabel = `${training ? 'Restart Training' : 'Restart Shift'} <kbd>R</kbd>`;
  const quitLabel = `${training ? 'Skip Training' : 'Quit to Title'} <kbd>Q</kbd>`;
  scr.show(
    `<div class="panel">
      <h2>ON HOLD</h2>
      <p class="sub">${pickLine(PAUSE_LINES)}</p>
      ${policies}
      <button class="primary" data-act="resume">Resume <kbd>Esc</kbd></button>
      <button data-act="stats">Shift Stats <kbd>T</kbd></button>
      <button data-act="settings">Settings <kbd>O</kbd></button>
      <button data-act="bug">Report a Bug <kbd>B</kbd></button>
      <div class="pause-danger">
        <button class="confirm" data-act="restart">${restartLabel}</button>
        <button class="confirm" data-act="quit">${quitLabel}</button>
      </div>
      <p class="tiny"><kbd>M</kbd> mute / unmute sound</p>
    </div>`,
    (code) => {
      if (code === 'Escape' || code === 'KeyP') go('resume');
      else if (code === 'KeyR') go('restart');
      else if (code === 'KeyQ') go('quit');
      else if (code === 'KeyT') go('stats');
      else if (code === 'KeyO') go('settings');
      else if (code === 'KeyB') go('bug');
      else return false;
    },
  );
  for (const b of scr.root.querySelectorAll('.confirm')) b.dataset.label = b.innerHTML;
  scr.bind('button', (i, el) => go(el.dataset.act));
}
