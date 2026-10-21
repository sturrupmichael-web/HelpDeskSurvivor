// Shift Policies (data/policies.js, src/game/policies.js) in plain Node: every policy
// changes what it says, multipliers and pay add up, and odd saves are cleaned.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPilot, botPick, veteranSave } from './tools/bot.mjs';
import { POLICIES, POLICY_ORDER, POLICY_RULES } from '../data/policies.js';
import { combinePolicies, policyMult, cleanPolicies, rollReorg, modsString, parseMods } from '../src/game/policies.js';
import { upgradeSave } from '../src/game/meta.js';
import { rollChoices, findEvolution } from '../src/game/upgrades.js';
import { dropTicket } from '../src/game/pickups.js';

const start = (policies, save = veteranSave()) => {
  const g = headlessGame(manifest, { pick: botPick, autopilot: botPilot, save: { ...save, policies } });
  g.startShift('office', 'tier1');
  return g;
};

export function policyTests() {
  test('policies: every policy is well formed and plays a minute', async () => {
    for (const id of POLICY_ORDER) {
      const p = POLICIES[id];
      assert(p.name && p.desc && p.flavor && p.icon && ['bad', 'mixed', 'perk'].includes(p.group), `${id}: missing fields`);
      assert(p.group === 'perk' ? p.mult < 1 : p.mult > 1, `${id}: ${p.group} policy with x${p.mult}`);
      const g = start([id]);
      assert(g.policy.ids.join() === id, `${id}: not applied`);
      g.player.god = true;
      g.playShift(60);
      assert(g.time >= 60 && g.state === 'run', `${id}: shift stalled`);
    }
  });

  test('policies: the effects do what the cards say', async () => {
    const plain = start([]);
    const base = { hp: plain.player.maxHp, cd: plain.player.stats.cooldown, dt: plain.player.stats.damageTaken };
    const e = (g, id) => g.spawner.spawn(g, id);
    const pam = e(plain, 'pam');
    let g = start(['budgetCuts', 'hiringFreeze']);
    assert(g.player.maxWeapons === 4 && g.player.maxPassives === 3, 'slots not cut');
    g = start(['casualFriday', 'mandatoryFun']);
    const tough = e(g, 'pam');
    assert(Math.abs(tough.speed / pam.speed - 1.25) < 0.01 && Math.abs(tough.maxHp / pam.maxHp - 1.4) < 0.01, 'user speed/HP not changed');
    g = start(['glassDesk', 'auditWeek']);
    assert(g.player.maxHp === Math.round(base.hp * 0.6) && g.player.hp === g.player.maxHp, `Glass Desk sanity ${g.player.hp}/${g.player.maxHp}`);
    assert(Math.abs(g.player.stats.damageTaken / base.dt - 2) < 0.01, 'Audit Week not double damage');
    g = start(['legacyHardware']);
    assert(g.player.stats.cooldown > base.cd, 'Legacy Hardware cooldowns not longer');
    g = start(['vendorLockIn']);
    assert(g.player.weapons.length === 2 && g.player.weapons.every((w) => w.level === 3) && g.player.maxWeapons === 2, 'Vendor Lock-In start wrong');
    assert(rollChoices(g, 20).every((c) => c.kind !== 'weapon' || c.level > 1), 'Vendor Lock-In offered a new tool');
    g = start(['onboardingBuddy']);
    assert(g.player.weapons.length === 2, 'Onboarding Buddy: no second tool');
    g = start(['hotDesking']);
    assert(rollChoices(g).length === 2, 'Hot Desking: not 2 cards');
    g = start(['noPizza']);
    assert(rollChoices(g, 99).every((c) => c.id !== 'snackDrawer'), 'No Pizza Policy offered Snack Drawer');
    g = start(['longWeekend']);
    g.player.hp = -50;
    g.update(1 / 60);
    assert(g.state !== 'over' && g.player.hp > 0 && g.player.longWeekend === 0, 'Long Weekend did not save the shift');
    g = start(['mondayMorning']);
    g.playShift(2);
    assert(g.enemies.count >= 45, `Monday Morning queue only ${g.enemies.count}`);
    g = start(['escalated']);
    g.player.weapons.length = 0;
    g.player.god = true;
    g.time = 598;
    g.playShift(601);
    assert(g.bossAlive() && g.boss.maxHp === Math.round(g.boss.def.hp * 1.5), 'Escalated boss HP');
    g = start(['ticketBlitz']);
    g.player.weapons.length = 0;
    const far = dropTicket(g, 5000, 5000, 1);
    g.playShift(11);
    assert(!g.tickets.items.slice(0, g.tickets.count).includes(far), 'Ticket Blitz ticket still there after 10 s');
    g = start(['changeFreeze']);
    g.debugEvolveKit();
    assert(!findEvolution(g.player), 'Change Freeze still evolves');
    plain.debugEvolveKit();
    assert(findEvolution(plain.player), 'evolution kit does not evolve without Change Freeze');
  });

  test('policies: multipliers, pay, score and clean-up', async () => {
    assert(policyMult([]) === 1 && policyMult(['workFromHome']) === 0.8, 'single multipliers');
    assert(policyMult(['auditWeek', 'changeFreeze', 'budgetCuts']) === Math.round(1.4 * 1.4 * 1.35 * 100) / 100, 'stacking');
    assert(policyMult(['longWeekend', 'workFromHome', 'onboardingBuddy']) >= POLICY_RULES.minMult, 'not clamped');
    assert(policyMult(['auditWeek'], true) === 1.54, 'Reorg bonus');
    assert(cleanPolicies(['noPizza', 'teamLunch', 'bogus', 'noPizza', 'auditWeek', 'escalated', 'budgetCuts']).join() === 'noPizza,auditWeek,escalated', 'clean-up');
    assert(rollReorg(POLICY_ORDER).every((id) => POLICIES[id].group === 'bad'), 'Reorg picked a non-bad policy');
    assert(parseMods(modsString(combinePolicies(['casualFriday'], true))).join() === 'casualFriday,reorg', 'mods string');
    const s = upgradeSave({ policies: ['budgetCuts', 'gone', 'teamLunch', 'noPizza'], reorg: true, policiesWon: ['gone', 'budgetCuts'] });
    assert(s.policies.join() === 'budgetCuts,teamLunch' && s.reorg && s.policiesWon.join() === 'budgetCuts', 'save not cleaned: ' + JSON.stringify(s));
    // Pay and score.
    const plain = start([]);
    plain.time = 300;
    plain.score.csat = 1000;
    plain.endRun(false);
    const hard = start(['auditWeek']);
    hard.time = 300;
    hard.score.csat = 1000;
    hard.endRun(false);
    const a = plain.lastShift;
    const b = hard.lastShift;
    assert(b.score === 1400 && a.score === 1000, `score ${a.score} / ${b.score}`);
    assert(Math.abs(b.pay / a.pay - 1.4) < 0.05, `pay ${a.pay} -> ${b.pay}`);
    // Training never has policies.
    const t = start(['auditWeek']);
    t.startTutorial();
    assert(!t.policy.ids.length, 'training shift had policies');
  });

  test('policies: unlocks open with map wins and a no-evolution win', async () => {
    const g = headlessGame(manifest, { pick: botPick });
    const m = g.meta;
    const open = () => POLICY_ORDER.filter((id) => m.policyUnlocked(id, true));
    assert(open().join() === 'casualFriday,budgetCuts,workFromHome,teamLunch', 'starters: ' + open());
    const s = { map: 'office', time: 1200, kills: 10, csat: 10, won: true, policies: ['budgetCuts'], evolutions: 0 };
    const r = m.finishShift(s);
    assert(r.policiesOpened && r.newPolicies.includes('mandatoryFun') && r.newPolicies.includes('changeFreeze'), 'office win unlocks: ' + r.newPolicies);
    assert(m.data.policiesWon.includes('budgetCuts'), 'win stamp missing');
    m.data.policies = ['auditWeek'];
    m.setPolicies(['auditWeek', 'casualFriday']);
    assert(m.data.policies.join() === 'casualFriday', 'locked policy was kept');
  });
}
