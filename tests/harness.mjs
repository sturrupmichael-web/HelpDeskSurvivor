// Shared test helpers: a tiny static file server for the repo, and a headless browser
// page with the game loaded. The online leaderboard is blocked, so tests never touch the
// real database.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

// Serves the repository folder on a free port. Returns { url, close() }.
export async function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

let browser = null;
export async function getBrowser() {
  browser ??= await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  return browser;
}
export async function closeBrowser() {
  await browser?.close();
  browser = null;
}

// Opens `page` (dev.html, index.html, ...) with debug mode on and waits for the game.
// Returns { page, errors, close() }; `errors` collects page errors and console errors.
// `supabase` (tests/tools/fakebase.mjs) answers the online calls instead of blocking them.
export async function openGame(base, page = 'dev.html', { width = 1280, height = 720, dpr = 1, query = '?debug', supabase = null } = {}) {
  const ctx = await (await getBrowser()).newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const p = await ctx.newPage();
  const errors = [];
  if (supabase) await supabase.attach(p);
  else await p.route(/supabase\.co/, (r) => r.abort());
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(m.text());
  });
  await p.goto(base + page + query);
  await p.waitForFunction(() => window.game?.newRun, null, { timeout: 30000 });
  return { page: p, errors, close: () => ctx.close() };
}

// Runs inside the page: starts a shift on `map` that can't be lost or interrupted by
// menus (level-ups are auto-picked, chests opened, burnout ignored), with every tool maxed
// when `kit`. Then the test steps the game by hand with step(seconds).
export const SETUP = `
window.T = {
  start(map, { kit = true, time = 0 } = {}) {
    const g = window.game;
    g.meta.data.map = map;
    g.setMap(map);
    g.newRun();
    g.player.god = true;
    g.openLevelUp = () => { g.player.pendingLevels = 0; };
    g.T_chests = 0;
    g.openChest = () => { g.T_chests++; };
    g.endRun = (won) => { g.T_ended = won ? 'won' : 'lost'; g.setState('over'); };
    if (kit) { g.debugEvolveKit(); for (let i = 0; i < 6; i++) g.debugAddWeapon(); }
    g.time = time;
  },
  // Advances the simulation by \`seconds\` of game time as fast as possible, drawing a
  // frame every half second so drawing code runs too.
  step(seconds) {
    const g = window.game;
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) {
      g.update(1 / 60);
      if (i % 30 === 0) g.render(1 / 60);
    }
  },
};
`;

// Minimal test runner: test(name, fn) registers; run() runs them in order and reports.
const tests = [];
export function test(name, fn) {
  tests.push({ name, fn });
}
export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
export async function run() {
  let failed = 0;
  for (const t of tests) {
    const t0 = Date.now();
    try {
      await t.fn();
      console.log(`  ok    ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    } catch (e) {
      failed++;
      console.log(`  FAIL  ${t.name}\n        ${String(e.stack ?? e).split('\n').slice(0, 4).join('\n        ')}`);
    }
  }
  tests.length = 0;
  return failed;
}
