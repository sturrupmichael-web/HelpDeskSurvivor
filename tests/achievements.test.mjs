// Achievements (data/achievements.js): none is given away on a fresh save, each one is
// earned by what its card says, and the game records each unlock once. A new achievement
// needs a line in EARNED below. Plain Node, no browser.

import { test, assert } from './harness.mjs';
import { headlessGame } from '../src/game/headless.js';
import { manifest } from './tools/bot.mjs';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { CHARACTERS } from '../data/player.js';
import { MAP_ORDER } from '../data/maps.js';

// How to earn each one: changes to a fresh run tracker `r` and save `m`.
const EARNED = {
  first_shift: (r) => (r.ended = true),
  speedrun: (r) => Object.assign(r, { ended: true, time: 45 }),
  patch: (r) => (r.time = 330),
  tickets_1k: (r) => (r.kills = 1000),
  tickets_10k: (r) => (r.kills = 10000),
  streak: (r) => (r.maxMult = 5),
  evolve: (r) => (r.evolutions = 1),
  evolve_all: (r) => (r.evolutions = 4),
  incident: (r) => r.bosses.push('incident'),
  win: (r) => (r.won = true),
  win_flawless: (r) => Object.assign(r, { won: true, minHpFrac: 0.5 }),
  overtime: (r) => (r.time = 1260),
  pizza: (r) => (r.pizzas = 5),
  steve: (r) => (r.killsById.steve = 100),
  union: (r) => (r.revived = true),
  hired_all: (r, m) => (m.unlocked = Object.keys(CHARACTERS)),
  shopper: (r, m) => (m.shop = { a: 10, b: 5 }),
  boss_ratsnest: (r) => r.bosses.push('ratsnest'),
  boss_caller: (r) => r.bosses.push('caller'),
  boss_janitor: (r) => r.bosses.push('janitor'),
  boss_takeover: (r) => r.bosses.push('takeover'),
  map_server: (r, m) => m.mapsWon.push('server'),
  map_call: (r, m) => m.mapsWon.push('callcenter'),
  map_garage: (r, m) => m.mapsWon.push('garage'),
  map_merger: (r, m) => m.mapsWon.push('merger'),
  red_tape: (r) => Object.assign(r, { won: true, policies: ['budgetCuts', 'hiringFreeze', 'mandatoryFun'] }),
  lean_team: (r) => Object.assign(r, { won: true, policies: ['budgetCuts', 'hiringFreeze'] }),
  hardcore_win: (r) => Object.assign(r, { won: true, hardcore: true }),
  hardcore_all: (r, m) => (m.hardcoreWon = [...MAP_ORDER]),
  veteran: (r, m) => (m.shifts = 25),
};

function fresh() {
  const g = headlessGame(manifest);
  g.startShift('office', 'tier1');
  return { g, r: g.achievements.run, m: g.meta.data };
}

export function achievementTests() {
  test('achievements: every one has a way to earn it in this test', () => {
    const missing = ACHIEVEMENTS.filter((a) => !EARNED[a.id]).map((a) => a.id);
    const stale = Object.keys(EARNED).filter((id) => !ACHIEVEMENTS.some((a) => a.id === id));
    assert(!missing.length && !stale.length, `add to EARNED: ${missing.join(', ') || '-'}; remove: ${stale.join(', ') || '-'}`);
  });

  test('achievements: none on a fresh save, each earned by what its card says', () => {
    const problems = [];
    for (const a of ACHIEVEMENTS) {
      const { r, m } = fresh();
      if (a.check(r, m)) problems.push(`${a.id} is given away on a fresh shift`);
      EARNED[a.id]?.(r, m);
      if (!a.check(r, m)) problems.push(`${a.id} isn't earned by doing what its card says`);
    }
    assert(!problems.length, problems.join('; '));
  });

  test('achievements: the bad-policy count only counts bad policies', () => {
    const { r, m } = fresh();
    const red = ACHIEVEMENTS.find((a) => a.id === 'red_tape');
    Object.assign(r, { won: true, policies: ['budgetCuts', 'hiringFreeze'] });
    assert(!red.check(r, m), 'Red Tape with only 2 bad policies');
  });

  test('achievements: a shift records each unlock once, in the save', () => {
    const { g } = fresh();
    g.player.hp = 0;
    g.playShift(5);
    const at = g.meta.data.achievements.first_shift;
    assert(at > 0, 'ending a shift did not unlock Onboarding Complete');
    assert(g.meta.data.achievements.speedrun > 0, 'burning out in 5 s did not unlock Rage Quit');
    g.startShift('office', 'tier1');
    g.player.hp = 0;
    g.playShift(5);
    assert(g.meta.data.achievements.first_shift === at, 'unlocked twice');
  });
}
