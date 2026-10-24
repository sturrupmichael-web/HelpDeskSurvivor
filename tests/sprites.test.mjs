// The committed sprite sheets (sprites/out) match the sprite definitions (sprites/defs):
// someone who edits a definition and forgets `node sprites/build.js` gets a red test,
// not old art in the game. Plain Node, no browser.

import { execFileSync } from 'node:child_process';
import { test, assert, ROOT } from './harness.mjs';

export function spriteTests() {
  test('sprites: sprites/out is up to date with sprites/defs', () => {
    let out = '';
    try {
      out = execFileSync(process.execPath, ['sprites/build.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      assert(false, e.stdout.trim());
    }
    assert(/up to date/.test(out), out);
  });
}
