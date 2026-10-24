// gameOver: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { icon } from '../icons.js';
import { fmtTime } from '../hud.js';
import { sfx } from '../../engine/audio.js';
import { MAPS } from '../../../data/maps.js';
import { boardPost } from '../account.js';
import { BURNOUT_QUIPS, VICTORY_QUIPS } from '../../../data/flavor.js';
import { pickLine, reviewCard, unlockName, PAY } from './common.js';
import { POLICIES } from '../../../data/policies.js';
import { fmtMult } from '../../game/policies.js';
import { timelineChart, wireTimeline } from './timeline.js';

// s: run stats from Game.endRun (plus pay, records, balance from Meta.finishShift).
export function gameOver(scr, s) {
  let ready = false;
  setTimeout(() => (ready = true), 600); // don't let a held key skip the summary
  const go = (act) => {
    if (!ready) return;
    sfx('click');
    if (act === 'again') scr.game.newRun();
    else {
      scr.game.setState('title');
      if (act === 'shop') scr.shop();
      else if (act === 'switch') scr.shiftSetup();
      else scr.title();
    }
  };
  const rec = (k) => (s.records.includes(k) ? ' <b class="record">NEW RECORD</b>' : '');
  const topDamage = Math.max(1, ...s.tools.map((t) => t.damage));
  // Tools then passives, indexed by the rows' data-item so hover/tap can show the description.
  const items = [...s.tools, ...(s.passives ?? [])];
  const tools = s.tools
    .map(
      (t, i) => `<div class="tool-row ${t.evolved ? 'evolved' : ''}" data-item="${i}" tabindex="0">${icon(t.icon, 20)}<span class="tool-name">${t.name}</span>
        <span class="tool-bar"><i style="width:${Math.round((t.damage / topDamage) * 100)}%"></i></span><span class="tool-dmg">${t.damage.toLocaleString()}</span></div>`,
    )
    .join('');
  const passives = (s.passives ?? [])
    .map(
      (p, i) => `<div class="tool-row passive-row" data-item="${s.tools.length + i}" tabindex="0">${icon(p.icon, 20)}<span class="tool-name">${p.name}</span>
        <span class="tool-lvl">${lvl(p)}</span></div>`,
    )
    .join('');
  scr.show(
    `<div class="panel wide summary ${s.won ? 'win' : 'lose'}">
      <h1>${s.won ? 'CLOCKED OUT!' : 'BURNOUT'}</h1>
      <p class="sub">${pickLine(s.won ? VICTORY_QUIPS : BURNOUT_QUIPS)}</p>
      ${s.wikiNew?.length ? `<p class="wiki-new">NEW IN THE KNOWLEDGE BASE: ${s.wikiNew.slice(0, 6).map((n) => `<b>${n}</b>`).join(', ')}${s.wikiNew.length > 6 ? ` and ${s.wikiNew.length - 6} more` : ''}</p>` : ''}
      ${s.newMap ? `<p class="unlock">NEW MAP UNLOCKED: <b>${MAPS[s.newMap].name}</b> (pick it when you Clock In)</p>` : ''}
      ${s.newUnlocks?.length ? `<p class="unlock">NOW AVAILABLE: ${s.newUnlocks.map((u) => `<b>${unlockName(u)}</b>`).join(', ')}</p>` : ''}
      ${s.policiesOpened ? '<p class="unlock">SHIFT POLICIES UNLOCKED: optional twists for more pay and score. Pick them when you Clock In, after the map.</p>' : ''}
      ${s.hardcoreOpened ? '<p class="unlock">HARDCORE UNLOCKED: you\'ve won on every map. Flip the Hardcore switch under the maps when you Clock In, for double pay and score.</p>' : ''}
      ${s.newPolicies?.length && !s.policiesOpened ? `<p class="unlock">NEW POLICIES: ${s.newPolicies.map((id) => `<b>${POLICIES[id].name}</b>`).join(', ')}</p>` : ''}
      <div class="summary-cols">
        <table class="stats">
          <tr><td>Technician</td><td>${s.character}</td></tr>
          <tr><td>Map</td><td>${s.mapName}</td></tr>
          <tr><td>Time survived</td><td>${fmtTime(s.time)}${rec('time')}</td></tr>
          <tr><td>Tickets closed</td><td>${s.kills.toLocaleString()}${rec('tickets')}</td></tr>
          <tr><td>CSAT score</td><td>${s.csat.toLocaleString()}${rec('csat')}</td></tr>
          ${
            s.policies?.length || s.hardcore
              ? `${s.hardcore ? '<tr><td>Mode</td><td><b class="hc-tag">HARDCORE</b> x2</td></tr>' : ''}
                 ${s.policies.length ? `<tr><td>Policies</td><td class="pol-line">${s.policies.map((id) => POLICIES[id].name).join(', ')}${s.reorg ? ' (Reorg)' : ''}</td></tr>` : ''}
                 <tr><td>Leaderboard score</td><td>${s.score.toLocaleString()} <span class="pol-line">(CSAT ${fmtMult(s.policyMult)})</span></td></tr>`
              : ''
          }
          <tr><td>Best streak</td><td>x${s.bestStreak}</td></tr>
          <tr><td>Level reached</td><td>${s.level}</td></tr>
          <tr class="paid"><td>Overtime Pay earned</td><td>+${PAY(s.pay)}</td></tr>
          <tr><td>Balance</td><td>${PAY(s.balance)}</td></tr>
        </table>
        <div class="tools"><div class="tools-head">Damage by tool</div>${tools}
          ${passives ? `<div class="tools-head passives-head">Passives</div>${passives}` : ''}
          <p class="item-info" aria-live="polite">${HINT}</p>
        </div>
      </div>
      ${timelineChart(s.timeline)}
      ${s.review ? reviewCard(s) : ''}
      ${
        s.cheated
          ? '<p class="board-note">Debug mode was on this shift, so it can\'t go on the leaderboard.</p>'
          : '<div class="board-post"></div>'
      }
      <div class="summary-buttons">
        <button class="primary" data-act="again">Next Shift <kbd>Enter</kbd></button>
        <button data-act="switch">${scr.game.meta.policiesOpen() ? 'Change Tech, Map or Policies' : 'Change Tech or Map'} <kbd>C</kbd></button>
        <button data-act="shop">Overtime Shop <kbd>S</kbd></button>
        <button data-act="title">Title <kbd>Esc</kbd></button>
      </div>
    </div>`,
    (code) => {
      const typing = document.activeElement?.classList.contains('board-name');
      if (typing) {
        if (code === 'Enter') post();
        else if (code === 'Escape') document.activeElement.blur();
        return;
      }
      if (code === 'Enter' || code === 'Space') go('again');
      else if (code === 'KeyP') post();
      else if (code === 'KeyS') go('shop');
      else if (code === 'KeyC') go('switch');
      else if (code === 'Escape') go('title');
      else return false;
    },
  );
  const post = s.cheated ? () => {} : boardPost(scr, s);
  scr.bind('.summary-buttons button', (i, el) => go(el.dataset.act));
  wireTimeline(scr.root, s.timeline);
  wireItems(scr.root, items);
}

