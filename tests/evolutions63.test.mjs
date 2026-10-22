// The job-title tools' evolutions (idea 63): each one evolves from a chest, hurts users,
// and its twist does what the card says. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest, botPick, veteranSave } from './tools/bot.mjs';
import { EVOLUTIONS } from '../data/evolutions.js';
import { createWeapon, setWeaponLevel } from '../src/game/weapons/index.js';
import { spawnEnemy, damageEnemy, killEnemy } from '../src/game/enemies.js';
import { openChest } from '../src/game/upgrades.js';
import { recomputeStats } from '../src/game/player.js';

const PACK = { patchRollout: 'patchTuesday', dedupe: 'goldenRecord', fairwayDriver: 'nineteenthHole', terraform: 'terraformDestroy', assetTag: 'rfidInventory' };

// No autopilot: the player stands still, so pickups stay where they drop.
const game = () => headlessGame(manifest, { pick: botPick, save: veteranSave() });

function dummy(g, id, x, y, hp = 1e6) {
  const e = spawnEnemy(g, id, g.player.x + x, g.player.y + y);
  e.hp = e.maxHp = hp;
  e.speed = 0;
  return e;
}

// A quiet shift with only `id` (at level 1 if it is an evolution).
function quiet(id) {
  const g = game();
  g.startShift('office', 'tier1');
  g.spawner.stopped = true;
  const w = createWeapon(id, 1);
  g.player.weapons = [w];
  return { g, w };
}

const run = (g, s) => {
  for (let t = 0; t < s * 60; t++) g.update(1 / 60);
};

export function evolution63Tests() {
  test('evolutions 63: each tool evolves in a chest with its passive', async () => {
    for (const [from, into] of Object.entries(PACK)) {
      assert(EVOLUTIONS[from]?.into === into, `${from} does not evolve into ${into}`);
      const { g, w } = quiet(from);
      setWeaponLevel(w, w.def.levels.length);
      g.player.passives[EVOLUTIONS[from].passive] = 1;
      recomputeStats(g.player);
      const r = openChest(g);
      assert(r.evolved?.to === g.player.weapons[0].def && g.player.weapons[0].id === into, `${from} did not evolve: ${JSON.stringify(r.evolved && r.evolved.to.name)}`);
    }
  });

  test('evolutions 63: every evolution damages users', async () => {
    for (const into of Object.values(PACK)) {
      const { g, w } = quiet(into);
      for (let i = 0; i < 12; i++) dummy(g, 'pam', Math.cos(i) * (30 + i * 6), Math.sin(i) * (30 + i * 6));
      run(g, 6);
      assert(w.damageDone > 0, `${into} did no damage`);
    }
  });

  test('evolutions 63: Patch Tuesday stuns with every ring', async () => {
    const { g } = quiet('patchTuesday');
    const near = dummy(g, 'pam', 40, 0); // inside the first (pilot) ring
    run(g, 0.6);
    assert(near.stun > 0, 'the first ring did not stun');
  });

  test('evolutions 63: Golden Record merges a bunch into one ticket', async () => {
    const { g } = quiet('goldenRecord');
    const bunch = [];
    for (let i = 0; i < 6; i++) bunch.push(dummy(g, 'pam', 80 + (i % 3) * 6, (i - 3) * 5, 1));
    const before = g.tickets.count;
    run(g, 1);
    assert(bunch.every((e) => e.dead), 'the bunch was not closed');
    assert(g.tickets.count === before + 1, `${g.tickets.count - before} tickets dropped`);
    const t = g.tickets.items[g.tickets.count - 1];
    const want = bunch.reduce((n, e) => n + e.def.xp, 0) * 1.25;
    assert(Math.abs(t.value - want) < 1e-6, `merged ticket worth ${t.value}, wanted ${want}`);
  });

  test('evolutions 63: The 19th Hole bounces, aces drop gummies, +1 bounce at 80% sanity', async () => {
    const { g, w } = quiet('nineteenthHole');
    const p = g.player;
    w.throws = w.stats.aceEvery - 1; // the next throw is an ace
    w.timer = 0;
    dummy(g, 'pam', 60, 0, 1);
    for (let i = 0; i < 10; i++) dummy(g, 'pam', 60 + i * 30, 40, 1e6);
    g.update(1 / 60);
    const discs = [];
    for (let i = 0; i < g.projectiles.count; i++) discs.push(g.projectiles.items[i]);
    const ace = discs.find((d) => d.ace);
    assert(ace && ace.bounce === w.stats.aceBounces + 1, `ace bounces ${ace?.bounce}`);
    assert(discs.filter((d) => !d.ace).every((d) => d.bounce === w.stats.bounces + 1), 'full sanity gave no extra bounce');
    run(g, 1);
    let gummies = 0;
    for (let i = 0; i < g.items.count; i++) if (g.items.items[i].id === 'gummies') gummies++;
    assert(gummies === 1, `${gummies} gummies dropped`);
    // Below 80% sanity: no extra bounce.
    g.projectiles.clear();
    p.hp = p.maxHp * 0.5;
    const n0 = g.projectiles.count;
    w.timer = 0;
    g.update(1 / 60);
    const d = g.projectiles.items[g.projectiles.count - 1];
    assert(g.projectiles.count > n0 && d.bounce === (d.ace ? w.stats.aceBounces : w.stats.bounces), `low-sanity disc bounces ${d.bounce}`);
  });

  test('evolutions 63: gummies heal a little', async () => {
    const g = game();
    g.startShift('office', 'tier1');
    g.spawner.stopped = true;
    const p = g.player;
    p.hp = 50;
    const it = g.items.spawn();
    Object.assign(it, { id: 'gummies', x: p.x, y: p.y, t: 0, magnet: false, speed: 0 });
    it.def = (await import('../data/pickups.js')).ITEMS.gummies;
    it.spr = g.assets.sprite('gummies');
    g.update(1 / 60);
    assert(p.hp > 57 && p.hp <= 58.5, `sanity ${p.hp} after gummies`);
  });

  test('evolutions 63: RFID Inventory flags users and triples their ticket', async () => {
    const { g, w } = quiet('rfidInventory');
    const e = dummy(g, 'pam', 50, 0, 5);
    damageEnemy(g, e, 1, w, 0, 0, 0);
    assert(e.mark > 0 && e.markAmp === 0.25, 'not flagged');
    const hp = e.hp;
    damageEnemy(g, e, 2, null, 0, 0, 0);
    assert(Math.abs(hp - e.hp - 2.5) < 1e-9, `flagged user took ${hp - e.hp} from 2`);
    const before = g.tickets.count;
    killEnemy(g, e, w);
    const t = g.tickets.items[g.tickets.count - 1];
    assert(g.tickets.count === before + 1 && t.value === e.def.xp * 3, `tagged ticket worth ${t.value}`);
  });

  test('evolutions 63: Terraform Destroy keeps hitting users on live tiles', async () => {
    const { g, w } = quiet('terraformDestroy');
    const e = dummy(g, 'pam', 30, 0);
    e.kbMul = 0;
    w.timer = 0;
    let hits = 0;
    let hp = e.hp;
    for (let t = 0; t < 1.4 * 60; t++) {
      g.update(1 / 60);
      if (e.hp < hp) hits++;
      hp = e.hp;
      if (w.timer < 0.5) w.timer = 10; // only the first grid
    }
    assert(hits >= 3, `hit ${hits} times by one grid`);
  });
}
