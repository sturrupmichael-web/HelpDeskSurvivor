// levelUp, chest: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { icon } from '../icons.js';
import { sfx } from '../../engine/audio.js';
import { LEVEL_UP_LINES } from '../../../data/flavor.js';
import { pickLine, DIGITS } from './common.js';

// onPick(choice, always): `always` is true when the player chose to auto-take the
// pizza for the rest of the run (offered once every item is maxed).
// onReroll is null when no rerolls are available.
// `tip` is the training shift's explanation, shown above the cards (or null).
export function levelUp(scr, choices, tip, onReroll, rerollsLeft, onPick) {
  let done = false;
  // Ignore taps for a moment: a thumb put back down to steer could otherwise land on a card.
  let ready = false;
  setTimeout(() => (ready = true), 400);
  const onlyPizza = choices.length === 1 && choices[0].kind === 'reward';
  const pick = (i, always = false) => {
    if (done || !ready || !choices[i]) return;
    done = true;
    sfx('click');
    onPick(choices[i], always);
  };
  const card = (c, i) => `
    <button class="card" data-i="${i}">
      <div class="card-head">${icon(c.icon, 40)}
        <div><div class="card-name">${c.name}</div>
        <div class="card-level">${c.kind === 'reward' ? 'Reward' : c.level === 1 ? 'NEW!' : `Level ${c.level}`}</div></div>
        <kbd>${i + 1}</kbd>
      </div>
      <div class="card-text">${c.text}</div>
      <div class="card-flavor">${c.flavor}</div>
      ${c.hint ? `<div class="card-hint">${c.hint}</div>` : ''}
    </button>`;
  scr.show(
    `<div class="panel wide levelup-panel">
      <h2>LEVEL UP!</h2>
      <p class="sub">${pickLine(LEVEL_UP_LINES)}</p>
      ${tip ? `<p class="levelup-tip"><b>TRAINING:</b> ${tip}</p>` : ''}
      <div class="cards levelup">${choices.map(card).join('')}</div>
      ${
        onlyPizza
          ? `<button class="always" data-act="always">Everything's maxed: always take the pizza from now on <kbd>A</kbd></button>`
          : ''
      }
      ${onReroll ? `<button class="always" data-act="reroll">Escalate: reroll these cards (${rerollsLeft} left) <kbd>R</kbd></button>` : ''}
    </div>`,
    (code) => {
      const n = DIGITS[code];
      if (n !== undefined) pick(n);
      else if (onlyPizza && code === 'KeyA') pick(0, true);
      else if (onReroll && code === 'KeyR' && !done && ready) {
        done = true;
        sfx('click');
        onReroll();
      }
      else return code !== 'Escape' ? false : true; // swallow Esc so it can't pause mid-choice
    },
  );
  scr.bind('.card', (i) => pick(i));
  scr.bind('[data-act=always]', () => pick(0, true));
  scr.bind('[data-act=reroll]', () => {
    if (done || !ready) return;
    done = true;
    sfx('click');
    onReroll();
  });
}

// result: { evolved?: { from, to }, upgrades: [choice] } from upgrades.openChest().
export function chest(scr, result, onClose) {
  let done = false;
  let ready = false;
  const close = () => {
    if (done || !ready) return;
    done = true;
    sfx('click');
    onClose();
  };
  const ev = result.evolved;
  const body = ev
    ? `<p class="sub">Emergency change approved by the CAB. Your tool has evolved!</p>
      <div class="evolve">
        <div class="evo-from">${icon(ev.from.icon, 40)}<span>${ev.from.name}</span></div>
        <div class="evo-arrow">&#9654;</div>
        <div class="evo-to">${icon(ev.to.icon, 56)}<b>${ev.to.name}</b></div>
      </div>
      <div class="card-text">${ev.to.desc}</div>
      <div class="card-flavor">${ev.to.flavor}</div>`
    : `<p class="sub">Standard change approved. ${result.upgrades.length > 1 ? 'Triple sign-off!' : 'One sign-off.'}</p>
      <div class="chest-list">${result.upgrades
        .map(
          (c) => `<div class="chest-item">${icon(c.icon, 32)}<div><div class="card-name">${c.name}</div>
            <div class="card-level">${c.kind === 'reward' ? 'Reward' : c.level === 1 ? 'NEW!' : `Level ${c.level}`}</div></div></div>`,
        )
        .join('')}</div>`;
  scr.show(
    `<div class="panel chest">
      <h2>CHANGE APPROVED</h2>
      ${body}
      <button class="primary" data-act="ok">Deploy to Production <kbd>Enter</kbd></button>
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Space') close();
      else return code !== 'Escape' ? false : true;
    },
  );
  // Short delay so a held movement key or a stray click can't skip the reveal.
  scr.root.querySelector('button').disabled = true;
  setTimeout(() => {
    ready = true;
    const b = scr.root.querySelector('[data-act=ok]');
    if (b) b.disabled = false;
  }, 400);
  scr.bind('[data-act=ok]', close);
}
