// Floor pickups. Closed Tickets (XP gems) are dropped by enemies, magnetized when
// inside your pickup radius, collected on contact. Items (pizza, Bulk Close, PTO,
// Change Approved chests) drop rarely and do something when touched.

import { TICKET_TIERS, TICKETS, ITEMS, ITEM_PICKUP_RADIUS, MAX_ITEMS } from '../../data/pickups.js';
import { addXp } from './player.js';
import { sfx } from '../engine/audio.js';

export function makeTicket() {
  return { x: 0, y: 0, value: 0, spr: null, magnet: false, speed: 0, t: 0, age: 0, dead: false };
}

function tierSprite(game, value) {
  let s = TICKET_TIERS[0].sprite;
  for (const t of TICKET_TIERS) if (value >= t.minValue) s = t.sprite;
  return game.assets.sprite(s);
}

// Returns the ticket (a magnetized one flies to you).
export function dropTicket(game, x, y, value) {
  const pool = game.tickets;
  let t = pool.spawn();
  if (!t) {
    // Floor is full: move the ticket farthest from you here and fold the XP into it,
    // so XP keeps landing where the fighting is instead of piling up across the map.
    const p = game.player;
    let far = -1;
    for (let i = 0; i < pool.count; i++) {
      const o = pool.items[i];
      if (o.magnet) continue;
      const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
      if (d > far) (far = d), (t = o);
    }
    if (!t) t = pool.items[(Math.random() * pool.count) | 0];
    value += t.value;
  }
  t.x = x;
  t.y = y;
  t.value = value;
  t.spr = tierSprite(game, value);
  t.magnet = false;
  t.speed = TICKETS.magnetSpeed;
  t.t = Math.random() * 6;
  t.age = 0; // seconds on the floor (Ticket Blitz makes them vanish)
  t.dead = false;
  return t;
}

export function updateTickets(game, dt) {
  const p = game.player;
  const pool = game.tickets;
  const pr = p.def.pickupRadius * p.stats.pickupRadius;
  const pr2 = pr * pr;
  const cr2 = TICKETS.collectRadius * TICKETS.collectRadius;
  const life = game.policy.ticketLife; // Ticket Blitz: 0 = tickets stay
  for (let i = pool.count - 1; i >= 0; i--) {
    const t = pool.items[i];
    t.t += dt;
    if (life && !t.magnet && (t.age += dt) > life) {
      pool.removeAt(i);
      continue;
    }
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const d2 = dx * dx + dy * dy;
    if (!t.magnet && d2 < pr2) {
      t.magnet = true;
      t.speed = TICKETS.magnetSpeed;
    }
    if (t.magnet) {
      t.speed += TICKETS.magnetAccel * dt;
      const d = Math.sqrt(d2) || 1;
      const step = Math.min(d, t.speed * dt);
      t.x += (dx / d) * step;
      t.y += (dy / d) * step;
      if (d2 < cr2 || step >= d) {
        addXp(game, t.value);
        sfx('ticket');
        pool.removeAt(i);
      }
    }
  }
}

export function drawTickets(game, ctx, left, top, right, bottom) {
  const pool = game.tickets;
  for (let i = 0; i < pool.count; i++) {
    const t = pool.items[i];
    if (t.x < left - 8 || t.x > right + 8 || t.y < top - 8 || t.y > bottom + 8) continue;
    if (t.age > game.policy.ticketLife - 2 && game.policy.ticketLife && ((t.age * 8) & 1)) continue; // about to vanish: blink
    const s = t.spr;
    const f = s.anims.idle.frames[0];
    const bob = Math.round(Math.sin(t.t * 4) * 1.5);
    ctx.drawImage(s.image, f[0], f[1], s.w, s.h, Math.round(t.x - s.w / 2), Math.round(t.y - s.h / 2) + bob, s.w, s.h);
  }
}

// --- Items ---------------------------------------------------------------------------

export function makeItem() {
  return { id: '', def: null, spr: null, x: 0, y: 0, t: 0, magnet: false, speed: 0 };
}

export function dropItem(game, id, x, y) {
  const it = game.items.spawn();
  if (!it) return;
  it.id = id;
  it.def = ITEMS[id];
  it.spr = game.assets.sprite(it.def.sprite);
  it.x = x;
  it.y = y;
  it.t = 0;
  it.magnet = false;
  it.speed = 0;
}

