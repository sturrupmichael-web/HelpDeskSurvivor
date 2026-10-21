// In-run HUD as DOM + SVG on top of the canvas. Values are cached so the DOM is only
// touched when something actually changes.

import { icon } from './icons.js';
import { SHIFT_LENGTH } from '../../data/waves.js';
import { PASSIVES, MAX_WEAPONS, MAX_PASSIVES } from '../../data/passives.js';
import { isMuted } from '../engine/audio.js';

export const fmtTime = (t) => {
  const s = Math.floor(t);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

export class Hud {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div class="hud-xp">
        <svg viewBox="0 0 1000 10" preserveAspectRatio="none"><rect width="1000" height="10" fill="#1a1c2c"/><rect class="xp-fill" width="0" height="10" fill="#41a6f6"/></svg>
        <span class="hud-level">LV 1</span>
      </div>
      <div class="hud-timer"><span class="t">00:00</span><small class="shift">SHIFT ENDS ${fmtTime(SHIFT_LENGTH)}</small></div>
      <div class="hud-left">
        <div class="hud-sanity">
          <span class="label">SANITY</span>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none"><rect width="100" height="8" fill="#1a1c2c"/><rect class="hp-fill" width="100" height="8" fill="#b13e53"/></svg>
          <span class="hp-text">100</span>
        </div>
        <div class="slots weapons"></div>
        <div class="slots passives"></div>
      </div>
      <div class="hud-banner" hidden><b></b><span></span></div>
      <div class="hud-right">
        <div>TICKETS CLOSED <b class="kills">0</b></div>
        <div>CSAT <b class="csat">0</b> <span class="mult"></span></div>
        <div class="muted" hidden>MUTED <kbd>M</kbd></div>
      </div>
      <button class="hud-pause" aria-label="Pause">II</button>
      <div class="hud-coach" hidden><small class="coach-step"></small><b class="coach-title"></b><span class="coach-text"></span>
        <svg viewBox="0 0 100 4" preserveAspectRatio="none"><rect width="100" height="4" fill="#1a1c2c"/><rect class="coach-fill" width="0" height="4" fill="#38b764"/></svg></div>
      <div class="hud-boss" hidden>
        <div class="boss-name"></div>
        <svg viewBox="0 0 100 6" preserveAspectRatio="none"><rect width="100" height="6" fill="#1a1c2c"/><rect class="boss-fill" width="100" height="6" fill="#b13e53"/></svg>
      </div>`;
    const q = (s) => root.querySelector(s);
    this.el = {
      xp: q('.xp-fill'), level: q('.hud-level'), timer: q('.hud-timer .t'), hp: q('.hp-fill'), hpText: q('.hp-text'),
      kills: q('.kills'), csat: q('.csat'), mult: q('.mult'), weapons: q('.weapons'), passives: q('.passives'),
      banner: q('.hud-banner'), shift: q('.shift'), muted: q('.muted'),
      boss: q('.hud-boss'), bossName: q('.boss-name'), bossFill: q('.boss-fill'),
      coach: q('.hud-coach'), coachStep: q('.coach-step'), coachTitle: q('.coach-title'), coachText: q('.coach-text'), coachFill: q('.coach-fill'),
    };
    this.setMuted(isMuted());
    // Achievement toasts live outside the HUD so they also show on menus.
    this.toasts = document.createElement('div');
    this.toasts.className = 'toasts';
    document.body.appendChild(this.toasts);
    this.cache = {};
  }

  // Touch/mouse pause button (shown on touch screens via CSS).
  onPause(fn) {
    this.root.querySelector('.hud-pause').addEventListener('click', fn);
  }

  // "Achievement unlocked" toast for a data/achievements.js entry.
  toast(a) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${icon(a.icon, 32)}<div><small>${a.label ?? 'ACHIEVEMENT UNLOCKED'}</small><b></b></div>`;
    t.querySelector('b').textContent = a.name;
    this.toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3500);
    setTimeout(() => t.remove(), 4000);
  }

  setMuted(m) {
    this.el.muted.hidden = !m;
  }

  setVisible(v) {
    this.root.style.display = v ? '' : 'none';
  }

  // Big warning banner for events (Patch Tuesday, Login Storm, bosses).
  banner(title, text, seconds) {
    const b = this.el.banner;
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = text;
    b.hidden = false;
    b.classList.remove('show');
    void b.offsetWidth; // restart the CSS animation
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => (b.hidden = true), seconds * 1000);
  }

  // Training shift coach card: { title, text (may hold <kbd>), step, steps, progress }, or null to hide.
  coach(c) {
    const e = this.el;
    e.coach.hidden = !c;
    if (!c) return;
    e.coachStep.textContent = `TRAINING ${c.step}/${c.steps}`;
    e.coachTitle.textContent = c.title;
    e.coachText.innerHTML = c.text;
    e.coach.classList.remove('show');
    void e.coach.offsetWidth; // restart the CSS animation
    e.coach.classList.add('show');
    this.coachProgress(c.progress);
  }

  coachProgress(v) {
    const e = this.el;
    e.coachFill.parentNode.style.display = v === null ? 'none' : '';
    if (v !== null) e.coachFill.setAttribute('width', Math.round(v * 100));
  }

  reset(game) {
    this.cache = {};
    this.el.banner.hidden = true;
    this.coach(null);
    this.refreshSlots(game);
  }

  set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  update(game) {
    const p = game.player;
    const s = game.score;
    const e = this.el;
    this.set('xp', Math.floor((p.xp / p.xpNeed) * 1000), (v) => e.xp.setAttribute('width', v));
    this.set('level', p.level, (v) => (e.level.textContent = 'LV ' + v));
    this.set('time', Math.floor(game.time), (v) => (e.timer.textContent = fmtTime(v)));
    this.set('overtime', game.tutorial ? 'training' : game.time >= SHIFT_LENGTH, (v) => {
      e.shift.textContent = v === 'training' ? 'TRAINING SHIFT' : v ? 'OVERTIME' : 'SHIFT ENDS ' + fmtTime(SHIFT_LENGTH);
      e.shift.classList.toggle('over', v === true);
    });
    const boss = game.bossAlive() ? game.boss : null;
    this.set('bossOn', boss ? boss.uid : 0, () => {
      e.boss.hidden = !boss;
      if (boss) e.bossName.textContent = boss.def.name;
    });
    this.set('bossAngry', !!boss && game.bossPhase2, (v) => e.boss.classList.toggle('angry', v));
    if (boss) this.set('bossHp', Math.ceil(game.bossHpFrac() * 200), (v) => e.bossFill.setAttribute('width', v / 2));
    this.set('hp', Math.max(0, Math.ceil(p.hp)), (v) => {
      e.hp.setAttribute('width', (v / p.maxHp) * 100);
      e.hpText.textContent = v + '/' + p.maxHp;
    });
    this.set('kills', s.kills, (v) => (e.kills.textContent = v));
    this.set('csat', s.csat, (v) => (e.csat.textContent = v));
    this.set('mult', s.mult, (v) => (e.mult.textContent = v > 1 ? `x${v} STREAK` : ''));
  }

  // Rebuilds the weapon/passive icon rows (only called when they change).
  refreshSlots(game) {
    const p = game.player;
    const slot = (ic, lvl, max, evolved) =>
      evolved
        ? `<div class="slot evolved">${icon(ic, 24)}<span class="pips">EVO</span></div>`
        : `<div class="slot">${icon(ic, 24)}<span class="pips">${'▮'.repeat(lvl)}${'▯'.repeat(max - lvl)}</span></div>`;
    const empty = '<div class="slot empty"></div>';
    this.el.weapons.innerHTML =
      p.weapons.map((w) => slot(w.def.icon, w.level, w.def.levels.length, w.def.evolved)).join('') + empty.repeat(MAX_WEAPONS - p.weapons.length);
    const passives = Object.entries(p.passives);
    this.el.passives.innerHTML =
      passives.map(([id, lvl]) => slot(PASSIVES[id].icon, lvl, PASSIVES[id].maxLevel)).join('') + empty.repeat(MAX_PASSIVES - passives.length);
  }
}
