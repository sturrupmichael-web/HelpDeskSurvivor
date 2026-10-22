// Game orchestrator: owns the world (pools, spatial hash, spawner), runs the fixed
// simulation tick, renders the world, and switches between title/run/pause/level-up/
// chest/game-over states. Gameplay rules live in the modules it calls.

import { Camera } from '../engine/camera.js';
import { Pool } from '../engine/pool.js';
import { SpatialHash } from '../engine/spatialHash.js';
import { onKeyPress } from '../engine/input.js';
import { shadow } from '../engine/renderer.js';
import { CHARACTERS } from '../../data/player.js';
import { SPAWNER, EVENTS } from '../../data/waves.js';
import { TICKETS, MAX_ITEMS } from '../../data/pickups.js';
import { EVOLUTIONS } from '../../data/evolutions.js';
import { sfx, toggleMute, isMuted, startMusic, stopMusic, duckMusic, setVolumes, setMusicStyle, setListener } from '../engine/audio.js';
import { drawTouchStick } from '../engine/input.js';
import { loadSettings, saveSettings } from './settings.js';
import { Timeline } from './timeline.js';
import { setHaptics } from '../engine/haptics.js';
import { Achievements } from './achievements.js';
import { Floor } from './floor.js';
import { createPlayer, updatePlayer, addXp } from './player.js';
import { makeEnemy, updateEnemies, resolveEnemies, drawEnemies, drawBossTelegraphs, spawnEnemy, stunEnemy } from './enemies.js';

import { makeTicket, updateTickets, drawTickets, makeItem, dropItem, updateItems, drawItems } from './pickups.js';
import { Hazards } from './hazards.js';
import { createWeapon, createCrew, updateWeapons, drawWeapons, drawWeaponsUnder } from './weapons/index.js';
import { WEAPONS } from '../../data/weapons.js';
import { ENEMIES } from '../../data/enemies.js';
import { createProjectilePool, updateProjectiles, drawProjectiles } from './projectiles.js';
import { Zones } from './zones.js';
import { MapTwist } from './maps.js';
import { MAPS } from '../../data/maps.js';
import { rollChoices, applyChoice, openChest } from './upgrades.js';
import { setWeaponLevel } from './weapons/index.js';
import { recomputeStats } from './player.js';
import { Spawner, mapEvent } from './spawner.js';
import { Meta } from './meta.js';
import { Score } from './score.js';
import { Fx } from './fx.js';
import { recordWiki } from './wiki.js';
import { Tutorial } from './tutorial.js';
import { performanceReview } from './review.js';
import { CloudSave } from './cloudsave.js';
import { combinePolicies, NO_POLICY } from './policies.js';

const TARGET_VIEW_HEIGHT = 480; // world px visible vertically, before integer rounding
const TARGET_VIEW_WIDTH_MIN = 300; // narrow (portrait) screens zoom in to about this width
const PLAYER_FOOT = 10; // px from the player's collision center down to their feet
const VICTORY_DELAY = 3.5; // seconds between closing the final boss and the summary screen

const HEADLESS_VIEW = [854, 480]; // world px "on screen" when there is no canvas

// The game itself knows nothing about the page: `ui(game)` returns its HUD, menus and
// debug overlay (src/ui/index.js in the browser, src/game/headless.js in Node), and
// `canvas` may be null, which runs the simulation without drawing (headless).
export class Game {
  constructor(canvas, assets, ui) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', { alpha: false }) ?? null;
    this.assets = assets;
    this.view = { w: 0, h: 0, scale: 1 };
    this.camera = new Camera();
    this.floor = new Floor(assets);
    this.enemies = new Pool(SPAWNER.maxEnemies, makeEnemy);
    this.tickets = new Pool(TICKETS.maxOnFloor, makeTicket);
    this.items = new Pool(MAX_ITEMS, makeItem);
    this.hazards = new Hazards(assets);
    this.hash = new SpatialHash(32, 128, 128, SPAWNER.maxEnemies);
    this.scratch = new Int32Array(SPAWNER.maxEnemies); // query buffers (two, for nested queries)
    this.scratch2 = new Int32Array(SPAWNER.maxEnemies);
    this.projectiles = createProjectilePool();
    this.zones = new Zones(assets);
    this.twist = new MapTwist();
    this.fx = new Fx();
    this.spawner = new Spawner();
    this.score = new Score();
    ({ hud: this.hud, screens: this.screens, debug: this.debug } = ui(this));
    this.policy = NO_POLICY; // this shift's Shift Policies, combined (src/game/policies.js)
    this.meta = new Meta();
    this.cloud = new CloudSave(this.meta);
    this.settings = loadSettings();
    this.setMap(this.meta.data.map);
    this.achievements = new Achievements(this);
    this.applySettings();
    this.time = 0;
    this.boss = null; // the boss on the HUD bar (check bossAlive(): pool objects get reused)
    this.bossUid = 0;
    this.bossParts = []; // [enemy, uid] for every piece of a boss that splits (Rat's Nest)
    this.bossMax = 1; // HP of the whole boss fight, for the HUD bar
    this.bossDef = null;
    this.bossPhase2 = false; // the current fight has reached its second phase (behaviors/phase2.js)
    this.victoryT = 0;

