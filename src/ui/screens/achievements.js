// achievementsScreen, stats: part of the menu screens (src/ui/screens.js holds the shared Screens helpers).
// `scr` is the Screens instance.

import { icon } from '../icons.js';
import { fmtTime } from '../hud.js';
import { PASSIVES } from '../../../data/passives.js';
import { ACHIEVEMENTS } from '../../../data/achievements.js';
import { ITEM_HINT, itemLevel, wireItems } from './common.js';

export function achievementsScreen(scr) {
  const got = scr.game.meta.data.achievements ?? {};
  const card = (a) => `<div class="ach ${got[a.id] ? '' : 'locked'}">${icon(a.icon, 32)}<div><b>${a.name}</b><span>${a.desc}</span></div></div>`;
  scr.show(
    `<div class="panel wide">
      <h2>ACHIEVEMENTS</h2>
      <p class="sub">${Object.keys(got).length} of ${ACHIEVEMENTS.length} unlocked</p>
      <div class="ach-grid">${ACHIEVEMENTS.map(card).join('')}</div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (code === 'Escape' || code === 'Enter') scr.title();
      else return false;
    },
  );
  scr.bind('[data-act=back]', () => scr.title());
}

// Pause-menu page with the current shift's numbers.
export function stats(scr) {
  const g = scr.game;
  const p = g.player;
  const t = Math.max(1, g.time);
  const pct = (v) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
  const top = Math.max(1, ...p.weapons.map((w) => w.damageDone));
  const weapons = [...p.weapons].sort((a, b) => b.damageDone - a.damageDone);
  const owned = Object.entries(p.passives);
  // What each row describes on hover or tap (wireItems): tools, then passives.
  const items = [
    ...weapons.map((w) => ({ name: w.def.name, desc: w.def.desc, level: w.level, maxLevel: w.def.levels.length })),
    ...owned.map(([id, level]) => ({ name: PASSIVES[id].name, desc: PASSIVES[id].desc, level, maxLevel: PASSIVES[id].maxLevel })),
  ];
  const tools = weapons
    .map(
      (w, i) => `<div class="tool-row ${w.def.evolved ? 'evolved' : ''}" data-item="${i}" tabindex="0">${icon(w.def.icon, 20)}<span class="tool-name">${w.def.name} ${w.def.evolved ? '' : 'Lv' + w.level}</span>
        <span class="tool-bar"><i style="width:${Math.round((w.damageDone / top) * 100)}%"></i></span>
        <span class="tool-dmg">${Math.round(w.damageDone).toLocaleString()}</span><span class="tool-dps">${Math.round(w.damageDone / t)}/s</span></div>`,
    )
    .join('');
  const passives =
    owned
      .map(
        ([id], i) => `<div class="tool-row passive-row" data-item="${weapons.length + i}" tabindex="0">${icon(PASSIVES[id].icon, 20)}<span class="tool-name">${PASSIVES[id].name}</span>
          <span class="tool-lvl">${itemLevel(items[weapons.length + i])}</span></div>`,
      )
      .join('') || '<div class="tool-row tiny">None yet</div>';
  const s = p.stats;
  scr.show(
    `<div class="panel wide stats-page">
      <h2>SHIFT STATS</h2>
      <div class="stat-grid">
        <div>Time <b>${fmtTime(g.time)}</b></div>
        <div>Level <b>${p.level}</b></div>
        <div>Tickets closed <b>${g.score.kills.toLocaleString()}</b></div>
        <div>CSAT <b>${g.score.csat.toLocaleString()}</b></div>
        <div>Sanity <b>${Math.ceil(p.hp)}/${p.maxHp}</b></div>
        <div>Users on floor <b>${g.enemies.count}</b></div>
        <div>Rerolls left <b>${p.rerolls}</b></div>
        <div>Union Rep <b>${p.revives ? 'on call' : 'none'}</b></div>
        ${p.passives.warranty ? `<div>Extended Warranty <b>${p.warranty ? 'covered' : 'claimed'}</b></div>` : ''}
      </div>
      <div class="section-head">YOUR STATS</div>
      <div class="stat-grid">
        <div>Damage <b>${pct(s.damage)}</b></div>
        <div>Cooldowns <b>${pct(s.cooldown)}</b></div>
        <div>Area <b>${pct(s.area)}</b></div>
        <div>Attack speed <b>${pct(s.attackSpeed)}</b></div>
        <div>Move speed <b>${pct(s.moveSpeed)}</b></div>
        <div>Damage taken <b>${pct(s.damageTaken)}</b></div>
        <div>XP gain <b>${pct(s.growth)}</b></div>
        <div>Pickup radius <b>${pct(s.pickupRadius)}</b></div>
        ${s.luck !== 1 ? `<div>Luck <b>${pct(s.luck)}</b></div>` : ''}
        ${p.regen ? `<div>Sanity regen <b>${p.regen.toFixed(2)}/s</b></div>` : ''}
        ${p.extraCount ? `<div>Extra projectiles <b>+${p.extraCount}</b></div>` : ''}
      </div>
      <div class="item-list">
        <div class="section-head">TOOLS (damage, average per second)</div>
        <div class="tools">${tools}</div>
        <div class="section-head">PASSIVES</div>
        <div class="tools">${passives}</div>
        <p class="item-info" aria-live="polite">${ITEM_HINT}</p>
      </div>
      <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
    </div>`,
    (code) => {
      if (code === 'Escape' || code === 'KeyT' || code === 'Enter') scr.pause();
      else return false;
    },
  );
  scr.bind('[data-act=back]', () => scr.pause());
  wireItems(scr.root, items);
}