const HINT = 'Hover or tap a tool or passive to see what it does.';
const lvl = (t) => (t.level >= t.maxLevel ? 'MAX' : `Lv ${t.level}`);

// Shows one item's description in the box under the lists: on hover or keyboard focus,
// and on a tap for phones (tapping the same row again hides it). A tap moves the box
// to just under the row, so it's on screen even when the lists are long.
function wireItems(root, items) {
  const box = root.querySelector('.item-info');
  if (!box) return;
  const rows = [...root.querySelectorAll('[data-item]')];
  const home = box.parentNode;
  let shown = null;
  const show = (row, under = false) => {
    shown = row;
    if (row && under) row.after(box);
    else home.append(box);
    rows.forEach((r) => r.classList.toggle('selected', r === row));
    if (!row) {
      box.textContent = HINT;
      box.classList.remove('on');
      return;
    }
    const t = items[row.dataset.item];
    const level = t.maxLevel > 1 ? ` <span class="tool-lvl">${lvl(t)}</span>` : '';
    box.innerHTML = `<b>${t.name}</b>${level}<br>${t.desc ?? ''}`;
    box.classList.add('on');
  };
  let touch = false; // the pointer that's down is a finger or pen, not a mouse
  let pressing = false;
  for (const row of rows) {
    row.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show(row));
    row.addEventListener('pointerdown', (e) => {
      touch = e.pointerType !== 'mouse';
      pressing = true;
    });
    row.addEventListener('focus', () => !pressing && show(row)); // Tab key
    row.addEventListener('click', () => {
      pressing = false;
      show(touch && shown === row ? null : row, touch);
    });
  }
  root.querySelector('.tools')?.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && show(null));
}
