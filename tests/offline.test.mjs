// The installed app (sw.js): after one online visit, the built game starts with no network.

import { test, assert, getBrowser } from './harness.mjs';

export const pages = ['index.html'];

export function offlineTests(base) {
  test('index.html: starts offline after one visit', async () => {
    const ctx = await (await getBrowser()).newContext();
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, (r) => r.abort());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + 'index.html');
    await page.waitForFunction(() => window.game?.newRun, null, { timeout: 30000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker, which caches as it goes
    await page.waitForFunction(() => window.game?.newRun, null, { timeout: 30000 });
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => window.game?.newRun, null, { timeout: 30000 });
    const sheets = await page.evaluate(() => Object.keys(window.game.assets.sprites).length);
    assert(sheets > 50, 'sprites missing offline');
    assert(errors.length === 0, errors.join('\n'));
    await ctx.close();
  });
}
