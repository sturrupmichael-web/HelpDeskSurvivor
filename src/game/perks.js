// Tech perks that act on the floor on a timer, keyed by the field that turns them on in
// data/player.js (e.g. a tech with `phishTest: {...}` runs FLOOR_PERKS.phishTest). Each
// one gets the game, its config from the tech and the seconds since it last fired, and
// returns true when it fired (the timer starts again). A new floor perk is an entry here
// plus the field on the tech; the other perks are numbers read where they apply (see the
// list at the top of data/player.js).

import { stunEnemy, spawnEnemy } from './enemies.js';
import { sfx } from '../engine/audio.js';

export const FLOOR_PERKS = {
  // Security Manager: every `every` s, everyone on screen stops `stun` s to read the email.
  phishTest(game, cfg, t) {
    if (t < cfg.every) return false;
    const p = game.player;
    const hw = game.view.w / 2 + 16;
    const hh = game.view.h / 2 + 16;
    const pool = game.enemies;
    for (let i = 0; i < pool.count; i++) {
      const e = pool.items[i];
      if (!e.dead && Math.abs(e.x - game.camera.x) < hw && Math.abs(e.y - game.camera.y) < hh) stunEnemy(e, cfg.stun);
    }
    game.fx.ring(p.x, p.y, Math.max(hw, hh), '#7a4ea0', 0.5);
    game.fx.text(p.x, p.y - 30, 'PHISHING TEST', '#ffcd75');
    sfx('error');
    return true;
  },
  // Asset Management Analyst: every `boxEvery` s, a moving box near you (at most 3 out).
  boxEvery(game, every, t) {
    if (t < every) return false;
    const p = game.player;
    let boxes = 0;
    const pool = game.enemies;
    for (let i = 0; i < pool.count; i++) if (pool.items[i].def.anchored && !pool.items[i].dead) boxes++;
    if (boxes < 3) {
      const a = Math.random() * Math.PI * 2;
      const r = 110 + Math.random() * 70;
      spawnEnemy(game, 'moving_box', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, game.spawner.sample(game.time, 'hpMult'));
    }
    return true;
  },
};
