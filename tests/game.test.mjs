// Game tests: menus, every map, every boss, the training shift, drawing, and a
// performance budget. Each test drives the real game in a headless browser, stepping the
// simulation faster than real time.

import { test, assert, openGame, SETUP } from './harness.mjs';

const MAPS = ['office', 'server', 'callcenter', 'garage', 'merger'];
const MAP_BOSS = { office: 'Major Incident', server: "The Rat's Nest", callcenter: 'The Angry Caller', garage: 'The Night Janitor', merger: 'The Hostile Takeover' };

export function gameTests(base, page) {
  const open = async (opts) => {
    const g = await openGame(base, page, opts);
    await g.page.evaluate(SETUP);
    return g;
  };
  const noErrors = (errors) => assert(errors.length === 0, 'page errors:\n' + errors.join('\n'));

  test(`${page}: loads to the title screen`, async () => {
    const { page: p, errors, close } = await open();
    assert(await p.locator('.panel.title').count(), 'no title screen');
    noErrors(errors);
    await close();
  });

  test(`${page}: every menu screen opens`, async () => {
    const { page: p, errors, close } = await open();
    const opened = await p.evaluate(() => {
      const g = window.game;
      const s = g.screens;
      const out = {};
      const shown = (name, fn) => {
        s.hide();
        fn();
        out[name] = s.root.innerHTML.length > 50;
      };
      shown('title', () => s.title());
      shown('clock in: tech', () => s.shiftSetup('char'));
      shown('clock in: map', () => s.shiftSetup('map'));
      shown('characters', () => s.characters());
      shown('shop', () => s.shop());
      shown('maps', () => s.maps());
      shown('leaderboard', () => s.leaderboard());
      shown('achievements', () => s.achievementsScreen());
      shown('stats', () => s.stats());
      shown('settings', () => s.settings(() => s.title()));
      shown('training offer', () => s.trainingOffer());
      for (const act of ['wiki', 'account', 'news']) shown(act, () => (s.title(), s.root.querySelector(`[data-act="${act}"]`)?.click()));
      g.newRun();
      shown('pause', () => g.pause());
      g.resume();
      shown('level up', () => g.openLevelUp());
      shown('chest', () => g.openChest());
      shown('shift summary', () => g.endRun(false));
      return out;
    });
    const missing = Object.entries(opened).filter(([, ok]) => !ok).map(([n]) => n);
    assert(!missing.length, 'these screens showed nothing: ' + missing.join(', '));
    noErrors(errors);
    await close();
  });

  for (const map of MAPS) {
    test(`${page}: ${map}: early shift and a late-game horde run cleanly`, async () => {
      const { page: p, errors, close } = await open();
      const r = await p.evaluate((map) => {
        T.start(map, { kit: false });
        T.step(90);
        const early = { time: window.game.time, kills: window.game.score.kills, level: window.game.player.level };
        T.start(map, { kit: true, time: 900 });
        T.step(30);
        return { early, enemies: window.game.enemies.count, state: window.game.state };
      }, map);
      assert(r.early.kills > 20, `only ${r.early.kills} users closed in 90 s`);
      assert(r.early.level > 2, 'no level-ups in 90 s');
      assert(r.enemies > 100, `late horde too small (${r.enemies})`);
      assert(r.state === 'run', 'shift stopped: ' + r.state);
      noErrors(errors);
      await close();
    });

    test(`${page}: ${map}: ${MAP_BOSS[map]} attacks and can be closed`, async () => {
      const { page: p, errors, close } = await open();
      const r = await p.evaluate((map) => {
        T.start(map, { kit: false, time: 594 });
        const g = window.game;
        g.player.weapons.length = 1; // keep the boss alive long enough to see it attack
        const states = new Set();
        let name = null;
        for (let s = 0; s < 40; s++) {
          T.step(1);
          if (g.bossAlive()) {
            name = g.boss.def.name;
            states.add(g.boss.ai?.state);
          }
        }
        if (!name) return { name };
        // Close every piece of it (walking up to bosses that keep their distance).
        g.debugEvolveKit();
        for (let i = 0; i < 8 && g.bossAlive(); i++) {
          for (const [e] of g.bossParts) if (!e.dead) {
            e.hp = 1;
            g.player.x = e.x + 30;
            g.player.y = e.y;
          }
          T.step(3);
        }
        T.step(3); // walk onto the dropped chest
        let chest = g.T_chests > 0;
        for (let i = 0; i < g.items.count; i++) if (g.items.items[i].id === 'chest') chest = true;
        return { name, states: [...states], alive: g.bossAlive(), chest, bosses: g.achievements.run.bosses };
      }, map);
      assert(r.name === MAP_BOSS[map] || r.name?.startsWith(MAP_BOSS[map]), `expected ${MAP_BOSS[map]}, got ${r.name}`);
      assert(r.states.length > 1, `boss never attacked (states seen: ${r.states})`);
      assert(!r.alive, 'boss could not be closed');
      assert(r.chest, 'no Change Approved chest after the boss');
      noErrors(errors);
      await close();
    });
  }

  test(`${page}: The Executive ends the shift as a win`, async () => {
    const { page: p, errors, close } = await open();
    const r = await p.evaluate(() => {
      T.start('office', { kit: true, time: 1194 });
      const g = window.game;
      T.step(10);
      const name = g.bossAlive() ? g.boss.def.name : null;
      if (g.bossAlive()) g.boss.hp = 1;
      T.step(8);
      return { name, ended: g.T_ended };
    });
    assert(r.name?.startsWith('The Executive'), 'The Executive did not show up: ' + r.name);
    assert(r.ended === 'won', 'shift did not end as a win: ' + r.ended);
    noErrors(errors);
    await close();
  });

  test(`${page}: training shift runs`, async () => {
    const { page: p, errors, close } = await open();
    await p.evaluate(() => {
      window.game.startTutorial();
      window.game.player.god = true;
      T.step(45);
    });
    noErrors(errors);
    await close();
  });

  test(`${page}: phone screen draws at world size and menus stop redrawing`, async () => {
    const { page: p, errors, close } = await open({ width: 390, height: 844, dpr: 3 });
    const r = await p.evaluate(async () => {
      const g = window.game;
      T.start('office', { kit: true, time: 300 });
      T.step(5);
      let n = 0;
      const draw = g.ctx.drawImage.bind(g.ctx);
      g.ctx.drawImage = (...a) => (n++, draw(...a));
      g.pause();
      await new Promise((r) => setTimeout(r, 600));
      const paused = n;
      g.ctx.drawImage = draw;
      return { w: g.canvas.width, h: g.canvas.height, css: g.canvas.style.width, zoom: g.view.scale, view: [g.view.w, g.view.h], paused };
    });
    assert(r.w === r.view[0] && r.h === r.view[1], `canvas ${r.w}x${r.h} is not the view size ${r.view}`);
    assert(r.w < 400 && r.zoom >= 3, `phone canvas should be small and zoomed (${r.w}px, x${r.zoom})`);
    assert(parseFloat(r.css) >= 390, 'canvas does not fill the screen: ' + r.css);
    assert(r.paused < 1500, `the paused screen kept drawing (${r.paused} sprites in 0.6 s)`);
    noErrors(errors);
    await close();
  });

  test(`${page}: performance budget with 900 users`, async () => {
    const { page: p, errors, close } = await open();
    const r = await p.evaluate(() => {
      const g = window.game;
      T.start('office', { kit: false, time: 1100 });
      g.player.weapons.length = 1;
      g.debugSpawn(undefined, 900 - g.enemies.count);
      T.step(2);
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) g.update(1 / 60);
      const tick = (performance.now() - t0) / 300;
      const t1 = performance.now();
      for (let i = 0; i < 60; i++) g.render(1 / 60);
      const frame = (performance.now() - t1) / 60;
      return { tick, frame, enemies: g.enemies.count };
    });
    console.log(`        ${r.enemies} users: ${r.tick.toFixed(2)} ms per tick, ${r.frame.toFixed(2)} ms per frame (budget 16.7 ms for both)`);
    assert(r.enemies > 800, 'horde did not fill up');
    assert(r.tick < 6, `simulation too slow: ${r.tick.toFixed(2)} ms per tick`);
    assert(r.frame < 12, `drawing too slow: ${r.frame.toFixed(2)} ms per frame`);
    noErrors(errors);
    await close();
  });
}
