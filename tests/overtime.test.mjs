// Overtime ramp (idea 49): nothing changes until the grace period after 20:00 runs out,
// then each minute adds a level of tougher, more numerous users. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPick } from './tools/bot.mjs';
import { SHIFT_LENGTH, OVERTIME } from '../data/waves.js';

export function overtimeTests() {
  test('overtime: levels start after the grace period', async () => {
    const g = headlessGame(manifest, { pick: botPick });
    g.startShift('office', 'tier1');
    const at = (t) => ((g.time = t), g.spawner.overtimeLevel(g));
    assert(at(SHIFT_LENGTH - 1) === 0 && at(SHIFT_LENGTH + 1) === 0, 'ramp before or right at 20:00');
    assert(at(SHIFT_LENGTH + OVERTIME.grace - 1) === 0, 'ramp during the grace period');
    assert(at(SHIFT_LENGTH + OVERTIME.grace) === 1, 'no level 1 when the grace ends');
    assert(at(SHIFT_LENGTH + OVERTIME.grace + 3 * OVERTIME.every + 1) === 4, 'levels do not climb each minute');
  });
  test('overtime: users spawn tougher at higher levels', async () => {
    const g = headlessGame(manifest, { pick: botPick });
    g.startShift('office', 'tier1');
    g.time = SHIFT_LENGTH + OVERTIME.grace - 1;
    const base = g.spawner.spawn(g, 'pam').maxHp;
    g.time = SHIFT_LENGTH + OVERTIME.grace + 4 * OVERTIME.every;
    const tough = g.spawner.spawn(g, 'pam').maxHp;
    const want = 1 + OVERTIME.hpPerLevel * 5;
    assert(Math.abs(tough / base - want) < 0.02, `HP x${(tough / base).toFixed(2)}, wanted x${want}`);
  });
}
