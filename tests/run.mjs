// Runs every test: `npm test`. Builds nothing; run `npm run build` first to test the
// published page (index.html) as well as the source (dev.html).
//   npm test             everything
//   npm test -- quick    skip the slower per-map and boss runs on index.html

import { existsSync } from 'node:fs';
import { serve, closeBrowser, run, ROOT } from './harness.mjs';
import { gameTests } from './game.test.mjs';
import { saveTests } from './saves.test.mjs';
import { offlineTests } from './offline.test.mjs';

const server = await serve();
let failed = 0;
try {
  console.log('Source (dev.html)');
  gameTests(server.url, 'dev.html');
  saveTests(server.url);
  failed += await run();
  if (existsSync(ROOT + 'index.html') && !process.argv.includes('quick')) {
    console.log('Published page (index.html)');
    gameTests(server.url, 'index.html');
    offlineTests(server.url);
    failed += await run();
  }
} finally {
  await closeBrowser();
  server.close();
}
console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
