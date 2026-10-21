// Debug overlay (toggle with `): FPS, entity counts and cheat hotkeys.

import { fmtTime } from './hud.js';

// Debug mode (cheat hotkeys) only on a local server or with ?debug in the address.
export const DEBUG_ALLOWED =
  ['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).has('debug');

const HELP = [
  ['1', 'spawn 50 Pams'],
  ['2', 'spawn 300 Pams'],
  ['3', 'level up'],
  ['4', 'skip +1 minute'],
  ['5', 'god mode'],
  ['6', 'clear enemies'],
  ['7', 'spawn one of each user'],
  ['8', 'add next weapon'],
  ['9', 'skip to next event'],
  ['0', 'drop a Change Approved chest'],
  ['-', 'evolution kit (max weapons + passives)'],
  ['=', 'start the next boss fight now'],
  [']', '+1000 Overtime Pay'],
];

export class Debug {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.on = false;
    this.frames = 0;
    this.acc = 0;
    this.fps = 0;
    this.worst = 0;
    root.style.display = 'none';
  }

  toggle() {
    this.on = !this.on;
    this.root.style.display = this.on ? '' : 'none';
    this.acc = 0.5; // refresh the panel on the next frame
  }

  hotkey(code) {
    const g = this.game;
    switch (code) {
      case 'Digit1': return g.debugSpawn(undefined, 50);
      case 'Digit2': return g.debugSpawn(undefined, 300);
      case 'Digit3': return g.debugLevelUp();
      case 'Digit4': g.time += 60; return;
      case 'Digit5': g.player.god = !g.player.god; return;
      case 'Digit6': g.enemies.clear(); return;
      case 'Digit7': return g.debugSpawnEach();
      case 'Digit8': return g.debugAddWeapon();
      case 'Digit9': return g.spawner.skipToNextEvent(g);
      case 'Digit0': return g.debugChest();
      case 'Minus': return g.debugEvolveKit();
      case 'Equal': return g.debugBoss();
      case 'BracketRight':
        g.meta.data.pay += 1000;
        g.meta.save();
        return;
    }
  }

  // Called once per rendered frame with the real frame time.
  frame(dt) {
    this.frames++;
    this.acc += dt;
    if (dt > this.worst) this.worst = dt;
    if (this.acc < 0.5) return;
    this.fps = Math.round(this.frames / this.acc);
    const worst = (this.worst * 1000).toFixed(1);
    this.frames = 0;
    this.acc = 0;
    this.worst = 0;
    if (!this.on) return;
    const g = this.game;
    const fx = g.fx;
    this.root.innerHTML =
      `<b>${this.fps} FPS</b> (worst ${worst} ms)<br>` +
      `enemies ${g.enemies.count}/${g.enemies.capacity}<br>` +
      `tickets ${g.tickets.count} · items ${g.items.count} · projectiles ${g.projectiles.count} · zones ${g.zones.pool.count}<br>` +
      `boss bullets ${g.hazards.bullets.count} · bombs ${g.hazards.bombs.count}<br>` +
      `particles ${fx.particles.count} · numbers ${fx.numbers.count}<br>` +
      `time ${fmtTime(g.time)} · zoom ${g.view.scale}x · view ${Math.round(g.view.w)}x${Math.round(g.view.h)}<br>` +
      `god ${g.player.god ? 'ON' : 'off'}<br>` +
      HELP.map(([k, t]) => `<kbd>${k}</kbd> ${t}`).join('<br>');
  }
}
