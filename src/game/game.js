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
import { sfx, toggleMute, startMusic, stopMusic, duckMusic, setVolumes } from '../engine/audio.js';
import { drawTouchStick } from '../engine/input.js';
import { loadSettings, saveSettings } from './settings.js';
import { Achievements } from './achievements.js';
import { Floor } from './floor.js';
import { createPlayer, updatePlayer, addXp } from './player.js';
import { makeEnemy, updateEnemies, resolveEnemies, drawEnemies, drawBossTelegraphs } from './enemies.js';

import { makeTicket, updateTickets, drawTickets, makeItem, dropItem, updateItems, drawItems } from './pickups.js';
import { Hazards } from './hazards.js';
import { createWeapon, updateWeapons, drawWeapons, drawWeaponsUnder } from './weapons/index.js';
import { WEAPONS } from '../../data/weapons.js';
import { MAX_WEAPONS } from '../../data/passives.js';
import { ENEMIES } from '../../data/enemies.js';
import { createProjectilePool, updateProjectiles, drawProjectiles } from './projectiles.js';
import { Zones } from './zones.js';
import { rollChoices, applyChoice, openChest } from './upgrades.js';
import { setWeaponLevel } from './weapons/index.js';
import { recomputeStats } from './player.js';
import { Spawner } from './spawner.js';
import { Meta } from './meta.js';
import { Score } from './score.js';
import { Fx } from './fx.js';
import { Hud } from '../ui/hud.js';
import { Screens } from '../ui/screens.js';
import { Debug, DEBUG_ALLOWED } from '../ui/debug.js';

const TARGET_VIEW_HEIGHT = 480; // world px visible vertically, before integer rounding
const TARGET_VIEW_WIDTH_MIN = 300; // narrow (portrait) screens zoom in to about this width
const PLAYER_FOOT = 10; // px from the player's collision center down to their feet
const VICTORY_DELAY = 3.5; // seconds between closing the final boss and the summary screen

