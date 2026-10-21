// title: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { CHARACTERS } from '../../../data/player.js';
import { ACHIEVEMENTS } from '../../../data/achievements.js';
import { DEBUG_ALLOWED } from '../debug.js';
import { MAPS } from '../../../data/maps.js';
import { accountScreen } from '../account.js';
import { newsScreen, newsPending } from '../news.js';
import { bugScreen } from '../bugreport.js';
import { VERSION, PREVIEW } from '../../version.js';
import { account } from '../../game/account.js';
import { wikiScreen, wikiProgress } from '../wiki.js';
import { TITLE_TAGLINES } from '../../../data/flavor.js';
import { pickLine, PAY } from './common.js';

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
  scr.show(
    `<div class="panel title">
      ${PREVIEW ? '<p class="preview-banner">PREVIEW BUILD · not the live game yet</p>' : ''}
      <h1>HELPDESK<br>SURVIVORS</h1>
      <p class="sub">${pickLine(TITLE_TAGLINES)}</p>
      <div class="title-char"><canvas data-spr="${ch.sprite}" width="64" height="64"></canvas>
        <div><div class="card-name">${ch.name}</div><div class="card-flavor">${ch.perk}</div></div></div>
      <button class="primary" data-act="start">Clock In <kbd>Enter</kbd></button>
      <button data-act="training">Training Shift <kbd>T</kbd></button>
      <button data-act="maps">Map: ${MAPS[m.map].name} <kbd>L</kbd></button>
      <button data-act="chars">Characters <kbd>C</kbd></button>
      <button data-act="shop">Overtime Shop ${PAY(m.pay)} <kbd>S</kbd></button>
      <button data-act="board">Leaderboard <kbd>B</kbd></button>
      <button data-act="wiki">Help Desk Wiki ${wiki.found}/${wiki.total} <kbd>K</kbd></button>
      <button data-act="account">${!account.user ? 'Account: not signed in' : account.user.guest ? 'Account: Guest' : 'Account: Google'} <kbd>U</kbd></button>
      ${window.installPrompt ? '<button data-act="install">Install App</button>' : ''}
      <div class="row-buttons">
        <button data-act="ach">Achievements ${Object.keys(m.achievements ?? {}).length}/${ACHIEVEMENTS.length} <kbd>A</kbd></button>
        <button data-act="settings">Settings <kbd>O</kbd></button>
      </div>
      <button data-act="bug">Report a Bug</button>
      <table class="stats records">
        <tr><td>Longest shift</td><td>${fmtTime(m.best.time)}</td></tr>
        <tr><td>Most tickets closed</td><td>${m.best.tickets.toLocaleString()}</td></tr>
        <tr><td>Best CSAT</td><td>${m.best.csat.toLocaleString()}</td></tr>
        <tr><td>Shifts worked / survived</td><td>${m.shifts} / ${m.wins}</td></tr>
      </table>
      <div class="controls">
        <div><kbd>WASD</kbd>/<kbd>Arrows</kbd> move · your tools fire automatically</div>
        <div><kbd>Esc</kbd> pause · <kbd>M</kbd> mute${DEBUG_ALLOWED ? ' · <kbd>`</kbd> debug' : ''}</div>
      </div>
      <p class="version">Version ${VERSION} · <button class="name-link" data-act="news">What's new</button></p>
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
