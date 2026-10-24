// Checks that the content in data/ fits together: every id one file names (a starter
// tool, an evolution's passive, a map's boss, an unlock, a sprite, an icon...) exists
// where it should. A typo there would otherwise only show up when someone plays into it.
// Plain Node, no browser.

import { readFileSync, readdirSync } from 'node:fs';
import { test, assert, ROOT } from './harness.mjs';
import { manifest } from './tools/bot.mjs';
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { EVOLUTIONS } from '../data/evolutions.js';
import { CHARACTERS } from '../data/player.js';
import { ENEMIES } from '../data/enemies.js';
import { MAPS, MAP_ORDER } from '../data/maps.js';
import { TIMELINE, EVENTS, MAP_BOSS_EVENT } from '../data/waves.js';
import { ITEMS, TICKET_TIERS } from '../data/pickups.js';
import { UNLOCKS } from '../data/unlocks.js';
import { POLICIES, POLICY_GROUPS } from '../data/policies.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { SHOP } from '../data/meta.js';
import { CHANGELOG } from '../data/changelog.js';
import { BEHAVIORS } from '../src/game/behaviors/index.js';
import { WEAPON_BEHAVIORS } from '../src/game/weapons/index.js';
import { TWISTS } from '../src/game/maps.js';
import { ITEM_EFFECTS } from '../src/game/pickups.js';
import { ICONS } from '../src/ui/icons.js';

// Runs `check(problems)` and fails with every problem it found, not just the first.
function expectNone(check) {
  const problems = [];
  const need = (cond, msg) => cond || problems.push(msg);
  check(need);
  assert(!problems.length, '\n      ' + problems.join('\n      '));
}

const sprites = manifest.sprites;
const enemySprites = new Set(Object.values(ENEMIES).map((e) => e.sprite));
const isMap = (id) => id in MAPS;