    this.resize();
    if (canvas) {
      addEventListener('resize', () => this.resize());
      onKeyPress((code) => this.onKey(code));
    }

    this.newRun();
    this.setState('title');
    this.screens.title();
  }

  applySettings() {
    const s = this.settings;
    setVolumes(s.sfx, s.music);
    this.camera.enabled = s.shake;
    this.fx.showNumbers = s.numbers;
    this.fx.calm = s.calm;
    setHaptics(s.vibrate);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('calm', s.calm);
      document.documentElement.classList.toggle('big-text', s.bigText);
    }
    saveSettings(s);
  }

  // The canvas is the size of the world view (one canvas pixel per world pixel) and the
  // browser scales it up by a whole number with image-rendering: pixelated. Pixel art looks
  // the same as drawing every sprite scaled up, at a fraction of the pixels to fill.
  resize() {
    if (!this.canvas) {
      [this.view.w, this.view.h] = HEADLESS_VIEW;
      this.stickScale = 1;
      this.hash.resize(128);
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    const dw = innerWidth * dpr;
    const dh = innerHeight * dpr;
    // Aim for ~TARGET_VIEW_HEIGHT world px tall, capped so narrow (portrait) screens still
    // show ~TARGET_VIEW_WIDTH_MIN wide instead of a huge world of tiny sprites.
    const zoom = Math.max(1, Math.round(Math.min(dh / TARGET_VIEW_HEIGHT, dw / TARGET_VIEW_WIDTH_MIN)));
    const w = Math.ceil(dw / zoom);
    const h = Math.ceil(dh / zoom);
    this.canvas.width = w;
    this.canvas.height = h;
    // Exactly zoom device pixels per canvas pixel (a hair larger than the window; the
    // overflow is cropped), so every world pixel is the same size on screen.
    this.canvas.style.width = (w * zoom) / dpr + 'px';
    this.canvas.style.height = (h * zoom) / dpr + 'px';
    this.view.scale = zoom;
    this.view.w = w;
    this.view.h = h;
    // Touch stick: CSS px -> canvas px.
    this.stickScale = dpr / zoom;
    // Collision grid: just big enough for everything the spawner keeps (it moves users
    // left further behind than SPAWNER.recycleDistance back to the screen edge).
    const reach = (Math.hypot(w, h) / 2) * SPAWNER.recycleDistance + 64;
    this.hash.resize(Math.min(128, Math.ceil((reach * 2) / this.hash.cell)));
    this.dirty = true;
  }

  setState(s) {
    if (s === 'title' && this.state === 'over') startMusic(); // music plays everywhere but the summary
    this.state = s;
    this.dirty = true; // draw the world once more in the new state
    this.hud.setVisible(s !== 'title');
  }

  // Switches the floor art, music remix and twist to a map from data/maps.js.
  setMap(id) {
    this.mapId = id;
    this.map = MAPS[id];
    this.floor.setStyle(this.map.floor);
    this.dirty = true;
    setMusicStyle(this.map.music);
  }

  // --- Run lifecycle ------------------------------------------------------------------
  // `policy`: the shift's Shift Policies (data/policies.js), by default the saved picks.
  newRun(charId = this.meta.data.selected, policy = combinePolicies(this.meta.data.policies, this.meta.data.reorg)) {
    const def = CHARACTERS[charId];
    this.policy = policy;
    this.player = createPlayer(def, this.assets.sprite(def.sprite), this.meta, policy);
    this.player.weapons.push(createWeapon(def.starter, 0));
    if (def.crew) this.player.innate.push(createCrew(def.crew)); // Help Desk Supervisor
    for (const id of def.alsoStarts ?? []) this.player.weapons.push(createWeapon(id, this.player.weapons.length)); // IT Director
    // Tools, passives and evolutions this save hasn't unlocked yet (data/unlocks.js), and
    // passives a policy keeps off the cards (No Pizza Policy: no Snack Drawer).
    this.player.locked = (kind, id) => !this.meta.itemUnlocked(kind, id) || (kind === 'passives' && policy.lockPassives.includes(id));
    this.startingTools(policy.startTools);
    this.enemies.clear();
    this.tickets.clear();
    this.items.clear();
    this.hazards.clear();
    this.projectiles.clear();
    this.zones.clear();
    this.twist.reset();
    this.fx.clear();
    this.score.reset();
    this.spawner.reset();
    this.achievements.startRun();
    this.cheated = this.debug.on;
    this.time = 0;
    this.timeline = new Timeline();
    this.boss = null;
    this.bossParts.length = 0;
    this.bossPhase2 = false;
    this.victoryT = 0;
    this.beatT = 0; // low-sanity heartbeat timer
    this.phishT = 0; // Security Manager: seconds since the last phishing test
    this.boxT = 0; // Asset Management Analyst: seconds since the last moving box
    this.autoPizza = false; // everything maxed and the player chose "always take the pizza"
    this.tutorial = null; // the training shift's script, while one runs
    if (this.mapId !== this.meta.data.map) this.setMap(this.meta.data.map); // back from training
    this.camera.snap(0, 0);
    this.hud.reset(this);
    this.setState('run');
    this.screens.hide();
    startMusic();
  }

  // Onboarding Buddy / Vendor Lock-In: extra random tools at the start, maybe levelled up,
  // and with Vendor Lock-In no new tools after that.
  startingTools(st) {
    if (!st) return;
    const p = this.player;
    const pool = Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved && !p.weapons.some((w) => w.id === id) && !p.locked('tools', id));
    for (let k = 0; k < st.random && pool.length && p.weapons.length < p.maxWeapons; k++) {
      const id = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      const w = createWeapon(id, p.weapons.length);
      setWeaponLevel(w, Math.min(st.level, w.def.levels.length));
      p.weapons.push(w);
    }
    const starter = p.weapons[0];
    setWeaponLevel(starter, Math.min(st.starterLevel, starter.def.levels.length));
    if (st.noNewTools) p.maxWeapons = p.weapons.length;
  }

  // Training shift (src/game/tutorial.js): always on the Office with the selected tech,
  // and never with Shift Policies.
  startTutorial() {
    this.newRun(undefined, NO_POLICY);
    this.setMap('office');
    this.spawner.stopped = true; // the tutorial spawns its own users
    this.tutorial = new Tutorial(this);
  }

  // Training done: remember it, then the "you're ready" screen. Not a shift: no pay,
  // no records, no leaderboard.
  finishTutorial() {
    this.meta.data.trained = true;
    this.meta.save();
    recordWiki(this);
    this.setState('over');
    stopMusic();
    sfx('victory');
    this.screens.trainingDone();
  }

  endRun(won) {
    const p = this.player;
    this.setState('over');
    stopMusic();
    sfx(won ? 'victory' : 'burnout');
    const stats = {
      won,
      cheated: !!this.cheated,
      character: p.def.name,
      map: this.mapId,
      mapName: this.map.name,
      time: this.time,
      kills: this.score.kills,
      csat: this.score.csat,
      policies: [...this.policy.ids],
      reorg: this.policy.reorg,
      policyMult: this.policy.mult,
      score: Math.round(this.score.csat * this.policy.mult), // what the leaderboard ranks
      evolutions: this.achievements.run.evolutions,
      bestStreak: this.score.bestStreak,
      level: p.level,
      payMult: p.def.payMult ?? 1, // IT Director
      tools: [...p.weapons, ...p.innate]
        .map((w) => ({ name: w.def.name, icon: w.def.icon, evolved: !!w.def.evolved, damage: Math.round(w.damageDone) }))
        .sort((a, b) => b.damage - a.damage),
      timeline: this.timeline.result(this),
    };
    const wikiNew = recordWiki(this);
    const { pay, records, newMap, newUnlocks, newPolicies, policiesOpened } = this.meta.finishShift(stats);
    const r = this.achievements.run;
    r.ended = true;
    r.won = won;
    r.time = this.time;
    r.kills = this.score.kills;
    this.achievements.check();
    const review = performanceReview(stats, r);
    this.screens.gameOver({ ...stats, pay, records, newMap, newUnlocks, newPolicies, policiesOpened, wikiNew, review, balance: this.meta.data.pay });
  }

  // Extended Warranty (passive), Long Weekend (policy) or Union Rep (shop): come back from
  // burnout, clearing some space. Claimed in that order.
  revive() {
    const p = this.player;
    const warranty = p.warranty > 0;
    const weekend = !warranty && p.longWeekend > 0;
    if (warranty) p.warranty--;
    else if (weekend) p.longWeekend--;
    else p.revives--;
    this.achievements.run.revived = true;
    this.timeline.mark(this, 'revive', 'Back from burnout');
    p.hp = p.maxHp * 0.5;
    p.invuln = 3;
    const pool = this.enemies;
    for (let i = 0; i < pool.count; i++) {
      const e = pool.items[i];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 160 && !e.heavy) {
        e.kx += (dx / d) * 400;
        e.ky += (dy / d) * 400;
      }
    }
    this.fx.ring(p.x, p.y, 160, '#ffcd75', 0.6, true);
    this.camera.shake(6);
    if (warranty) this.hud.banner('WARRANTY CLAIM APPROVED', 'Covered under your Extended Warranty. Back at half sanity.', 3);
    else if (weekend) this.hud.banner('LONG WEEKEND', 'You remembered Friday is off. Back at half sanity.', 3);
    else this.hud.banner('UNION REP INTERVENED', 'Mandatory 15-minute break. You are back, at half sanity.', 3);
    sfx('pto');
  }

  openLevelUp(rerolled = false) {
    const p = this.player;
    const choices = rollChoices(this);
    const onlyPizza = choices.length === 1 && choices[0].kind === 'reward';
    if (onlyPizza && this.autoPizza) {
      // Auto-take the pizza for every pending level without opening the screen.
      while (p.pendingLevels > 0) {
        applyChoice(this, choices[0]);
        p.pendingLevels--;
      }
      this.fx.text(p.x, p.y - 30, 'VENDOR LUNCH', '#ffcd75');
      sfx('heal');
      return;
    }
    this.setState('levelup');
    if (!rerolled) sfx('levelup');
    const reroll = () => {
      p.rerolls--;
      this.openLevelUp(true);
    };
    this.screens.levelUp(choices, this.tutorial?.levelUpTip(), p.rerolls > 0 && !onlyPizza ? reroll : null, p.rerolls, (choice, always) => {
      if (always) this.autoPizza = true;
      applyChoice(this, choice);
      this.player.pendingLevels--;
      this.hud.refreshSlots(this);
      if (this.player.pendingLevels > 0) this.openLevelUp();
      else {
        this.setState('run');
        this.screens.hide();
      }
    });
  }

  pause() {
    this.setState('paused');
    duckMusic(true);
    this.screens.pause();
  }

  resume() {
    this.setState('run');
    duckMusic(false);
    this.screens.hide();
  }

  onPlayerHurt() {
    this.score.onHurt();
  }

  // --- Bosses -------------------------------------------------------------------------
  setBoss(e) {
    this.boss = e;
    this.bossUid = e.uid;
    this.bossParts.length = 0;
    this.bossParts.push([e, e.uid]);
    this.bossMax = e.maxHp;
    this.bossPhase2 = false;
    this.bossDef = e.def; // the pieces' pool objects may be reused by the time it's over
    this.achievements.run.bossesMet.push(e.def.sprite); // for the Knowledge Base
    this.camera.shake(5);
  }

  // Another piece of the current boss: the fight lasts until every piece is down.
  addBossPart(e) {
    this.bossParts.push([e, e.uid]);
  }

  bossAlive() {
    const b = this.boss;
    if (b && !b.dead && b.uid === this.bossUid) return true;
    // The tracked piece is down: follow another live one, if any.
    for (const [e, uid] of this.bossParts) {
      if (e.dead || e.uid !== uid) continue;
      this.boss = e;
      this.bossUid = uid;
      return true;
    }
    return false;
  }

  // HUD bar: what is left of the whole fight (all pieces together).
  bossHpFrac() {
    let hp = 0;
    for (const [e, uid] of this.bossParts) if (!e.dead && e.uid === uid) hp += Math.max(0, e.hp);
    return Math.min(1, hp / this.bossMax);
  }

  // Called from killEnemy for any boss.
  onBossDown(e) {
    if (this.bossParts.length > 1 && this.bossAlive()) {
      // One piece of a split boss: the fight goes on.
      this.camera.shake(4);
      this.fx.ring(e.x, e.y, 50, '#ffcd75', 0.5, true);
      this.fx.burst(e.x, e.y - 10, e.def.particle, 20);
      sfx('pop');
      return;
    }
    this.camera.shake(8);
    this.fx.ring(e.x, e.y, 90, '#ffcd75', 0.6, true);
    this.fx.ring(e.x, e.y, 120, '#f4f4f4', 0.8);
    this.fx.burst(e.x, e.y - 20, e.def.particle, 40);
    this.hazards.clear();
    if (e.def.final) {
      // Shift over: everyone else goes home, then the summary screen.
      this.victoryT = VICTORY_DELAY;
      this.spawner.stopped = true;
      this.player.invuln = VICTORY_DELAY + 1;
      const pool = this.enemies;
      for (let i = 0; i < pool.count; i++) {
        const o = pool.items[i];
        if (o.dead) continue;
        o.dead = true;
        if (i < 200) this.fx.burst(o.x, o.y - 6, o.def.particle, 2);
      }
      for (let i = 0; i < this.tickets.count; i++) this.tickets.items[i].magnet = true; // bulk close on the way out
      const [title, text] = e.def.downBanner ?? ['SHIFT COMPLETE', 'Everyone went home.'];
      this.hud.banner(title, text, VICTORY_DELAY);
      sfx('evolve');
    } else {
      // A split boss's last piece (no banner of its own) counts as the whole boss.
      const def = e.def.downBanner || !this.bossDef ? e.def : this.bossDef;
      this.achievements.run.bosses.push(def.sprite);
      const [title, text] = def.downBanner ?? ['BOSS DOWN', 'Grab the Change Approved.'];
      this.hud.banner(title, text, 3);
      dropItem(this, 'chest', e.x, e.y);
      sfx('chest');
    }
  }

  // --- Change Approved chest ------------------------------------------------------------
  openChest() {
    this.setState('chest');
    const result = openChest(this);
    if (result.evolved) this.achievements.run.evolutions++;
    sfx(result.evolved ? 'evolve' : 'chest');
    this.hud.refreshSlots(this);
    this.screens.chest(result, () => {
      this.setState('run');
      this.screens.hide();
    });
  }

  onKey(code) {
    if (code === 'Backquote' && this.debug.allowed) {
      this.debug.toggle();
      if (this.debug.on) this.cheated = true; // no leaderboard for this shift
      return;
    }
    if (code === 'KeyM') {
      this.hud.setMuted(toggleMute());
      // Keep the Sound buttons on the pause menu and Settings in step.
      const pauseBtn = this.screens.root.querySelector('[data-act=mute]');
      if (pauseBtn) pauseBtn.innerHTML = pauseBtn.innerHTML.replace(/On|Off/, isMuted() ? 'Off' : 'On');
      const toggle = this.screens.root.querySelector('[data-mute]');
      if (toggle) {
        toggle.textContent = isMuted() ? 'OFF' : 'ON';
        toggle.classList.toggle('on', !isMuted());
        toggle.setAttribute('aria-pressed', !isMuted());
      }
      return;
    }
    if (this.screens.onKey(code)) return;
    if (this.state === 'run') {
      if (code === 'Escape' || code === 'KeyP' || code === 'PadStart') this.pause();
      else if (this.debug.on) this.debug.hotkey(code);
    }
  }

  // --- Simulation ---------------------------------------------------------------------
  update(dt) {
    if (this.state === 'run') this.tick(dt);
    if (this.state !== 'title') this.hud.update(this);
  }

  tick(dt) {
    const p = this.player;
    this.time += dt;
    updatePlayer(this, dt);
    this.spawner.update(this, dt);
    updateEnemies(this, dt);
    this.hash.build(this.enemies.items, this.enemies.count, p.x, p.y);
    resolveEnemies(this, dt);
    updateWeapons(this, dt);
    this.techPerks(dt);
    updateProjectiles(this, dt);
    this.enemies.compact(); // hash indices are stale after this point
    this.zones.update(this, dt);
    this.twist.update(this, dt);
    this.hazards.update(this, dt);
    updateTickets(this, dt);
    updateItems(this, dt); // may open the chest screen
    this.fx.update(dt);
    this.score.update(dt);
    this.timeline.update(this);
    if (this.tutorial) this.tutorial.update(dt);
    else this.achievements.update(dt);
    this.camera.follow(p.x, p.y, dt);
    setListener(p.x);
    // Low sanity: you can hear your pulse.
    if (p.hp > 0 && p.hp < p.maxHp * 0.25 && (this.beatT -= dt) <= 0) {
      this.beatT = 0.9;
      sfx('heartbeat');
    }

    if (p.hp <= 0 && (p.warranty > 0 || p.longWeekend > 0 || p.revives > 0)) this.revive();
    else if (p.hp <= 0) this.endRun(false);
    else if (this.victoryT > 0 && (this.victoryT -= dt) <= 0) this.endRun(true);
    else if (this.state === 'run' && p.pendingLevels > 0) this.openLevelUp();
  }

  // Tech perks that act on the floor (data/player.js): the Security Manager's phishing
  // test and the Asset Management Analyst's moving boxes. Not during training or the
  // victory walk-off.
  techPerks(dt) {
    const p = this.player;
    const d = p.def;
    if (this.spawner.stopped || this.victoryT > 0) return;
    if (d.phishTest && (this.phishT += dt) >= d.phishTest.every) {
      this.phishT = 0;
      // Everyone on screen stops to read the email.
      const hw = this.view.w / 2 + 16;
      const hh = this.view.h / 2 + 16;
      const pool = this.enemies;
      for (let i = 0; i < pool.count; i++) {
        const e = pool.items[i];
        if (!e.dead && Math.abs(e.x - this.camera.x) < hw && Math.abs(e.y - this.camera.y) < hh) stunEnemy(e, d.phishTest.stun);
      }
      this.fx.ring(p.x, p.y, Math.max(hw, hh), '#7a4ea0', 0.5);
      this.fx.text(p.x, p.y - 30, 'PHISHING TEST', '#ffcd75');
      sfx('error');
    }
    if (d.boxEvery && (this.boxT += dt) >= d.boxEvery) {
      this.boxT = 0;
      let boxes = 0;
      const pool = this.enemies;
      for (let i = 0; i < pool.count; i++) if (pool.items[i].def.anchored && !pool.items[i].dead) boxes++;
      if (boxes < 3) {
        const a = Math.random() * Math.PI * 2;
        const r = 110 + Math.random() * 70;
        spawnEnemy(this, 'moving_box', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, this.spawner.sample(this.time, 'hpMult'));
      }
    }
  }

  // Debug helpers (see ui/debug.js).
  debugSpawn(id, n) {
    for (let i = 0; i < n; i++) this.spawner.spawn(this, id);
  }
  debugLevelUp() {
    addXp(this, (this.player.xpNeed - this.player.xp) / this.player.stats.growth + 0.01);
  }
  debugSpawnEach() {
    let i = 0;
    const ids = Object.keys(ENEMIES).filter((id) => !ENEMIES[id].boss);
    for (const id of ids) this.spawner.spawn(this, id, (i++ / ids.length) * Math.PI * 2);
  }
  // Adds the next weapon the player doesn't have yet (up to the slot limit).
  debugAddWeapon() {
    const p = this.player;
    if (p.weapons.length >= p.maxWeapons) return;
    const id = Object.keys(WEAPONS).find((k) => !WEAPONS[k].evolved && !p.weapons.some((w) => w.id === k || w.def.from === k));
    if (id) p.weapons.push(createWeapon(id, p.weapons.length));
    this.hud.refreshSlots(this);
  }

  debugChest() {
    dropItem(this, 'chest', this.player.x + 40, this.player.y);
  }
  // Every evolvable weapon at max level plus its passive, so chests evolve them.
  debugEvolveKit() {
    const p = this.player;
    for (const [id, evo] of Object.entries(EVOLUTIONS)) {
      let w = p.weapons.find((x) => x.id === id);
      if (!w && p.weapons.some((x) => x.def.from === id)) continue; // already evolved
      if (!w && p.weapons.length < p.maxWeapons) p.weapons.push((w = createWeapon(id, p.weapons.length)));
      if (!w) continue;
      setWeaponLevel(w, w.def.levels.length);
      p.passives[evo.passive] = Math.max(1, p.passives[evo.passive] ?? 0);
    }
    recomputeStats(p);
    this.hud.refreshSlots(this);
  }
  // Starts a boss fight right now (the next boss on the timeline, or the Executive).
  debugBoss() {
    const ev = mapEvent(EVENTS.find((e) => e.type === 'boss' && e.t > this.time) ?? EVENTS.filter((e) => e.type === 'boss').pop(), this.map);
    this.hud.banner(ev.title, ev.text, 3);
    sfx('siren');
    this.spawner.bossEvent(this, ev);
  }

  // --- Rendering ----------------------------------------------------------------------
  render(frameDt) {
    if (!this.ctx) return; // headless
    this.debug.frame(frameDt);
    // Menus, level-ups and the summary freeze the world: draw it once, then leave the
    // canvas alone until play resumes (or the window or map changes).
    if (this.state !== 'run' && !this.dirty) return;
    this.dirty = false;
    const { ctx, view, camera, player: p } = this;
    // Snap the camera to whole world pixels (one canvas pixel each) to avoid shimmering.
    const left = Math.round(camera.x + camera.ox - view.w / 2);
    const top = Math.round(camera.y + camera.oy - view.h / 2);
    const right = left + view.w;
    const bottom = top + view.h;
    ctx.setTransform(1, 0, 0, 1, -left, -top);
    ctx.imageSmoothingEnabled = false;

    this.floor.draw(ctx, left, top, view.w, view.h);
    this.zones.draw(ctx);
    drawWeaponsUnder(this, ctx);
    drawTickets(this, ctx, left, top, right, bottom);
    drawItems(this, ctx, left, top, right, bottom);
    const sh = shadow();
    drawEnemies(this, ctx, sh, left, top, right, bottom);
    this.hazards.drawTelegraphs(this, ctx);
    drawBossTelegraphs(this, ctx);

    // Player (blinks and wears a blue halo while Out of Office)
    const fy = p.y + PLAYER_FOOT;
    ctx.drawImage(sh, Math.round(p.x - 10), Math.round(fy - 3));
    if (p.invuln > 0 && this.victoryT <= 0) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#41a6f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = p.invuln < 1.5 && (p.invuln * 8) & 1 ? 0.4 : 0.8;
    }
    const a = p.spr.anims.walk;
    const frames = p.flash > 0 && a.hit ? a.hit : a.frames;
    const f = frames[p.moving ? Math.floor(p.animT * p.spr.fps) % frames.length : 0];
    const spr = p.spr;
    if (p.flip) ctx.drawImage(spr.imageFlipped, spr.sheetWidth - f[0] - spr.w, f[1], spr.w, spr.h, Math.round(p.x - (spr.w - spr.anchor[0])), Math.round(fy - spr.anchor[1]), spr.w, spr.h);
    else ctx.drawImage(spr.image, f[0], f[1], spr.w, spr.h, Math.round(p.x - spr.anchor[0]), Math.round(fy - spr.anchor[1]), spr.w, spr.h);
    ctx.globalAlpha = 1;

    drawWeapons(this, ctx);
    drawProjectiles(this, ctx);
    this.hazards.draw(ctx);
    this.fx.draw(ctx);

    // Small sanity bar under the player.
    const bw = 20;
    const bx = Math.round(p.x - bw / 2);
    const by = Math.round(fy + 3);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
    ctx.fillStyle = '#b13e53';
    ctx.fillRect(bx, by, Math.max(0, (p.hp / p.maxHp) * bw), 2);

    // Screen-space overlays.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.twist.drawOverlay(this, ctx, p.x - left, p.y - 4 - top)) {
      // In the dark, attacks you have to dodge still show up.
      ctx.setTransform(1, 0, 0, 1, -left, -top);
      this.hazards.drawTelegraphs(this, ctx);
      drawBossTelegraphs(this, ctx);
      this.hazards.draw(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (this.settings.stick) drawTouchStick(ctx, this.stickScale);
  }
}
