// Clock In step 3 (src/ui/screens/shiftSetup.js): Shift Policies (data/policies.js).
// Tap a card to sign up to it or drop it; the bar shows the pay and score multiplier.
// `pick` is the picker's state: { char, map, policies, reorg }.

import { icon } from '../icons.js';
import { sfx } from '../../engine/audio.js';
import { MAPS } from '../../../data/maps.js';
import { POLICIES, POLICY_ORDER, POLICY_GROUPS, POLICY_RULES } from '../../../data/policies.js';
import { policyMult, fmtMult, clashes, rollReorg } from '../../game/policies.js';
import { gamepadConnected } from '../../engine/input.js';

export function policiesStep(scr, pick) {
  const g = scr.game;
  const meta = g.meta;
  pick.policies = pick.policies.filter((id) => POLICIES[id] && meta.policyUnlocked(id));
  if (!pick.policies.length) pick.reorg = false;
  // Redraw after a tap, keeping the list where it was scrolled to.
  const again = () => {
    const tops = [scr.root, scr.root.querySelector('.panel')].map((el) => el?.scrollTop ?? 0);
    policiesStep(scr, pick);
    [scr.root, scr.root.querySelector('.panel')].forEach((el, i) => el && (el.scrollTop = tops[i]));
  };
  const picked = pick.policies;
  const full = picked.length >= POLICY_RULES.maxPicked;
  const mult = policyMult(picked, pick.reorg);
  const clashWith = (id) => picked.find((o) => o !== id && clashes(o, id));

  const toggle = (id) => {
    if (!meta.policyUnlocked(id)) return;
    const at = picked.indexOf(id);
    if (at >= 0) picked.splice(at, 1);
    else if (full || clashWith(id)) return sfx('hurt');
    else picked.push(id);
    pick.reorg = false; // hand-picked: no dice bonus
    sfx('click');
    again();
  };
  const reorg = () => {
    const open = POLICY_ORDER.filter((id) => meta.policyUnlocked(id));
    pick.policies = rollReorg(open);
    pick.reorg = pick.policies.length > 0;
    sfx('chest');
    again();
  };
  const clear = () => {
    pick.policies = [];
    pick.reorg = false;
    sfx('click');
    again();
  };
  const go = () => {
    sfx('click');
    meta.select(pick.char);
    meta.selectMap(pick.map);
    meta.setPolicies(pick.policies, pick.reorg);
    g.newRun();
  };
  // Steps that Clock In skipped (nothing to choose) are skipped on the way back too.
  const skipped = pick.skipped ?? {};
  const back = () => {
    sfx('click');
    if (!skipped.map) scr.shiftSetup('map', pick);
    else if (!skipped.char) scr.shiftSetup('char', pick);
    else scr.title();
  };
  const stepNo = 3 - (skipped.char ? 1 : 0) - (skipped.map ? 1 : 0);

  const card = (id) => {
    const p = POLICIES[id];
    const n = POLICY_ORDER.indexOf(id) + 1;
    const on = picked.includes(id);
    const open = meta.policyUnlocked(id);
    const clash = !on && clashWith(id);
    const status = !open
      ? `Locked: ${meta.policyLockText(id)}`
      : on
        ? '<b class="ok">SIGNED</b>'
        : clash
          ? `Can't combine with ${POLICIES[clash].name}`
          : full
            ? ''
            : '<span class="hint">Tap to sign</span>';
    const stamp = meta.data.policiesWon.includes(id) ? '<span class="pol-stamp" title="You\'ve won a shift with this">WON</span>' : '';
    const dim = open && !on && (full || clash);
    return `<button class="card policy ${p.group} ${on ? 'selected' : ''} ${open ? '' : 'locked'} ${dim ? 'dim' : ''}" data-id="${id}" ${open ? '' : 'disabled'}>
      <div class="card-head">${icon(open ? p.icon : 'policy', 28)}<div class="card-name"><small>${n}.</small> ${open ? p.name : '???'}</div><b class="pol-x">${fmtMult(p.mult)}</b></div>
      ${open ? `<div class="card-text">${p.desc}</div>` : ''}
      ${status || stamp ? `<div class="char-status">${status}${stamp}</div>` : ''}
    </button>`;
  };
  const groups = POLICY_GROUPS.map(
    (gr) => `<div class="section-head pol-group ${gr.id}">${gr.name.toUpperCase()} <small>${gr.note}</small></div>
      <div class="cards policies">${POLICY_ORDER.filter((id) => POLICIES[id].group === gr.id).map(card).join('')}</div>`,
  ).join('');
  const summary = picked.length
    ? `${picked.map((id) => `<b>${POLICIES[id].name}</b>`).join(' + ')}${pick.reorg ? ` + <b>Reorg bonus</b>` : ''}`
    : 'No policies: a normal shift.';
  scr.show(
    `<div class="panel wide chars setup">
      <p class="setup-step">STEP ${stepNo} OF ${stepNo}</p>
      <h2>SHIFT POLICIES</h2>
      <p class="sub">Optional. Up to ${POLICY_RULES.maxPicked}. Bad policies raise your Overtime Pay and leaderboard score, perks lower them.</p>
      <div class="pol-summary"><span>${summary}</span><b class="pol-total ${mult > 1 ? 'up' : mult < 1 ? 'down' : ''}">Pay and score ${fmtMult(mult)}</b></div>
      <div class="pol-tools">
        <button data-act="reorg" title="${POLICY_RULES.reorgCount} random bad policies, +${Math.round((POLICY_RULES.reorgBonus - 1) * 100)}% while you keep them">🎲 Reorg <kbd>R</kbd></button>
        <button data-act="clear" ${picked.length ? '' : 'disabled'}>No policies <kbd>N</kbd></button>
      </div>
      <p class="pol-note">🎲 Reorg signs you up to ${POLICY_RULES.reorgCount} random bad policies for an extra +${Math.round((POLICY_RULES.reorgBonus - 1) * 100)}% while you keep them.</p>
      ${groups}
      <div class="setup-bar">
        <button data-act="back">${stepNo === 1 ? 'Cancel' : 'Back'} <kbd>Esc</kbd></button>
        <button class="primary" data-act="next">Clock In: ${MAPS[pick.map].name} <kbd>Enter</kbd></button>
      </div>
    </div>`,
    (code) => {
      if (code === 'Enter' || code === 'Space') go();
      else if (code === 'Escape' || code === 'Backspace') back();
      else if (code === 'KeyR') reorg();
      else if (code === 'KeyN') clear();
      else return false;
    },
  );
  scr.bind('.card.policy', (i, el) => toggle(el.dataset.id));
  scr.bind('[data-act=reorg]', reorg);
  scr.bind('[data-act=clear]', clear);
  scr.bind('[data-act=back]', back);
  scr.bind('[data-act=next]', go);
  if (gamepadConnected()) scr.root.querySelector('[data-act=next]')?.focus();
}
