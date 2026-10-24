// Save upgrade tests (src/game/meta.js upgradeSave): old, partial, broken and newer saves.

import { test, assert, openGame } from './harness.mjs';

export const pages = ['dev.html'];

export function saveTests(base) {
  test('saves: old, partial, broken and newer saves upgrade safely', async () => {
    const { page, errors, close } = await openGame(base, 'dev.html');
    const r = await page.evaluate(async () => {
      const { upgradeSave, SAVE_VERSION } = await import('/src/game/meta.js');
      const old = {
        pay: 50, shop: { chair: 99, removed_item: 2 }, unlocked: ['tier1', 'neteng', 'removed_tech'], selected: 'removed_tech',
        map: 'removed_map', mapsWon: ['office', 'removed_map'], mapBest: { office: { time: 300 }, removed_map: { time: 1 } },
        best: { time: 5 }, wiki: { closed: { pam: 3 }, met: [], tools: ['x'], passives: [] }, achievements: { win: 1 },
      };
      return {
        SAVE_VERSION,
        old: upgradeSave(old),
        newer: upgradeSave({ version: SAVE_VERSION + 1, unlocked: ['tier1', 'future_tech'], shop: { future_item: 1 } }),
        empty: upgradeSave(null),
        junk: upgradeSave('not a save'),
        again: JSON.stringify(upgradeSave(upgradeSave(old))) === JSON.stringify(upgradeSave(old)),
      };
    });
    const o = r.old;
    assert(o.version === r.SAVE_VERSION, 'version not set');
    assert(o.pay === 50 && o.achievements.win === 1 && o.wiki.closed.pam === 3, 'progress was lost');
    assert(o.shop.chair === 5 && !('removed_item' in o.shop), 'shop not cleaned: ' + JSON.stringify(o.shop));
    assert(o.unlocked.join() === 'tier1,neteng', 'techs not cleaned: ' + o.unlocked);
    assert(o.selected === 'tier1' && o.map === 'office', 'selection not reset');
    assert(o.mapsWon.join() === 'office' && !o.mapBest.removed_map && o.mapBest.office.tickets === 0, 'maps not cleaned');
    assert(o.best.tickets === 0 && o.best.time === 5, 'records not filled in');
    assert(r.newer.unlocked.includes('future_tech') && r.newer.shop.future_item === 1, 'a newer save lost data');
    assert(r.empty.unlocked.join() === 'tier1' && r.junk.pay === 0, 'blank save is wrong');
    assert(r.again, 'upgrading twice changes the save');
    assert(errors.length === 0, errors.join('\n'));
    await close();
  });
}