export function dataTests() {
  test('data: tools and evolutions', () =>
    expectNone((need) => {
      for (const [id, w] of Object.entries(WEAPONS)) {
        need(w.behavior in WEAPON_BEHAVIORS, `tool ${id}: unknown behavior '${w.behavior}'`);
        need(w.icon in ICONS, `tool ${id}: unknown icon '${w.icon}'`);
        need(Array.isArray(w.levels) && w.levels.length > 0, `tool ${id}: no levels`);
        for (const key of ['sprite', 'boltSprite']) if (w[key]) need(w[key] in sprites, `tool ${id}: ${key} '${w[key]}' isn't in the sprite sheets`);
        for (const s of Object.keys(w.bonusVs ?? {})) need(enemySprites.has(s), `tool ${id}: bonusVs names unknown user '${s}'`);
        if (w.evolved) need(EVOLUTIONS[w.from]?.into === id, `evolution ${id}: no recipe in data/evolutions.js turns '${w.from}' into it`);
      }
      for (const [from, e] of Object.entries(EVOLUTIONS)) {
        need(WEAPONS[from] && !WEAPONS[from].evolved, `evolution recipe: '${from}' isn't a base tool`);
        need(e.passive in PASSIVES, `evolution of ${from}: unknown passive '${e.passive}'`);
        need(WEAPONS[e.into]?.evolved, `evolution of ${from}: '${e.into}' isn't an evolved tool`);
      }
    }));

  test('data: passives, shop and achievements', () =>
    expectNone((need) => {
      for (const [id, p] of Object.entries(PASSIVES)) need(p.icon in ICONS, `passive ${id}: unknown icon '${p.icon}'`);
      for (const [id, s] of Object.entries(SHOP)) need(s.icon in ICONS, `shop ${id}: unknown icon '${s.icon}'`);
      const ids = new Set();
      for (const a of ACHIEVEMENTS) {
        need(!ids.has(a.id), `achievement '${a.id}' is listed twice`);
        ids.add(a.id);
        need(a.icon in ICONS, `achievement ${a.id}: unknown icon '${a.icon}'`);
        need(typeof a.check === 'function', `achievement ${a.id}: no check()`);
      }
    }));

  test('data: techs', () =>
    expectNone((need) => {
      for (const [id, c] of Object.entries(CHARACTERS)) {
        need(c.sprite in sprites, `tech ${id}: sprite '${c.sprite}' isn't in the sprite sheets`);
        need(WEAPONS[c.starter] && !WEAPONS[c.starter].evolved, `tech ${id}: starter '${c.starter}' isn't a base tool`);
        for (const t of c.alsoStarts ?? []) need(t in WEAPONS, `tech ${id}: alsoStarts unknown tool '${t}'`);
        for (const t of Object.keys({ ...c.cardWeights, ...c.cooldownFor })) need(t in WEAPONS, `tech ${id}: perk names unknown tool '${t}'`);
        for (const s of Object.keys({ ...c.hurtBy, ...c.bonusVs })) need(enemySprites.has(s), `tech ${id}: perk names unknown user '${s}'`);
      }
    }));

  test('data: users and bosses', () =>
    expectNone((need) => {
      for (const [id, e] of Object.entries(ENEMIES)) {
        need(e.sprite in sprites, `user ${id}: sprite '${e.sprite}' isn't in the sprite sheets`);
        need(e.behavior in BEHAVIORS, `user ${id}: unknown behavior '${e.behavior}'`);
        if (e.onDeath) need(e.onDeath.spawn in ENEMIES, `user ${id}: onDeath spawns unknown user '${e.onDeath.spawn}'`);
        if (e.params?.minion) need(e.params.minion in ENEMIES, `user ${id}: unknown minion '${e.params.minion}'`);
        if (e.wikiAs) need(e.wikiAs in ENEMIES, `user ${id}: wikiAs unknown user '${e.wikiAs}'`);
        for (const it of [...Object.keys(e.drops ?? {}), ...(e.loot ?? [])]) need(it in ITEMS, `user ${id}: drops unknown pickup '${it}'`);
      }
    }));

  test('data: maps, waves and pickups', () =>
    expectNone((need) => {
      need(MAP_ORDER.length === Object.keys(MAPS).length && MAP_ORDER.every(isMap), 'MAP_ORDER and MAPS list different maps');
      for (const [id, m] of Object.entries(MAPS)) {
        need(m.unlockAfter === null || isMap(m.unlockAfter), `map ${id}: unlockAfter unknown map '${m.unlockAfter}'`);
        if (m.twist) need(m.twist.type in TWISTS, `map ${id}: unknown twist '${m.twist.type}'`);
        if (m.boss) need(ENEMIES[m.boss.boss]?.boss, `map ${id}: '${m.boss.boss}' isn't a boss`);
        for (const u of Object.keys({ ...m.mixBoost, ...m.newUsers })) need(u in ENEMIES, `map ${id}: unknown user '${u}'`);
      }
      for (const k of TIMELINE) for (const u of Object.keys(k.mix)) need(u in ENEMIES, `wave at ${k.t}s: unknown user '${u}'`);
      for (const ev of [...EVENTS, MAP_BOSS_EVENT]) {
        for (const u of Object.keys(ev.mix ?? {})) need(u in ENEMIES, `event at ${ev.t}s: unknown user '${u}'`);
        if (ev.boss) need(ENEMIES[ev.boss]?.boss, `event at ${ev.t}s: '${ev.boss}' isn't a boss`);
      }
      for (const [id, it] of Object.entries(ITEMS)) {
        need(it.sprite in sprites, `pickup ${id}: sprite '${it.sprite}' isn't in the sprite sheets`);
        for (const fx of it.effects ?? []) need(fx in ITEM_EFFECTS, `pickup ${id}: unknown effect '${fx}'`);
      }
      for (const t of TICKET_TIERS) need(t.sprite in sprites, `ticket sprite '${t.sprite}' isn't in the sprite sheets`);
    }));

  test('data: unlocks and policies', () =>
    expectNone((need) => {
      const known = { tools: WEAPONS, passives: PASSIVES, evolutions: WEAPONS, characters: CHARACTERS };
      for (const [map, u] of Object.entries(UNLOCKS)) {
        need(isMap(map), `unlocks: unknown map '${map}'`);
        for (const [kind, ids] of Object.entries(u)) {
          need(kind in known, `unlocks ${map}: unknown kind '${kind}'`);
          for (const id of ids) need(id in (known[kind] ?? {}), `unlocks ${map}: unknown ${kind} '${id}'`);
        }
      }
      const groups = new Set(POLICY_GROUPS.map((g) => g.id));
      for (const [id, p] of Object.entries(POLICIES)) {
        need(p.icon in ICONS, `policy ${id}: unknown icon '${p.icon}'`);
        need(groups.has(p.group), `policy ${id}: unknown group '${p.group}'`);
        need(p.unlock === null || p.unlock === 'noEvolveWin' || isMap(p.unlock), `policy ${id}: unknown unlock '${p.unlock}'`);
        for (const x of p.excludes ?? []) need(x in POLICIES, `policy ${id}: excludes unknown policy '${x}'`);
      }
    }));

  test('data: changelog ids are unique, newest first', () =>
    expectNone((need) => {
      const ids = new Set();
      CHANGELOG.forEach((c, i) => {
        need(!ids.has(c.id), `changelog: id '${c.id}' is used twice (players would miss the newer notes)`);
        ids.add(c.id);
        if (i > 0) need(c.date <= CHANGELOG[i - 1].date, `changelog: '${c.id}' is newer than the entry above it`);
      });
    }));

  // The leaderboard refuses scores from maps it doesn't know (supabase/merger.sql shows how
  // to add one), so a new map needs its SQL as well.
  test('data: every map is allowed on the leaderboard', () => {
    const dir = ROOT + 'supabase/';
    const lists = readdirSync(dir)
      .flatMap((f) => [...readFileSync(dir + f, 'utf8').matchAll(/scores_map_known\s+check \(map in \(([^)]*)\)\)/g)].map((m) => [f, m[1]]));
    assert(lists.length, 'no scores_map_known check found in supabase/');
    expectNone((need) => {
      for (const [f, list] of lists) {
        const maps = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
        need(maps.join() === [...MAP_ORDER].sort().join(), `${f}: map list (${maps.join(', ')}) doesn't match data/maps.js`);
      }
    });
  });
}
