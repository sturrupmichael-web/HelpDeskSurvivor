// Runs every test: `npm test`. Builds nothing; run `npm run build` first to test the
// published page (index.html) as well as the source (dev.html).
//   npm test             everything
//   npm test -- quick    skip the published page (index.html)
//   npm test -- node     only the game logic in Node (no browser needed)
//
// Every tests/*.test.mjs file is picked up by itself; its exported ...Tests() function
// registers the tests. A file that exports `pages` (e.g. ['dev.html', 'index.html']) needs
// the browser and is called as fn(serverUrl, page) once per page; any other file is plain
// Node and is called with no arguments.

import { existsSync, readdirSync } from 'node:fs';
import { serve, closeBrowser, run, ROOT } from './harness.mjs';

const only = (flag) => process.argv.includes(flag);
const files = readdirSync(ROOT + 'tests').filter((f) => f.endsWith('.test.mjs')).sort();
const suites = [];
for (const f of files) {
  const mod = await import(`./${f}`);
  const fns = Object.entries(mod).filter(([name, v]) => typeof v === 'function' && name.endsWith('Tests'));
  if (!fns.length) throw new Error(`tests/${f} exports no ...Tests() function`);
  for (const [, fn] of fns) suites.push({ fn, pages: mod.pages ?? null });
}

let failed = 0;
console.log('Game logic in Node (no browser)');
for (const s of suites) if (!s.pages) s.fn();
failed += await run();
if (!only('node')) {
  const server = await serve();
  try {
    const pages = [['dev.html', 'Source (dev.html)']];
    if (existsSync(ROOT + 'index.html') && !only('quick')) pages.push(['index.html', 'Published page (index.html)']);
    for (const [page, title] of pages) {
      console.log(title);
      for (const s of suites) if (s.pages?.includes(page)) s.fn(server.url, page);
      failed += await run();
    }
  } finally {
    await closeBrowser();
    server.close();
  }
}
console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
