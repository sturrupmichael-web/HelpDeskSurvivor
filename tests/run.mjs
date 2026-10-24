// Runs every test: `npm test`. Builds nothing; run `npm run build` first to test the
// published page (index.html) as well as the source (dev.html).
//   npm test             everything
//   npm test -- quick    skip the published page (index.html)
//   npm test -- node     only the game logic in Node (no browser needed)

import { existsSync } from 'node:fs';
import { serve, closeBrowser, run, ROOT } from './harness.mjs';
import { gameTests } from './game.test.mjs';
import { saveTests } from './saves.test.mjs';
import { offlineTests } from './offline.test.mjs';
import { simTests } from './sim.test.mjs';
import { policyTests } from './policies.test.mjs';
import { techTests } from './techs.test.mjs';
import { evolution63Tests } from './evolutions63.test.mjs';
import { comboTests } from './combos.test.mjs';
import { overtimeTests } from './overtime.test.mjs';
import { collisionTests } from './collision.test.mjs';
import { hardcoreTests } from './hardcore.test.mjs';
import { evoPairTests } from './evopair.test.mjs';

const only = (flag) => process.argv.includes(flag);
let failed = 0;
console.log('Game logic in Node (no browser)');
simTests();
policyTests();
techTests();
evolution63Tests();
comboTests();
overtimeTests();
collisionTests();
hardcoreTests();
evoPairTests();
failed += await run();
if (!only('node')) {
  const server = await serve();
  try {
    console.log('Source (dev.html)');
    gameTests(server.url, 'dev.html');
    saveTests(server.url);
    failed += await run();
    if (existsSync(ROOT + 'index.html') && !only('quick')) {
      console.log('Published page (index.html)');
      gameTests(server.url, 'index.html');
      offlineTests(server.url);
      failed += await run();
    }
  } finally {
    await closeBrowser();
    server.close();
  }
}
console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
