// Ticket combos (idea 15): streak milestones pop "RESOLVED xN!" and pay bonus CSAT.
// Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { Score } from '../src/game/score.js';
import { CSAT } from '../data/scoring.js';

export function comboTests() {
  test('combos: milestones fire once each and pay bonus CSAT', async () => {
    const s = new Score();
    const hits = [];
    for (let i = 0; i < 2000; i++) {
      const n = s.onKill();
      if (n) hits.push(n);
    }
    assert(hits.join() === '10,25,50,100,250,500,1000,2000', `milestones were ${hits.join()}`);
    assert(s.combos === hits.length, `counted ${s.combos} combos`);
    // Without combos the same 2000 kills score the plain streak total.
    let plain = 0;
    for (let k = 1; k <= 2000; k++) plain += Math.min(CSAT.maxMultiplier, 1 + Math.floor(k / CSAT.killsPerTier));
    assert(s.csat > plain, `no bonus: ${s.csat} vs ${plain}`);
  });
  test('combos: repeats past the last milestone pay a flat bonus', async () => {
    const s = new Score();
    const last = CSAT.comboMilestones[CSAT.comboMilestones.length - 1];
    for (let i = 0; i < 2 * last - 1; i++) s.onKill();
    const before = s.csat;
    s.onKill();
    const flat = Math.round(last * CSAT.comboBonus) * CSAT.maxMultiplier;
    assert(s.csat - before === CSAT.maxMultiplier + flat, `the ${2 * last} combo paid ${s.csat - before}`);
  });
  test('combos: a long streak stays under the leaderboard limit (supabase/hardening.sql)', async () => {
    // 200 closes a second for 30 minutes without a hit, far past any real shift.
    const s = new Score();
    for (let i = 0; i < 200 * 1800; i++) s.onKill();
    assert(s.csat <= 1800 * 10000, `csat ${s.csat} over the limit`);
  });
  test('combos: a hit breaks the streak and the count starts again', async () => {
    const s = new Score();
    for (let i = 0; i < 9; i++) s.onKill();
    s.onHurt();
    for (let i = 0; i < 9; i++) assert(!s.onKill(), 'combo fired before 10 in a row');
    assert(s.onKill() === 10, 'no combo at 10');
  });
}
