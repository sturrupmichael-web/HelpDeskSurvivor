// Account screen (title screen, key U), the "which progress do you keep?" choice, and
// the name/post row on the end-of-shift screen. Accounts are in src/game/account.js.

import { sfx } from '../engine/audio.js';
import { account } from '../game/account.js';
import { cleanName, postScore } from '../game/leaderboard.js';
import { LEADERBOARD } from '../../data/leaderboard.js';
import { profileScreen } from './profile.js';
import { VERSION } from '../version.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const PAY = (n) => `<span class="pay">$${n.toLocaleString()}</span>`;

function syncLine(cloud) {
  if (cloud.status === 'synced') return 'Progress backed up to your account.';
  if (cloud.status === 'syncing') return 'Backing up your progress…';
  if (cloud.status === 'offline') return "Couldn't reach the server. Your progress will back up next time.";
  if (cloud.status === 'conflict') return 'Waiting for you to pick which progress to keep.';
  return '';
}

export async function accountScreen(screens, back = () => screens.title()) {
  const game = screens.game;
  const u = account.user;
  const name = u ? await account.name() : undefined;
  const nameText = name ? `<b>${esc(name)}</b>` : name === null ? '<i>couldn\'t check</i>' : '<i>none yet</i>';
  const kind = !u
    ? `<p>You're playing without an account. Your progress is saved in this browser only.</p>
       <p class="tiny">A guest account is made for you the first time you post a score.</p>`
    : u.guest
      ? `<p><b>Guest account</b> · Leaderboard name: ${nameText}</p>
         <p>Your name and progress are tied to this browser. Sign in with Google to keep them safe and play on other devices.</p>`
      : `<p>Signed in with Google${u.email ? ` as <b>${esc(u.email)}</b>` : ''}</p>
         <p>Leaderboard name: ${nameText}</p>`;
  screens.show(
    `<div class="panel account">
      <h2>ACCOUNT</h2>
      ${kind}
      ${u ? `<p class="sync-line">${syncLine(game.cloud)}</p>` : ''}
      ${account.lastError ? `<p class="sign-in-error">Google sign-in didn't finish: ${esc(account.lastError)}</p>` : ''}
      ${!u || u.guest ? '<button class="primary google" data-act="google">Sign in with Google <kbd>G</kbd></button>' : ''}
      ${u ? `<div class="name-row"><input type="text" class="board-name" maxlength="${LEADERBOARD.nameMax}" placeholder="New leaderboard name" autocomplete="off" spellcheck="false">
        <button data-act="rename">${name ? 'Change name' : 'Claim name'}</button></div><p class="board-msg"></p>` : ''}
      ${name ? '<button data-act="profile">My profile</button>' : ''}
      ${u && !u.guest ? '<button data-act="signout">Sign out on this device</button>' : ''}
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      <p class="tiny">We store your leaderboard name, your progress and, if you use Google, your email address. Nothing else.</p>
    </div>`,
    (code) => {
      if (document.activeElement?.classList.contains('board-name')) {
        if (code === 'Enter') rename();
        else if (code === 'Escape') document.activeElement.blur();
        return;
      }
      if (code === 'Escape') back();
      else if (code === 'KeyG' && (!u || u.guest)) google();
      else return false;
    },
  );
  const msg = screens.root.querySelector('.board-msg');
  const google = async () => {
    sfx('click');
    const btn = screens.root.querySelector('[data-act=google]');
    btn.disabled = true;
    btn.textContent = 'Opening Google…';
    const r = await account.google();
    if (!r.ok) {
      btn.disabled = false;
      btn.innerHTML = 'Sign in with Google <kbd>G</kbd>';
      if (msg) msg.textContent = "Couldn't reach Google sign-in. Try again in a minute.";
    }
  };
  const rename = async () => {
    const input = screens.root.querySelector('.board-name');
    const n = cleanName(input.value);
    if (!n) return (msg.textContent = 'Type a name first.');
    msg.textContent = 'Saving…';
    const r = await account.setName(n);
    if (r.ok) {
      game.meta.data.playerName = n;
      game.meta.save();
      accountScreen(screens, back);
    } else msg.textContent = r.taken ? 'Someone already has that name. Try another.' : "Couldn't reach the server. Try again.";
  };
  screens.bind('[data-act]', (i, el) => {
    const act = el.dataset.act;
    if (act === 'back') back();
    else if (act === 'google') google();
    else if (act === 'rename') rename();
    else if (act === 'profile') {
      sfx('click');
      profileScreen(screens, name, () => accountScreen(screens, back));
    }
    else if (act === 'signout') {
      sfx('click');
      account.signOut();
      game.cloud.reset();
      accountScreen(screens, back);
    }
  });
}

// Both this device and the account have progress the other doesn't: the player picks.
export function conflictScreen(screens, local, cloud, choose) {
  const card = (side, title, s) => `<button class="card save-pick" data-side="${side}">
      <div class="card-name">${title}</div>
      <div>${plural(s.shifts, 'shift')} · ${s.wins} survived</div>
      <div>${PAY(s.pay)} Overtime Pay</div>
      <div>${plural(s.characters, 'character')} · ${plural(s.achievements, 'achievement')}</div>
    </button>`;
  const pick = (side) => {
    sfx('click');
    choose(side);
    screens.title();
  };
  screens.show(
    `<div class="panel account">
      <h2>WHICH PROGRESS DO YOU KEEP?</h2>
      <p>This device and your account both have progress. Pick one; the other is replaced.</p>
      <div class="save-picks">${card('local', 'This device', local)}${card('cloud', 'Your account', cloud)}</div>
    </div>`,
    () => true, // must pick one
  );
  screens.bind('.save-pick', (i, el) => pick(el.dataset.side));
}

// The leaderboard row on the end-of-shift screen. Returns the post() handler.
export function boardPost(screens, s) {
  const root = screens.root.querySelector('.board-post');
  const game = screens.game;
  let posted = false;
  let name;
  const draw = () => {
    root.innerHTML = name
      ? `<span class="posting-as">Posting as <b>${esc(name)}</b></span>
         <button data-act="post">Post to Leaderboard <kbd>P</kbd></button><span class="board-msg"></span>`
      : `<input type="text" class="board-name" maxlength="${LEADERBOARD.nameMax}" placeholder="Pick a leaderboard name" value="${esc(game.meta.data.playerName ?? '')}" autocomplete="off" spellcheck="false">
         <button data-act="post">Post to Leaderboard <kbd>P</kbd></button><span class="board-msg"></span>`;
    root.querySelector('[data-act=post]').addEventListener('click', post);
  };
  const post = async () => {
    const btn = root.querySelector('[data-act=post]');
    const msg = root.querySelector('.board-msg');
    if (posted || btn.disabled) return;
    const input = root.querySelector('.board-name');
    btn.disabled = true;
    if (input) {
      const n = cleanName(input.value);
      if (!n) {
        btn.disabled = false;
        msg.textContent = 'Type a name first.';
        setTimeout(() => input.focus(), 50);
        return;
      }
      input.value = n;
      input.disabled = true;
      input.blur();
      msg.textContent = 'Claiming your name…';
      const c = await account.setName(n);
      if (!c.ok) {
        btn.disabled = input.disabled = false;
        msg.textContent = c.taken ? 'Someone already has that name. Try another.' : "Couldn't reach the leaderboard. Try again.";
        return;
      }
      game.meta.data.playerName = n;
      game.meta.save();
    }
    msg.textContent = 'Posting…';
    const r = await postScore({ map: s.map, character: s.character, seconds: Math.round(s.time), csat: s.csat, won: s.won, version: VERSION });
    if (r.ok) {
      posted = true;
      msg.innerHTML = r.rank ? `Posted! You're <b>#${r.rank}</b> on the ${esc(s.mapName)} board.` : 'Posted!';
    } else {
      btn.disabled = false;
      msg.textContent = r.status ? "The leaderboard didn't accept that score. Try again in a minute." : "Couldn't reach the leaderboard. Try again.";
    }
  };
  draw();
  if (account.user) {
    account.name().then((n) => {
      if (n && !posted && root.isConnected) {
        name = n;
        draw();
      }
    });
  }
  return post;
}
