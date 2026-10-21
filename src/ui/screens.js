// Full-screen overlays: title, Clock In picker (tech then map), character select, Overtime Pay shop, pause, level-up
// choice, Change Approved chest, and the end-of-shift summary.
// Each screen renders into the overlay element and handles its own keys via onKey().
// The screens themselves live in src/ui/screens/, one file per screen; the methods below
// just forward to them, so callers keep using game.screens.title() and so on.

import { gamepadConnected } from '../engine/input.js';
import { Floor } from '../game/floor.js';
import { title } from './screens/title.js';
import { trainingOffer, trainingDone } from './screens/training.js';
import { settings } from './screens/settings.js';
import { achievementsScreen, stats } from './screens/achievements.js';
import { shiftSetup } from './screens/shiftSetup.js';
import { leaderboard } from './screens/leaderboard.js';
import { maps } from './screens/maps.js';
import { characters } from './screens/characters.js';
import { shop } from './screens/shop.js';
import { pause } from './screens/pause.js';
import { levelUp, chest } from './screens/levelUp.js';
import { gameOver } from './screens/gameOver.js';

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
    return [...this.root.querySelectorAll('button:not([disabled]), input, textarea')];
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
    return title(this);
  }

  trainingOffer() {
    return trainingOffer(this);
  }

  trainingDone() {
    return trainingDone(this);
  }

  settings(back) {
    return settings(this, back);
  }

  achievementsScreen() {
    return achievementsScreen(this);
  }

  stats() {
    return stats(this);
  }

  shiftSetup(step = 'char', pick) {
    return shiftSetup(this, step, pick);
  }

  // Floor previews in every <canvas data-map>: one generated chunk of each map, scaled down.
  drawMapThumbs() {
    const floor = new Floor(this.game.assets);
    this.root.querySelectorAll('canvas[data-map]').forEach((c) => {
      floor.setStyle(c.dataset.map);
      floor.setOwned(0.5);
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(floor.build(...floor.previewChunk()), 0, 0, 256, 256, 0, 0, c.width, c.height);
    });
  }

  leaderboard(mapId = this.game.meta.data.map) {
    return leaderboard(this, mapId);
  }

  maps() {
    return maps(this);
  }

  characters() {
    return characters(this);
  }

  shop() {
    return shop(this);
  }

  pause() {
    return pause(this);
  }

  levelUp(choices, tip, onReroll, rerollsLeft, onPick) {
    return levelUp(this, choices, tip, onReroll, rerollsLeft, onPick);
  }

  chest(result, onClose) {
    return chest(this, result, onClose);
  }

  gameOver(s) {
    return gameOver(this, s);
  }
}
