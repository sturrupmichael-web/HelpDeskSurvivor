// "What's new" screen: patch notes from data/changelog.js. Shown once per new entry on
// the title screen (players who have never finished a shift skip it), and on demand.

import { sfx } from '../engine/audio.js';
import { CHANGELOG } from '../../data/changelog.js';
import { VERSION } from '../version.js';

const KEY = 'helpdesk-survivors.news.v1';

function seen() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return CHANGELOG[0]?.id; // no storage: don't show it every time
  }
}

export function markNewsSeen() {
  try {
    localStorage.setItem(KEY, CHANGELOG[0]?.id ?? '');
  } catch {
    // Storage blocked: nothing to remember.
  }
}

// True when the newest entry hasn't been shown on this device yet. Brand-new players
// get it marked as seen instead, since everything is new to them anyway.
export function newsPending(meta) {
  if (!CHANGELOG.length || seen() === CHANGELOG[0].id) return false;
  if (!meta.data.shifts) {
    markNewsSeen();
    return false;
  }
  return true;
}

const entry = (e) => `<div class="news-entry">
    <div class="news-title"><b>${e.title}</b><span>${e.date}</span></div>
    <ul>${e.items.map((i) => `<li>${i}</li>`).join('')}</ul>
  </div>`;

export function newsScreen(screens, back, all = false) {
  markNewsSeen();
  const done = () => {
    sfx('click');
    back();
  };
  screens.show(
    `<div class="panel wide news">
      <h2>WHAT'S NEW</h2>
      <p class="sub">Version ${VERSION}</p>
      ${entry(CHANGELOG[0])}
      ${all ? `<div class="section-head">EARLIER UPDATES</div>${CHANGELOG.slice(1).map(entry).join('')}` : ''}
      <button class="primary" data-act="ok">Got it <kbd>Enter</kbd></button>
      ${!all && CHANGELOG.length > 1 ? '<button class="back" data-act="all">Earlier updates <kbd>E</kbd></button>' : ''}
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Escape' || code === 'Space') done();
      else if (code === 'KeyE' && !all) newsScreen(screens, back, true);
      else return false;
    },
  );
  screens.bind('[data-act=ok]', done);
  screens.bind('[data-act=all]', () => {
    sfx('click');
    newsScreen(screens, back, true);
  });
}