export class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
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
    this.fx = new Fx();
    this.spawner = new Spawner();
    this.score = new Score();
    this.hud = new Hud(document.getElementById('hud'));
    this.screens = new Screens(document.getElementById('overlay'), this);
    this.debug = new Debug(document.getElementById('debug'), this);
    this.meta = new Meta();
    this.settings = loadSettings();
    this.achievements = new Achievements(this);
    this.applySettings();
    this.hud.onPause(() => {
      if (this.state === 'run') this.pause();
    });
    this.time = 0;
    this.boss = null; // the boss on the HUD bar (check bossAlive(): pool objects get reused)
    this.bossUid = 0;
    this.victoryT = 0;

    this.resize();
    addEventListener('resize', () => this.resize());
    onKeyPress((code) => this.onKey(code));

    this.newRun();
    this.setState('title');
    this.screens.title();
  }

  applySettings() {
    const s = this.settings;
    setVolumes(s.sfx, s.music);
    this.camera.enabled = s.shake;
    this.fx.showNumbers = s.numbers;
    saveSettings(s);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.canvas.width = Math.floor(innerWidth * dpr);
    this.canvas.height = Math.floor(innerHeight * dpr);
    // Aim for ~TARGET_VIEW_HEIGHT world px tall, capped so narrow (portrait) screens still
    // show ~TARGET_VIEW_WIDTH_MIN wide instead of a huge world of tiny sprites.
    const zoom = Math.min(this.canvas.height / TARGET_VIEW_HEIGHT, this.canvas.width / TARGET_VIEW_WIDTH_MIN);
    const scale = Math.max(1, Math.round(zoom));
    this.view.scale = scale;
    this.view.w = this.canvas.width / scale;
    this.view.h = this.canvas.height / scale;
  }

  setState(s) {
    if (s === 'title' && this.state === 'over') startMusic(); // music plays everywhere but the summary
    this.state = s;
    this.hud.setVisible(s !== 'title');
  }

  // --- Run lifecycle ------------------------------------------------------------------
  newRun(charId = this.meta.data.selected) {
    const def = CHARACTERS[charId];
    this.player = createPlayer(def, this.assets.sprite(def.sprite), this.meta);
    this.player.weapons.push(createWeapon(def.starter, 0));
    this.enemies.clear();
    this.tickets.clear();
    this.items.clear();
    this.hazards.clear();
    this.projectiles.clear();
    this.zones.clear();
    this.fx.clear();
    this.score.reset();
    this.spawner.reset();
    this.achievements.startRun();
    this.time = 0;
    this.boss = null;
    this.victoryT = 0;
    this.autoPizza = false; // everything maxed and the player chose "always take the pizza"
    this.camera.snap(0, 0);
    this.hud.reset(this);
    this.setState('run');
    this.screens.hide();
    startMusic();
  }

  endRun(won) {
    const p = this.player;
    this.setState('over');
    stopMusic();
    sfx(won ? 'victory' : 'burnout');
    const stats = {
      won,
      character: p.def.name,
      time: this.time,
      kills: this.score.kills,
      csat: this.score.csat,
      bestStreak: this.score.bestStreak,
      level: p.level,
      tools: p.weapons
        .map((w) => ({ name: w.def.name, icon: w.def.icon, evolved: !!w.def.evolved, damage: Math.round(w.damageDone) }))
        .sort((a, b) => b.damage - a.damage),
    };
    const { pay, records } = this.meta.finishShift(stats);
    const r = this.achievements.run;
    r.ended = true;
    r.won = won;
    r.time = this.time;
    r.kills = this.score.kills;
    this.achievements.check();
    this.screens.gameOver({ ...stats, pay, records, balance: this.meta.data.pay });
  }

  // Union Rep (shop): come back from burnout once per revive, clearing some space.
  revive() {
    const p = this.player;
    p.revives--;
    this.achievements.run.revived = true;
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
    this.hud.banner('UNION REP INTERVENED', 'Mandatory 15-minute break. You are back, at half sanity.', 3);
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
    this.screens.levelUp(choices, p.rerolls > 0 && !onlyPizza ? reroll : null, p.rerolls, (choice, always) => {
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
    this.camera.shake(5);
  }

  bossAlive() {
    const b = this.boss;
    return !!b && !b.dead && b.uid === this.bossUid;
  }

  // Called from killEnemy for any boss.
  onBossDown(e) {
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
      this.hud.banner('SHIFT COMPLETE', 'The Executive left for the board meeting. Everyone else went home.', VICTORY_DELAY);
      sfx('evolve');
    } else {
      this.achievements.run.incident = true;
      this.hud.banner('INCIDENT RESOLVED', 'Post-mortem scheduled for never. Grab the Change Approved.', 3);
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
    if (code === 'Backquote') return DEBUG_ALLOWED && this.debug.toggle();
    if (code === 'KeyM') {
      this.hud.setMuted(toggleMute());
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
    updateProjectiles(this, dt);
    this.enemies.compact(); // hash indices are stale after this point
    this.zones.update(this, dt);
    this.hazards.update(this, dt);
    updateTickets(this, dt);
    updateItems(this, dt); // may open the chest screen
    this.fx.update(dt);
    this.score.update(dt);
    this.achievements.update(dt);
    this.camera.follow(p.x, p.y, dt);

    if (p.hp <= 0 && p.revives > 0) this.revive();
    else if (p.hp <= 0) this.endRun(false);
    else if (this.victoryT > 0 && (this.victoryT -= dt) <= 0) this.endRun(true);
    else if (this.state === 'run' && p.pendingLevels > 0) this.openLevelUp();
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
    if (p.weapons.length >= MAX_WEAPONS) return;
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
      if (!w && p.weapons.length < MAX_WEAPONS) p.weapons.push((w = createWeapon(id, p.weapons.length)));
      if (!w) continue;
      setWeaponLevel(w, w.def.levels.length);
      p.passives[evo.passive] = Math.max(1, p.passives[evo.passive] ?? 0);
    }
    recomputeStats(p);
    this.hud.refreshSlots(this);
  }
  // Starts a boss fight right now (the next boss on the timeline, or the Executive).
  debugBoss() {
    const ev = EVENTS.find((e) => e.type === 'boss' && e.t > this.time) ?? EVENTS.filter((e) => e.type === 'boss').pop();
    this.hud.banner(ev.title, ev.text, 3);
    sfx('siren');
    this.spawner.bossEvent(this, ev);
  }

  // --- Rendering ----------------------------------------------------------------------
  render(frameDt) {
    const { ctx, view, camera, player: p } = this;
    const s = view.scale;
    // Snap the camera to whole screen pixels to avoid shimmering.
    const left = Math.round((camera.x + camera.ox - view.w / 2) * s) / s;
    const top = Math.round((camera.y + camera.oy - view.h / 2) * s) / s;
    const right = left + view.w;
    const bottom = top + view.h;
    ctx.setTransform(s, 0, 0, s, -left * s, -top * s);
    ctx.imageSmoothingEnabled = false;

    this.floor.draw(ctx, left, top, view.w, view.h);
    this.zones.draw(ctx);
    drawWeaponsUnder(this, ctx);
    drawTickets(this, ctx, left, top, right, bottom);
    drawItems(this, ctx, left, top, right, bottom);
    const sh = shadow();
    drawEnemies(this, ctx, sh, left, top, right, bottom);
    this.hazards.drawTelegraphs(ctx);
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
    if (this.settings.stick) drawTouchStick(ctx, this.dpr);

    this.debug.frame(frameDt);
  }
}
