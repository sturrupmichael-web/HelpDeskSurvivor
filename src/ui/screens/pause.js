// pause: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

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
  const go = (act) => {
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
  scr.show(
    `<div class="panel">
      <h2>ON HOLD</h2>
      <p class="sub">${pickLine(PAUSE_LINES)}</p>
      ${policies}
      <button class="primary" data-act="resume">Resume <kbd>Esc</kbd></button>
      <button data-act="stats">Shift Stats <kbd>T</kbd></button>
      <button data-act="settings">Settings <kbd>O</kbd></button>
      <button data-act="bug">Report a Bug <kbd>B</kbd></button>
      <button data-act="restart">${training ? 'Restart Training' : 'Restart Shift'} <kbd>R</kbd></button>
      <button data-act="quit">${training ? 'Skip Training' : 'Quit to Title'} <kbd>Q</kbd></button>
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
  scr.bind('button', (i, el) => go(el.dataset.act));
}
