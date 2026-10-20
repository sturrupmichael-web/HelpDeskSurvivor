// "Report a Bug" (title screen and pause menu). Sends the player's description plus what
// the game was doing to Supabase's `bug_reports` table (supabase/bugreports.sql), where
// only the owner can read it. Sending needs an account, so a guest is made if needed.

import { sfx } from '../engine/audio.js';
import { account } from '../game/account.js';
import { VERSION } from '../version.js';

const MAX = 1000;
const errors = []; // the last few uncaught errors, attached to the next report

// Called once at startup.
export function watchErrors() {
  const keep = (msg) => {
    errors.push(String(msg).slice(0, 300));
    if (errors.length > 5) errors.shift();
  };
  addEventListener('error', (e) => keep(`${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
  addEventListener('unhandledrejection', (e) => keep(`Unhandled: ${e.reason?.message ?? e.reason}`));
}

// What the game was doing, so a report can be reproduced.
function context(game, where) {
  const p = game.player;
  const inRun = where === 'pause';
  return {
    where,
    map: game.mapId,
    ...(inRun && p
      ? {
          character: p.def.name,
          time: Math.round(game.time),
          level: p.level,
          tools: p.weapons.map((w) => w.def.name),
          boss: !!game.boss,
        }
      : {}),
    shifts: game.meta.data.shifts ?? 0,
    device: navigator.userAgent.slice(0, 300),
    screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
    app: matchMedia('(display-mode: standalone)').matches,
    debug: !!game.debug?.on,
    errors: [...errors],
  };
}

export function bugScreen(screens, where, back) {
  const draft = screens.bugDraft ?? '';
  screens.show(
    `<div class="panel bug">
      <h2>REPORT A BUG</h2>
      <p>What went wrong? Say what you were doing and what you expected to happen.</p>
      <textarea class="bug-text" maxlength="${MAX}" rows="6" placeholder="e.g. The boss got stuck in a wall on the Server Room map." spellcheck="true"></textarea>
      <p class="tiny bug-count"></p>
      <button class="primary" data-act="send">Send report</button>
      <p class="board-msg"></p>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      <p class="tiny">Your report includes the game version (${VERSION}), your leaderboard name, your device type and what the game was doing. No screenshots or personal details.</p>
    </div>`,
    (code) => {
      if (document.activeElement?.classList.contains('bug-text')) {
        if (code === 'Escape') document.activeElement.blur();
        return;
      }
      if (code === 'Escape') leave();
      else return false;
    },
  );
  const text = screens.root.querySelector('.bug-text');
  const count = screens.root.querySelector('.bug-count');
  const msg = screens.root.querySelector('.board-msg');
  const btn = screens.root.querySelector('[data-act=send]');
  const counter = () => (count.textContent = `${text.value.length} / ${MAX}`);
  text.value = draft;
  counter();
  text.addEventListener('input', () => {
    screens.bugDraft = text.value; // kept if they back out and come back
    counter();
  });
  setTimeout(() => text.focus(), 50);
  const leave = () => {
    sfx('click');
    back();
  };
  const send = async () => {
    const message = text.value.trim();
    if (!message) {
      msg.textContent = 'Describe the problem first.';
      return text.focus();
    }
    btn.disabled = text.disabled = true;
    msg.textContent = 'Sending…';
    const ok = (await account.ensure(true)) && (await account.rest('bug_reports', {
      method: 'POST',
      body: JSON.stringify({ message: message.slice(0, MAX), version: VERSION, context: context(screens.game, where) }),
    }));
    if (ok?.ok) {
      sfx('click');
      screens.bugDraft = '';
      screens.show(
        `<div class="panel bug">
          <h2>TICKET RECEIVED</h2>
          <p>Thanks! Your report went straight to the developer.</p>
          <button class="primary" data-act="back">Back <kbd>Enter</kbd></button>
        </div>`,
        (code) => {
          if (code === 'Enter' || code === 'Escape' || code === 'Space') leave();
          else return false;
        },
      );
      screens.bind('[data-act=back]', leave);
      return;
    }
    btn.disabled = text.disabled = false;
    msg.textContent = ok?.status === 0 || ok === false
      ? "Couldn't reach the server. Check your connection and try again."
      : /too many/i.test(ok?.body?.message ?? '')
        ? 'Lots of reports right now. Try again in a few minutes.'
        : "The report didn't go through. Try again in a minute.";
  };
  screens.bind('[data-act=send]', send);
  screens.bind('[data-act=back]', leave);
}
