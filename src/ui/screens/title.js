// title: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { CHARACTERS } from '../../../data/player.js';
import { ACHIEVEMENTS } from '../../../data/achievements.js';
import { DEBUG_ALLOWED } from '../debug.js';
import { accountScreen } from '../account.js';
import { newsScreen, newsPending } from '../news.js';
import { bugScreen } from '../bugreport.js';
import { VERSION, PREVIEW } from '../../version.js';
import { account } from '../../game/account.js';
import { wikiScreen, wikiProgress } from '../wiki.js';
import { TITLE_TAGLINES } from '../../../data/flavor.js';
import { pickLine, PAY } from './common.js';
import { icon } from '../icons.js';

export function title(scr) {
  if (scr.pendingConflict) return scr.pendingConflict();
  if (newsPending(scr.game.meta)) return newsScreen(scr, () => scr.title());
  const m = scr.game.meta.data;
  const ch = CHARACTERS[m.selected];
  const wiki = wikiProgress(scr.game.meta);
  const go = (act) => {
    sfx('click');
    if (act === 'start') {
      // Brand-new players get offered the training shift once.
      if (!m.trained && !m.shifts && !m.offeredTraining) scr.trainingOffer();
      else scr.clockIn();
    } else if (act === 'training') scr.game.startTutorial();
    else if (act === 'chars') scr.characters();
    else if (act === 'shop') scr.shop();
    else if (act === 'ach') scr.achievementsScreen();
    else if (act === 'settings') scr.settings(() => scr.title());
    else if (act === 'maps') scr.maps();
    else if (act === 'board') scr.leaderboard();
    else if (act === 'wiki') wikiScreen(scr);
    else if (act === 'account') accountScreen(scr);
    else if (act === 'news') newsScreen(scr, () => scr.title(), true);
    else if (act === 'bug') bugScreen(scr, 'title', () => scr.title());
    else if (act === 'install') {
      window.installPrompt?.prompt();
      window.installPrompt = null;
      scr.title();
    }
  };
  // Clock In, then four tiles for the places players go between shifts, then a small row
  // for the rest. Map and Characters live in the Clock In picker now; L and C still open
  // their screens from a keyboard.
  const tile = (act, ic, label, extra, key) =>
    `<button class="tile" data-act="${act}">${icon(ic, 28)}<span>${label}</span>${extra ? `<small>${extra}</small>` : ''}<kbd>${key}</kbd></button>`;
  const best = m.best;
  scr.show(
    `<div class="panel title">
      ${PREVIEW ? '<p class="preview-banner">PREVIEW BUILD · not the live game yet</p>' : ''}
      <div class="title-head">
        <h1>HELPDESK<br>SURVIVORS</h1>
        <p class="sub">${pickLine(TITLE_TAGLINES)}</p>
        <div class="title-char"><canvas data-spr="${ch.sprite}" width="64" height="64"></canvas>
          <div><div class="card-name">${ch.name}</div><div class="card-flavor">${ch.perk}</div></div></div>
        <button class="primary clock-in" data-act="start">Clock In <kbd>Enter</kbd></button>
      </div>
      <div class="title-menu">
        <div class="tiles">
          ${tile('shop', 'laptop', 'Overtime Shop', PAY(m.pay), 'S')}
          ${tile('board', 'escalate', 'Leaderboard', 'Top 10 per map', 'B')}
          ${tile('wiki', 'book', 'Knowledge Base', `${wiki.found}/${wiki.total}`, 'K')}
          ${tile('ach', 'cert', 'Achievements', `${Object.keys(m.achievements ?? {}).length}/${ACHIEVEMENTS.length}`, 'A')}
        </div>
        <div class="title-small">
          <button data-act="training">Training <kbd>T</kbd></button>
          <button data-act="account">${!account.user ? 'Account' : account.user.guest ? 'Account: Guest' : 'Account: Google'} <kbd>U</kbd></button>
          <button data-act="settings">Settings <kbd>O</kbd></button>
          <button data-act="bug">Report a Bug</button>
          ${window.installPrompt ? '<button data-act="install">Install App</button>' : ''}
        </div>
        <p class="title-records">${
          m.shifts
            ? `Best shift ${fmtTime(best.time)} · ${best.tickets.toLocaleString()} tickets · CSAT ${best.csat.toLocaleString()} · ${m.wins} of ${m.shifts} shifts survived`
            : 'No shifts worked yet. Your records show up here.'
        }</p>
        <div class="controls keys-only">
          <div><kbd>WASD</kbd>/<kbd>Arrows</kbd> move · your tools fire automatically</div>
          <div><kbd>Esc</kbd> pause · <kbd>M</kbd> mute · <kbd>L</kbd> maps · <kbd>C</kbd> characters${DEBUG_ALLOWED ? ' · <kbd>`</kbd> debug' : ''}</div>
        </div>
        <p class="version">Version ${VERSION} · <button class="name-link" data-act="news">What's new</button></p>
      </div>
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Space') go('start');
      else if (code === 'KeyC') go('chars');
      else if (code === 'KeyT') go('training');
      else if (code === 'KeyL') go('maps');
      else if (code === 'KeyB') go('board');
      else if (code === 'KeyK') go('wiki');
      else if (code === 'KeyU') go('account');
      else if (code === 'KeyS') go('shop');
      else if (code === 'KeyA') go('ach');
      else if (code === 'KeyO') go('settings');
      else return false;
    },
  );
  scr.bind('button', (i, el) => go(el.dataset.act));
  scr.drawThumbs();
}
