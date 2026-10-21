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
  const tools = s.tools
    .map(
      (t) => `<div class="tool-row ${t.evolved ? 'evolved' : ''}">${icon(t.icon, 20)}<span class="tool-name">${t.name}</span>
        <span class="tool-bar"><i style="width:${Math.round((t.damage / topDamage) * 100)}%"></i></span><span class="tool-dmg">${t.damage.toLocaleString()}</span></div>`,
    )
    .join('');
  scr.show(
    `<div class="panel wide summary ${s.won ? 'win' : 'lose'}">
      <h1>${s.won ? 'CLOCKED OUT!' : 'BURNOUT'}</h1>
      <p class="sub">${pickLine(s.won ? VICTORY_QUIPS : BURNOUT_QUIPS)}</p>
      ${s.wikiNew?.length ? `<p class="wiki-new">NEW IN THE WIKI: ${s.wikiNew.slice(0, 6).map((n) => `<b>${n}</b>`).join(', ')}${s.wikiNew.length > 6 ? ` and ${s.wikiNew.length - 6} more` : ''}</p>` : ''}
      ${s.newMap ? `<p class="unlock">NEW MAP UNLOCKED: <b>${MAPS[s.newMap].name}</b> (pick it when you Clock In)</p>` : ''}
      ${s.newUnlocks?.length ? `<p class="unlock">NOW AVAILABLE: ${s.newUnlocks.map((u) => `<b>${unlockName(u)}</b>`).join(', ')}</p>` : ''}
      ${s.policiesOpened ? '<p class="unlock">SHIFT POLICIES UNLOCKED: optional twists for more pay and score. Pick them when you Clock In, after the map.</p>' : ''}
      ${s.newPolicies?.length && !s.policiesOpened ? `<p class="unlock">NEW POLICIES: ${s.newPolicies.map((id) => `<b>${POLICIES[id].name}</b>`).join(', ')}</p>` : ''}
      <div class="summary-cols">
        <table class="stats">
          <tr><td>Technician</td><td>${s.character}</td></tr>
          <tr><td>Map</td><td>${s.mapName}</td></tr>
          <tr><td>Time survived</td><td>${fmtTime(s.time)}${rec('time')}</td></tr>
          <tr><td>Tickets closed</td><td>${s.kills.toLocaleString()}${rec('tickets')}</td></tr>
          <tr><td>CSAT score</td><td>${s.csat.toLocaleString()}${rec('csat')}</td></tr>
          ${
            s.policies?.length
              ? `<tr><td>Policies</td><td class="pol-line">${s.policies.map((id) => POLICIES[id].name).join(', ')}${s.reorg ? ' (Reorg)' : ''} ${fmtMult(s.policyMult)}</td></tr>
                 <tr><td>Leaderboard score</td><td>${s.score.toLocaleString()}</td></tr>`
              : ''
          }
          <tr><td>Best streak</td><td>x${s.bestStreak}</td></tr>
          <tr><td>Level reached</td><td>${s.level}</td></tr>
          <tr class="paid"><td>Overtime Pay earned</td><td>+${PAY(s.pay)}</td></tr>
          <tr><td>Balance</td><td>${PAY(s.balance)}</td></tr>
        </table>
        <div class="tools"><div class="tools-head">Damage by tool</div>${tools}</div>
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
}
