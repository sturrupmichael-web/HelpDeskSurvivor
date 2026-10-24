// The job-title techs (ideas 52-62): each one plays with the bot, and each perk and new
// tool does what its card says. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPilot, botPick, veteranSave } from './tools/bot.mjs';
import { CHARACTERS } from '../data/player.js';
import { WEAPONS } from '../data/weapons.js';
import { createWeapon } from '../src/game/weapons/index.js';
import { spawnEnemy, damageEnemy, killEnemy } from '../src/game/enemies.js';
import { rollChoices } from '../src/game/upgrades.js';

const PACK = ['supervisor', 'sysops', 'director', 'crmAnalyst', 'crmManager', 'cloudEng', 'syseng', 'euc', 'secmgr', 'seceng', 'assets'];
const NEW_TOOLS = ['patchRollout', 'dedupe', 'fairwayDriver', 'terraform', 'assetTag'];

const game = () => headlessGame(manifest, { pick: botPick, autopilot: botPilot, save: veteranSave() });

// A user standing still at (x, y) relative to the player.
function dummy(g, id, x, y, hp = 1e6) {
  const e = spawnEnemy(g, id, g.player.x + x, g.player.y + y);
  e.hp = e.maxHp = hp;
  e.speed = 0;
  return e;
}

export function techTests() {
  for (const tech of PACK) {
    test(`techs: ${tech} plays 3 minutes with the bot`, async () => {
      const g = game();
      g.startShift('office', tech);
      g.player.god = true;
      g.playShift(180);
      const w = g.player.weapons[0];
      assert(w.id === CHARACTERS[tech].starter, `${tech} started with ${w.id}`);
      // Out-of-Office Reply only hits users that touch you, so a bot that dodges well can go
      // 3 minutes without a hit: count every tool the tech started with.
      const starters = [...g.player.weapons.filter((x) => [CHARACTERS[tech].starter, ...(CHARACTERS[tech].alsoStarts ?? [])].includes(x.id)), ...g.player.innate];
      assert(starters.some((x) => x.damageDone > 0), `${tech}'s starting tools did no damage`);
      assert(g.score.kills > 20, `${tech} closed only ${g.score.kills}`);
    });
  }

  test('techs: every new tool damages users at every level', async () => {
    const g = game();
    for (const id of NEW_TOOLS) {
      for (let lvl = 1; lvl <= WEAPONS[id].levels.length; lvl++) {
        g.startShift('office', 'tier1');
        g.spawner.stopped = true;
        const w = createWeapon(id, 1);
        w.level = lvl;
        w.stats = w.def.levels[lvl - 1];
        g.player.weapons = [w];
        for (let i = 0; i < 12; i++) dummy(g, 'pam', Math.cos(i) * (30 + i * 4), Math.sin(i) * (30 + i * 4));
        for (let t = 0; t < 6 * 60; t++) g.update(1 / 60);
        assert(w.damageDone > 0, `${id} level ${lvl} did no damage`);
      }
    }
  });

  test('techs: the perks do what the cards say', async () => {
    const g = game();
    // Supervisor: two interns with no tool slot, stronger with level.
    g.startShift('office', 'supervisor');
    assert(g.player.innate.length === 1 && g.player.weapons.length === 1, 'supervisor team missing');
    g.playShift(10);
    assert(g.player.innate[0].minions.length === 2, 'not two interns');
    // Systems Operations Manager: 7 tool slots.
    g.startShift('office', 'sysops');
    assert(g.player.maxWeapons === 7, `sysops has ${g.player.maxWeapons} slots`);
    // IT Director: +25% pay, chests hold one more item.
    g.startShift('office', 'director');
    g.player.hp = -1e9;
    g.player.revives = g.player.warranty = g.player.longWeekend = 0;
    const r = g.playShift(5);
    assert(r.payMult === 1.25, 'director pay multiplier missing');
    // CRM Analyst: +20% luck.
    g.startShift('office', 'crmAnalyst');
    assert(Math.abs(g.player.stats.luck - 1.2) < 1e-9, `luck ${g.player.stats.luck}`);
    // CRM Manager: walk-ups hurt more.
    g.startShift('office', 'crmManager');
    g.spawner.stopped = true;
    dummy(g, 'walkup', 0, 0);
    g.player.weapons = [];
    const hp0 = g.player.hp;
    g.update(1 / 60);
    const lost = hp0 - g.player.hp;
    assert(Math.abs(lost - 14 * 1.25 * g.player.stats.damageTaken) < 0.01, `walk-up hit for ${lost}`);
    // Cloud Engineer: +2% damage a minute.
    g.startShift('office', 'cloudEng');
    g.player.god = true;
    g.openLevelUp = () => (g.player.pendingLevels = 0); // no damage cards in the way
    const d0 = g.player.stats.damage;
    g.playShift(121);
    assert(Math.abs(g.player.stats.damage - d0 - 0.04) < 1e-9, `cloud damage ${d0} -> ${g.player.stats.damage}`);
    // EUC Engineer: Reimage turns up more often.
    g.startShift('office', 'euc');
    let seen = 0;
    for (let i = 0; i < 3000; i++) if (rollChoices(g).some((c) => c.id === 'reimage')) seen++;
    g.startShift('office', 'tier1');
    let base = 0;
    for (let i = 0; i < 3000; i++) if (rollChoices(g).some((c) => c.id === 'reimage')) base++;
    assert(seen > base * 1.6, `reimage offered ${seen} vs ${base}`);
    // Security Manager: the phishing test freezes users on screen.
    g.startShift('office', 'secmgr');
    g.spawner.stopped = true;
    const victim = dummy(g, 'pam', 80, 0);
    g.spawner.stopped = false;
    g.perkT.phishTest = 59.99;
    g.update(1 / 30);
    assert(victim.stun > 0.5, 'phishing test did not freeze');
    // Asset Management Analyst: a moving box turns up.
    g.startShift('office', 'assets');
    g.player.god = true;
    g.perkT.boxEvery = 44.99;
    g.update(1 / 30);
    let boxes = 0;
    for (let i = 0; i < g.enemies.count; i++) if (g.enemies.items[i].def.sprite === 'moving_box') boxes++;
    assert(boxes === 1, `${boxes} moving boxes`);
  });

  test('techs: bonus damage and tagged tickets', async () => {
    const g = game();
    g.startShift('office', 'seceng');
    g.spawner.stopped = true;
    const phish = dummy(g, 'phish', 50, 0);
    const pam = dummy(g, 'pam', -50, 0);
    damageEnemy(g, phish, 10, null, 0, 0, 0);
    damageEnemy(g, pam, 10, null, 0, 0, 0);
    assert(phish.maxHp - phish.hp === 20 && pam.maxHp - pam.hp === 10, 'security engineer bonus wrong');
    // Dedupe hits Daves twice as hard; Asset Tag doubles the ticket.
    g.startShift('office', 'tier1');
    g.spawner.stopped = true;
    const dedupe = createWeapon('dedupe', 1);
    const dave = dummy(g, 'dave', 50, 0);
    damageEnemy(g, dave, 10, dedupe, 0, 0, 0);
    assert(dave.maxHp - dave.hp === 20, 'dedupe bonus wrong');
    const tag = createWeapon('assetTag', 2);
    const tagged = dummy(g, 'pam', 0, 60, 5);
    damageEnemy(g, tagged, 1, tag, 0, 0, 0);
    const before = g.tickets.count;
    killEnemy(g, tagged, tag);
    const t = g.tickets.items[g.tickets.count - 1];
    assert(g.tickets.count === before + 1 && t.value === tagged.def.xp * 2, `tagged ticket worth ${t.value}`);
  });
}