// Called when an enemy is closed: per-kill item chances, plus the enemy's own `drops`.
export function rollItemDrops(game, e) {
  const odds = game.policy.items; // Team Lunch / No Pizza Policy: per-pickup multipliers
  const loot = e.def.loot;
  if (loot) {
    const allowed = loot.filter((id) => odds[id] !== 0);
    return allowed.length && dropItem(game, allowed[(Math.random() * allowed.length) | 0], e.x, e.y);
  }
  const drops = e.def.drops;
  if (drops) {
    for (const id in drops) if (Math.random() < drops[id] * (odds[id] ?? 1)) dropItem(game, id, e.x, e.y);
    return;
  }
  if (game.items.count >= MAX_ITEMS) return;
  const luck = game.player.stats.luck; // Lucky Lanyard
  for (const id in ITEMS) {
    if (ITEMS[id].maps && !ITEMS[id].maps.includes(game.mapId)) continue;
    const c = ITEMS[id].chance * luck * (odds[id] ?? 1);
    if (c && Math.random() < c) return dropItem(game, id, e.x, e.y);
  }
}

// What pickups do, by the names in their `effects` (data/pickups.js). (game, def) => void.
export const ITEM_EFFECTS = {
  heal(game, d) {
    const p = game.player;
    p.hp = Math.min(p.maxHp, p.hp + d.heal);
  },
  boost(game, d) {
    game.player.boost = d.speed;
    game.player.boostT = d.time;
  },
  invulnerable(game, d) {
    game.player.invuln = d.invulnerable;
  },
  // Every ticket on the floor flies to you.
  bulkClose(game) {
    const tk = game.tickets;
    for (let i = 0; i < tk.count; i++) {
      const t = tk.items[i];
      if (!t.magnet) {
        t.magnet = true;
        t.speed = TICKETS.magnetSpeed * 3;
      }
    }
  },
  chest(game) {
    game.openChest();
  },
};

function collect(game, it) {
  const p = game.player;
  const d = it.def;
  game.fx.text(p.x, p.y - 30, d.label, '#ffcd75');
  if (d.tally) game.achievements.run[d.tally]++;
  if (d.burst) game.fx.burst(p.x, p.y - 8, d.burst[0], d.burst[1]);
  if (d.ring) game.fx.ring(p.x, p.y, ...d.ring);
  if (d.sound) sfx(d.sound);
  for (const name of d.effects) ITEM_EFFECTS[name](game, d); // last: a chest pauses the game
}

export function updateItems(game, dt) {
  const p = game.player;
  const pool = game.items;
  const pr = p.def.pickupRadius * p.stats.pickupRadius;
  const touch = ITEM_PICKUP_RADIUS + p.r;
  for (let i = pool.count - 1; i >= 0; i--) {
    const it = pool.items[i];
    it.t += dt;
    const dx = p.x - it.x;
    const dy = p.y - it.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < touch) {
      pool.removeAt(i); // remove first: a chest pauses the game inside collect()
      collect(game, it);
      continue;
    }
    if (!it.magnet && d < pr) it.magnet = true;
    if (it.magnet) {
      it.speed += TICKETS.magnetAccel * 0.5 * dt;
      const step = Math.min(d, it.speed * dt);
      it.x += (dx / d) * step;
      it.y += (dy / d) * step;
    }
  }
}

export function drawItems(game, ctx, left, top, right, bottom) {
  const pool = game.items;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  for (let i = 0; i < pool.count; i++) {
    const it = pool.items[i];
    const s = it.spr;
    if (it.x < left - 8 || it.x > right + 8 || it.y < top - 8 || it.y > bottom + 8) {
      // Off-screen chests get an arrow at the screen edge pointing to them.
      if (it.def.edgeArrow) drawEdgeArrow(ctx, cx, cy, it.x, it.y, left, top, right, bottom, it.t);
      continue;
    }
    const f = s.anims.idle.frames[0];
    const bob = Math.round(Math.sin(it.t * 3) * 2);
    if (it.def.glow) {
      ctx.globalAlpha = 0.35 + 0.2 * Math.sin(it.t * 5);
      ctx.fillStyle = it.def.glow;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(s.image, f[0], f[1], s.w, s.h, Math.round(it.x - s.w / 2), Math.round(it.y - s.h / 2) + bob, s.w, s.h);
  }
}

function drawEdgeArrow(ctx, cx, cy, x, y, left, top, right, bottom, t) {
  const dx = x - cx;
  const dy = y - cy;
  const hw = (right - left) / 2 - 14;
  const hh = (bottom - top) / 2 - 14;
  const k = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(Math.round(cx + dx * k), Math.round(cy + dy * k));
  ctx.rotate(a);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6);
  ctx.fillStyle = '#ffcd75';
  ctx.strokeStyle = '#1a1c2c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -6);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
