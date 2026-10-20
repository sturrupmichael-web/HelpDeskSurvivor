// Full-screen overlays: title, character select, Overtime Pay shop, pause, level-up
// choice, Change Approved chest, and the end-of-shift summary.
// Each screen renders into the overlay element and handles its own keys via onKey().

import { icon } from './icons.js';
import { fmtTime } from './hud.js';
import { sfx } from '../engine/audio.js';
import { CHARACTERS } from '../../data/player.js';
import { WEAPONS } from '../../data/weapons.js';
import { SHOP } from '../../data/meta.js';
import { PASSIVES } from '../../data/passives.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';
import { gamepadConnected } from '../engine/input.js';
import { DEBUG_ALLOWED } from './debug.js';
import { MAPS, MAP_ORDER } from '../../data/maps.js';
import { Floor } from '../game/floor.js';
import { TITLE_TAGLINES, LEVEL_UP_LINES, BURNOUT_QUIPS, VICTORY_QUIPS, PAUSE_LINES } from '../../data/flavor.js';

const pickLine = (list) => list[(Math.random() * list.length) | 0];
const DIGITS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad7: 6, Numpad8: 7, Numpad9: 8 };
const PAY = (n) => `<span class="pay">$${n.toLocaleString()}</span>`;

export class Screens {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.keys = null; // key handler for the current screen
  }

  show(html, keys) {
    this.root.innerHTML = html;
    this.root.style.display = 'flex';
    this.keys = keys;
    // With a controller, start with the first button focused so it's obvious where you are.
    if (gamepadConnected()) this.focusables()[0]?.focus();
  }

  focusables() {
    return [...this.root.querySelectorAll('button:not([disabled]), input')];
  }

  hide() {
    this.root.style.display = 'none';
    this.root.innerHTML = '';
    this.keys = null;
  }

  onKey(code) {
    if (!this.keys) return false;
    if (code.startsWith('Pad')) return this.padKey(code);
    return this.keys(code) !== false;
  }

  // Controller menu navigation: the d-pad/stick moves focus between buttons (and nudges
  // sliders), A presses, B backs out, X and Y map to the R and A shortcuts.
  padKey(code) {
    const list = this.focusables();
    const cur = document.activeElement;
    const i = list.indexOf(cur);
    if (code === 'PadUp' || code === 'PadDown' || code === 'PadLeft' || code === 'PadRight') {
      if (cur && cur.type === 'range' && (code === 'PadLeft' || code === 'PadRight')) {
        cur.value = Number(cur.value) + (code === 'PadRight' ? 10 : -10);
        cur.dispatchEvent(new Event('input'));
        return true;
      }
      const step = code === 'PadDown' || code === 'PadRight' ? 1 : -1;
      const next = list[i < 0 ? 0 : (i + step + list.length) % list.length];
      next?.focus();
      return true;
    }
    if (code === 'PadA') {
      if (i >= 0 && cur.tagName === 'BUTTON') cur.click();
      else if (i < 0) list[0]?.focus();
      return true;
    }
    const map = { PadB: 'Escape', PadX: 'KeyR', PadY: 'KeyA', PadStart: 'Escape' };
    if (map[code] && this.keys(map[code]) !== false) return true;
    if (code === 'PadStart') return this.keys('Enter') !== false;
    return true; // swallow other pad buttons while a menu is open
  }

  bind(selector, fn) {
    this.root.querySelectorAll(selector).forEach((el, i) => el.addEventListener('click', () => fn(i, el)));
  }

  // Draws sprite thumbnails into every <canvas data-spr="id"> on the current screen.
  drawThumbs() {
    this.root.querySelectorAll('canvas[data-spr]').forEach((c) => {
      const spr = this.game.assets.sprite(c.dataset.spr);
      const f = spr.anims.walk.frames[0];
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(spr.image, f[0], f[1], spr.w, spr.h, 0, 0, c.width, c.height);
    });
  }

  title() {
    const m = this.game.meta.data;
    const ch = CHARACTERS[m.selected];
    const go = (act) => {
      sfx('click');
      if (act === 'start') this.game.newRun();
      else if (act === 'chars') this.characters();
      else if (act === 'shop') this.shop();
      else if (act === 'ach') this.achievementsScreen();
      else if (act === 'settings') this.settings(() => this.title());
      else if (act === 'maps') this.maps();
    };
    this.show(
      `<div class="panel title">
        <h1>HELPDESK<br>SURVIVORS</h1>
        <p class="sub">${pickLine(TITLE_TAGLINES)}</p>
        <div class="title-char"><canvas data-spr="${ch.sprite}" width="64" height="64"></canvas>
          <div><div class="card-name">${ch.name}</div><div class="card-flavor">${ch.perk}</div></div></div>
        <button class="primary" data-act="start">Clock In <kbd>Enter</kbd></button>
        <button data-act="maps">Map: ${MAPS[m.map].name} <kbd>L</kbd></button>
        <button data-act="chars">Characters <kbd>C</kbd></button>
        <button data-act="shop">Overtime Shop ${PAY(m.pay)} <kbd>S</kbd></button>
        <div class="row-buttons">
          <button data-act="ach">Achievements ${Object.keys(m.achievements ?? {}).length}/${ACHIEVEMENTS.length} <kbd>A</kbd></button>
          <button data-act="settings">Settings <kbd>O</kbd></button>
        </div>
        <table class="stats records">
          <tr><td>Longest shift</td><td>${fmtTime(m.best.time)}</td></tr>
          <tr><td>Most tickets closed</td><td>${m.best.tickets.toLocaleString()}</td></tr>
          <tr><td>Best CSAT</td><td>${m.best.csat.toLocaleString()}</td></tr>
          <tr><td>Shifts worked / survived</td><td>${m.shifts} / ${m.wins}</td></tr>
        </table>
        <div class="controls">
          <div><kbd>WASD</kbd>/<kbd>Arrows</kbd> move · your tools fire automatically</div>
          <div><kbd>Esc</kbd> pause · <kbd>M</kbd> mute${DEBUG_ALLOWED ? ' · <kbd>`</kbd> debug' : ''}</div>
        </div>
      </div>`,
      (code) => {
        if (code === 'Enter' || code === 'Space') go('start');
        else if (code === 'KeyC') go('chars');
        else if (code === 'KeyL') go('maps');
        else if (code === 'KeyS') go('shop');
        else if (code === 'KeyA') go('ach');
        else if (code === 'KeyO') go('settings');
        else return false;
      },
    );
    this.bind('button', (i, el) => go(el.dataset.act));
    this.drawThumbs();
  }

  // Settings: volumes and comfort toggles. `back` returns to the screen that opened it.
  settings(back) {
    const g = this.game;
    const st = g.settings;
    const slider = (key, label) => `<div class="setting"><label for="set-${key}">${label}</label>
      <input type="range" id="set-${key}" data-key="${key}" min="0" max="100" step="5" value="${Math.round(st[key] * 100)}">
      <span class="val">${Math.round(st[key] * 100)}</span></div>`;
    const toggle = (key, label) => `<div class="setting"><label>${label}</label>
      <button class="toggle ${st[key] ? 'on' : ''}" data-key="${key}">${st[key] ? 'ON' : 'OFF'}</button></div>`;
    this.show(
      `<div class="panel">
        <h2>SETTINGS</h2>
        <div class="settings">
          ${slider('music', 'Music volume')}
          ${slider('sfx', 'Sound effects volume')}
          ${toggle('shake', 'Screen shake')}
          ${toggle('numbers', 'Damage numbers')}
          ${toggle('stick', 'Touch joystick')}
        </div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
        <p class="tiny"><kbd>M</kbd> mutes everything at any time.</p>
      </div>`,
      (code) => {
        if (code === 'Escape' || code === 'Enter') back();
        else return false;
      },
    );
    this.root.querySelectorAll('input[type=range]').forEach((el) =>
      el.addEventListener('input', () => {
        const v = Math.max(0, Math.min(100, Number(el.value)));
        st[el.dataset.key] = v / 100;
        el.nextElementSibling.textContent = v;
        g.applySettings();
        if (el.dataset.key === 'sfx') sfx('ticket');
      }),
    );
    this.root.querySelectorAll('button.toggle').forEach((el) =>
      el.addEventListener('click', () => {
        const k = el.dataset.key;
        st[k] = !st[k];
        el.classList.toggle('on', st[k]);
        el.textContent = st[k] ? 'ON' : 'OFF';
        g.applySettings();
        sfx('click');
      }),
    );
    this.bind('[data-act=back]', () => back());
  }

  achievementsScreen() {
    const got = this.game.meta.data.achievements ?? {};
    const card = (a) => `<div class="ach ${got[a.id] ? '' : 'locked'}">${icon(a.icon, 32)}<div><b>${a.name}</b><span>${a.desc}</span></div></div>`;
    this.show(
      `<div class="panel wide">
        <h2>ACHIEVEMENTS</h2>
        <p class="sub">${Object.keys(got).length} of ${ACHIEVEMENTS.length} unlocked</p>
        <div class="ach-grid">${ACHIEVEMENTS.map(card).join('')}</div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      </div>`,
      (code) => {
        if (code === 'Escape' || code === 'Enter') this.title();
        else return false;
      },
    );
    this.bind('[data-act=back]', () => this.title());
  }

  // Pause-menu page with the current shift's numbers.
  stats() {
    const g = this.game;
    const p = g.player;
    const t = Math.max(1, g.time);
    const pct = (v) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
    const top = Math.max(1, ...p.weapons.map((w) => w.damageDone));
    const tools = [...p.weapons]
      .sort((a, b) => b.damageDone - a.damageDone)
      .map(
        (w) => `<div class="tool-row ${w.def.evolved ? 'evolved' : ''}">${icon(w.def.icon, 20)}<span class="tool-name">${w.def.name} ${w.def.evolved ? '' : 'Lv' + w.level}</span>
          <span class="tool-bar"><i style="width:${Math.round((w.damageDone / top) * 100)}%"></i></span>
          <span class="tool-dmg">${Math.round(w.damageDone).toLocaleString()}</span><span class="tool-dps">${Math.round(w.damageDone / t)}/s</span></div>`,
      )
      .join('');
    const passives = Object.entries(p.passives).map(([id, lvl]) => `<div>${PASSIVES[id].name} <b>Lv${lvl}</b></div>`).join('') || '<div>None yet</div>';
    const s = p.stats;
    this.show(
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
        </div>
        <div class="section-head">TOOLS (damage, average per second)</div>
        <div class="tools">${tools}</div>
        <div class="section-head">PASSIVES</div>
        <div class="stat-grid">${passives}</div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      </div>`,
      (code) => {
        if (code === 'Escape' || code === 'KeyT' || code === 'Enter') this.pause();
        else return false;
      },
    );
    this.bind('[data-act=back]', () => this.pause());
  }

  // Character select: pick an unlocked tech, or unlock one with Overtime Pay.
  // Map select: each map unlocks after a won shift on the one before it.
  maps() {
    const g = this.game;
    const meta = g.meta;
    const act = (i) => {
      const id = MAP_ORDER[i];
      if (!id || !meta.selectMap(id)) return;
      sfx('chest');
      g.setMap(id);
      g.newRun(); // fresh floor behind the menu
      g.setState('title');
      this.maps();
    };
    const card = (id, i) => {
      const m = MAPS[id];
      const unlocked = meta.mapUnlocked(id);
      const selected = meta.data.map === id;
      const best = meta.data.mapBest[id];
      const status = selected
        ? '<b class="ok">ON SHIFT</b>'
        : unlocked
          ? 'Select'
          : `Locked: win a shift in the ${MAPS[m.unlockAfter].name}`;
      return `<button class="card map ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${unlocked ? '' : 'disabled'}>
        <div class="card-head"><canvas data-map="${m.floor}" width="96" height="96"></canvas>
          <div><div class="card-name">${m.name}</div>
          <div class="card-level">${m.pay > 1 ? `${m.pay}x Overtime Pay` : 'Standard pay'}</div></div><kbd>${i + 1}</kbd></div>
        <div class="card-text">${m.twistText}</div>
        <div class="card-flavor">${m.blurb}</div>
        ${best ? `<div class="card-hint">Best: ${fmtTime(best.time)} · ${best.tickets.toLocaleString()} tickets · ${best.wins} won</div>` : ''}
        <div class="char-status">${status}</div>
      </button>`;
    };
    this.show(
      `<div class="panel wide chars maps">
        <h2>OFFICE MAPS</h2>
        <p class="sub">Win a shift on a map to unlock the next one.</p>
        <div class="cards">${MAP_ORDER.map(card).join('')}</div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      </div>`,
      (code) => {
        if (DIGITS[code] !== undefined) act(DIGITS[code]);
        else if (code === 'Escape' || code === 'Enter') this.title();
        else return false;
      },
    );
    this.bind('.card', (i) => act(i));
    this.bind('[data-act=back]', () => this.title());
    // Floor previews: one generated chunk of each map, scaled down.
    const floor = new Floor(g.assets);
    this.root.querySelectorAll('canvas[data-map]').forEach((c) => {
      floor.setStyle(c.dataset.map);
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(floor.build(1, 3), 0, 0, 256, 256, 0, 0, c.width, c.height);
    });
  }

  characters() {
    const meta = this.game.meta;
    const ids = Object.keys(CHARACTERS);
    const act = (i) => {
      const id = ids[i];
      if (!id) return;
      if (meta.isUnlocked(id)) meta.select(id);
      else if (!meta.unlock(id)) return;
      else this.game.achievements.check();
      sfx(meta.isUnlocked(id) ? 'chest' : 'click');
      this.characters();
    };
    const card = (id, i) => {
      const c = CHARACTERS[id];
      const unlocked = meta.isUnlocked(id);
      const selected = meta.data.selected === id;
      const afford = meta.data.pay >= c.cost;
      const status = selected ? '<b class="ok">ON SHIFT</b>' : unlocked ? 'Select' : afford ? `Hire for ${PAY(c.cost)}` : `Locked: ${PAY(c.cost)}`;
      return `<button class="card char ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-i="${i}" ${!unlocked && !afford ? 'disabled' : ''}>
        <div class="card-head"><canvas data-spr="${c.sprite}" width="64" height="64"></canvas>
          <div class="card-name">${c.name}</div><kbd>${i + 1}</kbd></div>
        <div class="card-level">Starts with ${WEAPONS[c.starter].name}</div>
        <div class="card-text">${c.perk}</div>
        <div class="card-flavor">${c.blurb}</div>
        <div class="char-status">${status}</div>
      </button>`;
    };
    this.show(
      `<div class="panel wide chars">
        <h2>CHARACTERS</h2>
        <p class="sub">Overtime Pay: ${PAY(meta.data.pay)}</p>
        <div class="cards">${ids.map(card).join('')}</div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      </div>`,
      (code) => {
        if (DIGITS[code] !== undefined) act(DIGITS[code]);
        else if (code === 'Escape' || code === 'Enter') this.title();
        else return false;
      },
    );
    this.bind('.card', (i) => act(i));
    this.bind('[data-act=back]', () => this.title());
    this.drawThumbs();
  }

  // Overtime Pay shop: permanent upgrades.
  shop() {
    const meta = this.game.meta;
    const ids = Object.keys(SHOP);
    const buy = (i) => {
      const id = ids[i];
      if (!id) return;
      if (meta.buy(id)) {
        sfx('chest');
        this.game.achievements.check();
        this.shop();
      }
    };
    const row = (id, i) => {
      const d = SHOP[id];
      const lvl = meta.level(id);
      const cost = meta.nextCost(id);
      const max = d.costs.length;
      return `<button class="shop-row" data-i="${i}" ${cost === null || meta.data.pay < cost ? 'disabled' : ''}>
        ${icon(d.icon, 32)}
        <div class="shop-info"><div class="card-name">${d.name} <span class="pips">${'▮'.repeat(lvl)}${'▯'.repeat(max - lvl)}</span></div>
          <div class="card-text">${d.desc}</div><div class="card-flavor">${d.flavor}</div></div>
        <div class="shop-cost">${cost === null ? '<b class="ok">MAXED</b>' : PAY(cost)}</div>
        <kbd>${i + 1}</kbd>
      </button>`;
    };
    this.show(
      `<div class="panel wide">
        <h2>OVERTIME SHOP</h2>
        <p class="sub">Balance: ${PAY(meta.data.pay)}. Upgrades are permanent and apply to every character.</p>
        <div class="shop-list">${ids.map(row).join('')}</div>
        <button class="back" data-act="back">Back <kbd>Esc</kbd></button>
      </div>`,
      (code) => {
        if (DIGITS[code] !== undefined) buy(DIGITS[code]);
        else if (code === 'Escape' || code === 'Enter') this.title();
        else return false;
      },
    );
    this.bind('.shop-row', (i) => buy(i));
    this.bind('[data-act=back]', () => this.title());
  }

  pause() {
    const go = (act) => {
      if (act === 'resume') this.game.resume();
      else if (act === 'restart') this.game.newRun();
      else if (act === 'quit') {
        this.game.newRun();
        this.game.setState('title');
        this.title();
      } else if (act === 'stats') this.stats();
      else if (act === 'settings') this.settings(() => this.pause());
    };
    this.show(
      `<div class="panel">
        <h2>ON HOLD</h2>
        <p class="sub">${pickLine(PAUSE_LINES)}</p>
        <button class="primary" data-act="resume">Resume <kbd>Esc</kbd></button>
        <button data-act="stats">Shift Stats <kbd>T</kbd></button>
        <button data-act="settings">Settings <kbd>O</kbd></button>
        <button data-act="restart">Restart Shift <kbd>R</kbd></button>
        <button data-act="quit">Quit to Title <kbd>Q</kbd></button>
        <p class="tiny"><kbd>M</kbd> mute / unmute sound</p>
      </div>`,
      (code) => {
        if (code === 'Escape' || code === 'KeyP') go('resume');
        else if (code === 'KeyR') go('restart');
        else if (code === 'KeyQ') go('quit');
        else if (code === 'KeyT') go('stats');
        else if (code === 'KeyO') go('settings');
        else return false;
      },
    );
    this.bind('button', (i, el) => go(el.dataset.act));
  }

  // onPick(choice, always): `always` is true when the player chose to auto-take the
  // pizza for the rest of the run (offered once every item is maxed).
  // onReroll is null when no rerolls are available.
  levelUp(choices, onReroll, rerollsLeft, onPick) {
    let done = false;
    const onlyPizza = choices.length === 1 && choices[0].kind === 'reward';
    const pick = (i, always = false) => {
      if (done || !choices[i]) return;
      done = true;
      sfx('click');
      onPick(choices[i], always);
    };
    const card = (c, i) => `
      <button class="card" data-i="${i}">
        <div class="card-head">${icon(c.icon, 40)}
          <div><div class="card-name">${c.name}</div>
          <div class="card-level">${c.kind === 'reward' ? 'Reward' : c.level === 1 ? 'NEW!' : `Level ${c.level}`}</div></div>
          <kbd>${i + 1}</kbd>
        </div>
        <div class="card-text">${c.text}</div>
        <div class="card-flavor">${c.flavor}</div>
        ${c.hint ? `<div class="card-hint">${c.hint}</div>` : ''}
      </button>`;
    this.show(
      `<div class="panel wide">
        <h2>LEVEL UP!</h2>
        <p class="sub">${pickLine(LEVEL_UP_LINES)}</p>
        <div class="cards">${choices.map(card).join('')}</div>
        ${
          onlyPizza
            ? `<button class="always" data-act="always">Everything's maxed: always take the pizza from now on <kbd>A</kbd></button>`
            : ''
        }
        ${onReroll ? `<button class="always" data-act="reroll">Escalate: reroll these cards (${rerollsLeft} left) <kbd>R</kbd></button>` : ''}
      </div>`,
      (code) => {
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
        if (n !== undefined) pick(n);
        else if (onlyPizza && code === 'KeyA') pick(0, true);
        else if (onReroll && code === 'KeyR' && !done) {
          done = true;
          sfx('click');
          onReroll();
        }
        else return code !== 'Escape' ? false : true; // swallow Esc so it can't pause mid-choice
      },
    );
    this.bind('.card', (i) => pick(i));
    this.bind('[data-act=always]', () => pick(0, true));
    this.bind('[data-act=reroll]', () => {
      if (done) return;
      done = true;
      sfx('click');
      onReroll();
    });
  }

  // result: { evolved?: { from, to }, upgrades: [choice] } from upgrades.openChest().
  chest(result, onClose) {
    let done = false;
    let ready = false;
    const close = () => {
      if (done || !ready) return;
      done = true;
      sfx('click');
      onClose();
    };
    const ev = result.evolved;
    const body = ev
      ? `<p class="sub">Emergency change approved by the CAB. Your tool has evolved!</p>
        <div class="evolve">
          <div class="evo-from">${icon(ev.from.icon, 40)}<span>${ev.from.name}</span></div>
          <div class="evo-arrow">&#9654;</div>
          <div class="evo-to">${icon(ev.to.icon, 56)}<b>${ev.to.name}</b></div>
        </div>
        <div class="card-text">${ev.to.desc}</div>
        <div class="card-flavor">${ev.to.flavor}</div>`
      : `<p class="sub">Standard change approved. ${result.upgrades.length > 1 ? 'Triple sign-off!' : 'One sign-off.'}</p>
        <div class="chest-list">${result.upgrades
          .map(
            (c) => `<div class="chest-item">${icon(c.icon, 32)}<div><div class="card-name">${c.name}</div>
              <div class="card-level">${c.kind === 'reward' ? 'Reward' : c.level === 1 ? 'NEW!' : `Level ${c.level}`}</div></div></div>`,
          )
          .join('')}</div>`;
    this.show(
      `<div class="panel chest">
        <h2>CHANGE APPROVED</h2>
        ${body}
        <button class="primary" data-act="ok">Deploy to Production <kbd>Enter</kbd></button>
      </div>`,
      (code) => {
        if (code === 'Enter' || code === 'Space') close();
        else return code !== 'Escape' ? false : true;
      },
    );
    // Short delay so a held movement key or a stray click can't skip the reveal.
    this.root.querySelector('button').disabled = true;
    setTimeout(() => {
      ready = true;
      const b = this.root.querySelector('[data-act=ok]');
      if (b) b.disabled = false;
    }, 400);
    this.bind('[data-act=ok]', close);
  }

  // s: run stats from Game.endRun (plus pay, records, balance from Meta.finishShift).
  gameOver(s) {
    let ready = false;
    setTimeout(() => (ready = true), 600); // don't let a held key skip the summary
    const go = (act) => {
      if (!ready) return;
      sfx('click');
      if (act === 'again') this.game.newRun();
      else {
        this.game.setState('title');
        if (act === 'shop') this.shop();
        else this.title();
      }
    };
    const rec = (k) => (s.records.includes(k) ? ' <b class="record">NEW RECORD</b>' : '');
    const topDamage = Math.max(1, ...s.tools.map((t) => t.damage));
    const tools = s.tools
      .map(
        (t) => `<div class="tool-row ${t.evolved ? 'evolved' : ''}">${icon(t.icon, 20)}<span class="tool-name">${t.name}</span>
          <span class="tool-bar"><i style="width:${Math.round((t.damage / topDamage) * 100)}%"></i></span><span class="tool-dmg">${t.damage.toLocaleString()}</span></div>`,
      )
      .join('');
    this.show(
      `<div class="panel wide summary ${s.won ? 'win' : 'lose'}">
        <h1>${s.won ? 'CLOCKED OUT!' : 'BURNOUT'}</h1>
        <p class="sub">${pickLine(s.won ? VICTORY_QUIPS : BURNOUT_QUIPS)}</p>
        ${s.newMap ? `<p class="unlock">NEW MAP UNLOCKED: <b>${MAPS[s.newMap].name}</b> (pick it under Map on the title screen)</p>` : ''}
        <div class="summary-cols">
          <table class="stats">
            <tr><td>Technician</td><td>${s.character}</td></tr>
            <tr><td>Map</td><td>${s.mapName}</td></tr>
            <tr><td>Time survived</td><td>${fmtTime(s.time)}${rec('time')}</td></tr>
            <tr><td>Tickets closed</td><td>${s.kills.toLocaleString()}${rec('tickets')}</td></tr>
            <tr><td>CSAT score</td><td>${s.csat.toLocaleString()}${rec('csat')}</td></tr>
            <tr><td>Best streak</td><td>x${s.bestStreak}</td></tr>
            <tr><td>Level reached</td><td>${s.level}</td></tr>
            <tr class="paid"><td>Overtime Pay earned</td><td>+${PAY(s.pay)}</td></tr>
            <tr><td>Balance</td><td>${PAY(s.balance)}</td></tr>
          </table>
          <div class="tools"><div class="tools-head">Damage by tool</div>${tools}</div>
        </div>
        <div class="summary-buttons">
          <button class="primary" data-act="again">Next Shift <kbd>Enter</kbd></button>
          <button data-act="shop">Overtime Shop <kbd>S</kbd></button>
          <button data-act="title">Title <kbd>Esc</kbd></button>
        </div>
      </div>`,
      (code) => {
        if (code === 'Enter' || code === 'Space') go('again');
        else if (code === 'KeyS') go('shop');
        else if (code === 'Escape') go('title');
        else return false;
      },
    );
    this.bind('button', (i, el) => go(el.dataset.act));
  }
}
