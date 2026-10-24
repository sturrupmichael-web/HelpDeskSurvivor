// Hardcore (idea 6, data/policies.js HARDCORE) in plain Node: opens after every map is
// won, makes the shift harder, takes away comebacks and perks, and doubles pay and score.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPick, veteranSave } from './tools/bot.mjs';
import { HARDCORE } from '../data/policies.js';
import { MAP_ORDER } from '../data/maps.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { SHIFT_LENGTH, OVERTIME } from '../data/waves.js';
import { combinePolicies, modsString, parseMods } from '../src/game/policies.js';
import { upgradeSave } from '../src/game/meta.js';
import { rollChoices } from '../src/game/upgrades.js';

const start = (hardcore, policies = [], save = veteranSave()) => {
  const g = headlessGame(manifest, { pick: botPick, save: { ...save, policies, hardcore } });
  g.startShift('office', 'tier1');
  return g;
};

export function hardcoreTests() {
  test('hardcore: opens once every map is won', async () => {
    const g = headlessGame(manifest, { pick: botPick });
    const m = g.meta;
    m.setHardcore(true);
    assert(!m.hardcoreOpen() && !m.data.hardcore && !m.hardcoreOn(), 'Hardcore open on a fresh save');
    let opened = false;
    for (const map of MAP_ORDER) opened = m.finishShift({ map, time: 1200, kills: 1, csat: 1, won: true, policies: [] }).hardcoreOpened;
    assert(opened && m.hardcoreOpen(), 'last map win did not open Hardcore');
    assert(!m.finishShift({ map: 'office', time: 1200, kills: 1, csat: 1, won: true, policies: [] }).hardcoreOpened, 'opened twice');
    m.setHardcore(true);
    assert(m.hardcoreOn(), 'switch did not stick');
    g.newRun('tier1');
    assert(g.policy.hardcore, 'next shift not Hardcore');
  });

  test('hardcore: harder shift, no comebacks, no perks', async () => {
    const plain = start(false);
    const hc = start(true, ['casualFriday', 'workFromHome', 'longWeekend']);
    assert(hc.policy.hardcore && hc.policy.ids.join() === 'casualFriday', 'perks kept: ' + hc.policy.ids);
    const a = plain.spawner.spawn(plain, 'pam');
    const b = hc.spawner.spawn(hc, 'pam');
    assert(Math.abs(b.maxHp / a.maxHp - HARDCORE.fx.enemyHp) < 0.01, `user HP x${(b.maxHp / a.maxHp).toFixed(2)}`);
    for (const g of [plain, hc]) {
      g.player.god = true;
      g.playShift(30);
    }
    assert(hc.enemies.count >= plain.enemies.count * 1.3, `users ${plain.enemies.count} -> ${hc.enemies.count}`);
    // Overtime ramps up after the shorter grace.
    hc.time = SHIFT_LENGTH + HARDCORE.fx.otGrace;
    assert(hc.spawner.overtimeLevel(hc) === 1, 'Hardcore overtime grace');
    plain.time = SHIFT_LENGTH + HARDCORE.fx.otGrace;
    assert(plain.spawner.overtimeLevel(plain) === 0 && HARDCORE.fx.otGrace < OVERTIME.grace, 'normal grace changed');
    // Union Rep (maxed in the veteran save) and Extended Warranty do nothing.
    assert(plain.player.revives > 0 && hc.player.revives === 0, 'Union Rep still on call');
    assert(rollChoices(hc, 99).every((c) => c.id !== 'warranty'), 'Extended Warranty offered');
    const g = start(true);
    g.player.hp = -50;
    g.update(1 / 60);
    assert(g.state === 'over', 'came back from burnout in Hardcore');
  });

  test('hardcore: double pay and score, tagged on the board, achievements', async () => {
    const run = (hardcore, policies) => {
      const g = start(hardcore, policies);
      g.time = 300;
      g.score.csat = 1000;
      g.endRun(false);
      return g.lastShift;
    };
    const a = run(false, []);
    const b = run(true, []);
    const c = run(true, ['auditWeek', 'changeFreeze', 'budgetCuts']);
    assert(b.score === 2000 && b.hardcore && Math.abs(b.pay / a.pay - 2) < 0.05, `score ${b.score}, pay ${a.pay} -> ${b.pay}`);
    assert(c.policyMult === 2 * 2.65 && c.score === 5300, `stacked x${c.policyMult}`);
    assert(parseMods(modsString(combinePolicies(['casualFriday'], false, true))).join() === 'casualFriday,hardcore', 'mods string');
    // Achievements: a Hardcore win, then one on every map.
    const g = start(true);
    const m = g.meta;
    const has = (id) => !!m.data.achievements?.[id];
    for (const map of MAP_ORDER) {
      g.startShift(map, 'tier1');
      g.time = 1300;
      g.endRun(true);
      assert(has('hardcore_win'), 'No Comebacks not unlocked');
      assert(has('hardcore_all') === (map === MAP_ORDER.at(-1)), `Iron Helpdesk after ${map}`);
    }
    assert(ACHIEVEMENTS.some((x) => x.id === 'hardcore_all'), 'achievement missing');
    const s = upgradeSave({ hardcore: 'yes', hardcoreWon: ['office', 'gone', 'office'] });
    assert(s.hardcore === true && s.hardcoreWon.join() === 'office', 'save not cleaned: ' + JSON.stringify(s));
  });
}
