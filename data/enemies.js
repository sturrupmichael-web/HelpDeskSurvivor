// End-user definitions. `behavior` picks a movement module from src/game/behaviors/,
// `params` are passed to it. HP and speed are multiplied by the wave timeline at spawn.
//
//   hp        base hit points
//   speed     world px / second
//   damage    sanity drained per second while touching the player
//   radius    collision radius (world px)
//   foot      px from collision center down to the sprite's feet (default 10)
//   xp        value of the Closed Ticket dropped (0 = no drop)
//   knockback 0..1, how much of a weapon's knockback applies (1 = full)
//   resist    damage multipliers by weapon tag, e.g. { policy: 0.4 }
//   onDeath   { spawn, count }: enemies released when this one is closed
//   explode   { damage }: dies on contact, dealing this much sanity damage at once
//   elite     draws a health bar
//   boss      shown on the boss bar, can't be shoved by the horde; `final` ends the shift when closed
//   stunResist multiplier on stun duration (bosses barely flinch)
//   drops     extra drop chances on death, e.g. { chest: 0.5 }
//   particle  palette colors for the death burst

export const ENEMIES = {
  pam: {
    name: 'Password Reset Pam', sprite: 'pam', behavior: 'chase',
    hp: 6, speed: 34, damage: 8, radius: 7, xp: 1, knockback: 1,
    particle: ['#7a4ea0', '#ffcd75', '#f4f4f4'],
    flavor: '"It says my password expired. Again. I only changed it in March."',
  },
  quinn: {
    name: '"Quick Question" Quinn', sprite: 'quinn', behavior: 'dart',
    params: { dashEvery: 2.2, dashTime: 0.35, dashMult: 3.4, range: 220, approachMult: 0.75 },
    hp: 4, speed: 52, damage: 6, radius: 6, xp: 1, knockback: 1.2,
    particle: ['#38b764', '#ffcd75', '#f4f4f4'],
    flavor: '"Got a sec? It\'ll only take a sec. It is never a sec."',
  },
  randy: {
    name: 'Reply-All Randy', sprite: 'randy', behavior: 'chase',
    hp: 16, speed: 34, damage: 10, radius: 7, xp: 2, knockback: 0.8,
    onDeath: { spawn: 'randy_small', count: 3 },
    particle: ['#f4f4f4', '#b13e53', '#1a1c2c'],
    flavor: '"Please remove me from this list." (sent to 4,000 people)',
  },
  randy_small: {
    name: 'Reply-All Reply', sprite: 'randy_small', behavior: 'chase',
    hp: 4, speed: 50, damage: 4, radius: 5, foot: 5, xp: 1, knockback: 1.3,
    particle: ['#f4f4f4', '#b13e53'],
  },
  phish: {
    name: 'Phish Clicker', sprite: 'phish', behavior: 'summoner',
    params: { every: 4.5, count: 2, minion: 'malware', keepDistance: 120 },
    hp: 26, speed: 30, damage: 8, radius: 7, xp: 4, knockback: 0.8,
    particle: ['#b13e53', '#5d3a1a', '#f4f4f4'],
    flavor: '"The email said I won a gift card, so naturally I entered my password."',
  },
  malware: {
    name: 'Malware', sprite: 'malware', behavior: 'chase',
    hp: 3, speed: 56, damage: 5, radius: 5, foot: 4, xp: 1, knockback: 1.4,
    particle: ['#b13e53', '#7a4ea0'],
  },
  jammer: {
    name: 'Printer Jammer', sprite: 'jammer', behavior: 'dropper',
    params: { every: 4.5, zone: { radius: 18, life: 5, slow: 0.55 } },
    hp: 70, speed: 22, damage: 14, radius: 10, xp: 6, knockback: 0.25,
    particle: ['#f4f4f4', '#94b0c2', '#566c86'],
    flavor: '"I didn\'t touch anything. It just started making that noise."',
  },
  steve: {
    name: 'Shadow IT Steve', sprite: 'steve', behavior: 'teleport',
    params: { every: 2.8, range: 90, minDistance: 36 },
    hp: 22, speed: 40, damage: 10, radius: 7, xp: 4, knockback: 0.9,
    resist: { policy: 0.4 },
    particle: ['#29366f', '#38b764', '#1a1c2c'],
    flavor: '"It\'s fine, I set up my own server. Under my desk. On the guest Wi-Fi."',
  },
  vip: {
    name: 'The VIP', sprite: 'vip', behavior: 'aura',
    params: { radius: 72, speedBuff: 1.5 },
    hp: 180, speed: 30, damage: 18, radius: 8, xp: 20, knockback: 0.15, elite: true,
    drops: { chest: 0.15 },
    particle: ['#29366f', '#b13e53', '#f4f4f4'],
    flavor: '"This is urgent. Everything I send is urgent."',
  },
  walkup: {
    name: 'Ticket-less Walk-Up', sprite: 'walkup', behavior: 'chase',
    hp: 10, speed: 70, damage: 0, radius: 7, xp: 2, knockback: 0.6,
    noSeparation: true, explode: { damage: 14 },
    particle: ['#41a6f6', '#94b0c2', '#b13e53', '#ffcd75'],
    flavor: '"I didn\'t make a ticket, I figured I\'d just swing by."',
  },

  // --- Bosses (spawned by events in data/waves.js; HP is not scaled by the timeline) ---
  incident: {
    name: 'Major Incident', sprite: 'incident', behavior: 'incidentBoss', boss: true,
    params: {
      ringEvery: 4.5, ringTelegraph: 1.0, ringBullets: 22, ringGap: 3, bulletSpeed: 85, bulletDamage: 12,
      minionEvery: 5, minionCount: 6, minion: 'status_update', enrageAt: 0.5,
    },
    hp: 12000, speed: 20, damage: 20, radius: 22, foot: 16, xp: 60, knockback: 0, stunResist: 0.1,
    downBanner: ['INCIDENT RESOLVED', 'Post-mortem scheduled for never. Grab the Change Approved.'],
    particle: ['#566c86', '#b13e53', '#ffcd75', '#f4f4f4'],
    flavor: 'Severity 1. Forty people on the bridge. Nobody is typing.',
  },
  // Map bosses: replace the Major Incident at 10:00 on their map (`boss` in data/maps.js).
  // Every non-final boss drops a Change Approved chest where it goes down.
  ratsnest: {
    name: "The Rat's Nest", sprite: 'ratsnest', behavior: 'ratsnestBoss', boss: true,
    params: {
      lashEvery: 3.2, lashTelegraph: 0.9, lashLength: 180, lashWidth: 14, lashDamage: 16,
      snagEvery: 6, snagCount: 3, snagScatter: 70,
      snag: { radius: 16, life: 7, slow: 0.4, sprite: 'cable_loop' },
      splitAt: 0.5, small: 'ratsnest_small',
    },
    hp: 13000, speed: 18, damage: 20, radius: 24, foot: 24, xp: 60, knockback: 0, stunResist: 0.1,
    downBanner: ['CABLES MANAGED', 'Labeled, zip-tied and finally documented. Grab the Change Approved.'],
    particle: ['#41a6f6', '#ffcd75', '#38b764', '#ef7d57'],
    flavor: 'Nobody knows what half of these plug into. Unplugging any of them takes down payroll.',
  },
  ratsnest_small: {
    name: "The Rat's Nest", sprite: 'ratsnest_small', behavior: 'ratsnestBoss', boss: true,
    params: {
      lashEvery: 3.2, lashTelegraph: 0.9, lashLength: 180, lashWidth: 12, lashDamage: 12,
      snagEvery: 6, snagCount: 1, snagScatter: 50,
      snag: { radius: 16, life: 7, slow: 0.4, sprite: 'cable_loop' },
      isSmall: true,
    },
    hp: 4000, speed: 18, damage: 14, radius: 16, foot: 16, xp: 20, knockback: 0, stunResist: 0.1,
    particle: ['#41a6f6', '#ffcd75', '#38b764', '#ef7d57'],
  },
  caller: {
    name: 'The Angry Caller', sprite: 'caller', behavior: 'callerBoss', boss: true,
    params: {
      keepAway: [120, 190], attackGap: [2.4, 1.7], enrageAt: 0.5,
      attacks: ['hold', 'scream', 'conference'],
      hold: { count: 10, radius: 62, bombRadius: 24, gap: 2, delay: 1.5, ringGap: 0.6, damage: 16 },
      scream: { telegraph: 0.8, spread: 0.9, range: 230, damage: 14, push: 420 },
      conference: { id: 'randy', count: 10, radius: 170 },
    },
    hp: 12500, speed: 40, damage: 20, radius: 20, foot: 26, xp: 60, knockback: 0, stunResist: 0.1,
    downBanner: ['CALL RESOLVED', 'They rated you 1 star anyway. Grab the Change Approved.'],
    particle: ['#7a4ea0', '#b13e53', '#73eff7', '#f4f4f4'],
    flavor: '"I have been on hold for FORTY minutes. I want your name. And your manager\'s name."',
  },
  janitor: {
    name: 'The Night Janitor', sprite: 'janitor', behavior: 'janitorBoss', boss: true,
    params: {
      attackGap: [2.6, 1.9], enrageAt: 0.5, trailEvery: 0.45,
      attacks: ['mop', 'charge', 'lights'],
      wet: { radius: 18, life: 8, slip: true, sprite: 'wet_floor' },
      mop: { count: 6, spread: 1.3, reach: 130 },
      charge: { telegraph: 1.0, speed: 300, time: 0.85, damage: 24 },
      lights: { time: 5, scale: 0.5 },
    },
    hp: 13500, speed: 26, damage: 22, radius: 20, foot: 26, xp: 60, knockback: 0, stunResist: 0.1,
    downBanner: ['FLOOR CLEAN', 'He clocked out. Caution: still wet. Grab the Change Approved.'],
    particle: ['#566c86', '#ef7d57', '#41a6f6', '#ffcd75'],
    flavor: 'Has keys to every door in the building. Has never once been asked his name.',
  },
  status_update: {
    name: 'Status Update Request', sprite: 'status_update', behavior: 'chase',
    hp: 8, speed: 58, damage: 6, radius: 5, foot: 4, xp: 1, knockback: 1.2,
    particle: ['#ffcd75', '#f4f4f4'],
    flavor: '"Any update?" (sent 30 seconds after the last update)',
  },
  executive: {
    name: 'The Executive Who Needs It Fixed Before The Board Meeting', sprite: 'executive', behavior: 'executiveBoss',
    boss: true, final: true,
    params: {
      phases: [0.66, 0.33], // HP fractions where phase 2 and 3 begin
      attackGap: [2.6, 2.2, 1.6], // seconds between attacks, per phase
      charge: { telegraph: 0.9, speed: 320, time: 0.75, damage: 22 },
      cone: { telegraph: 0.7, bullets: 7, spread: 1.0, speed: 120, damage: 12, volleys: [1, 1, 2] },
      bombs: { count: 5, radius: 34, delay: 1.3, damage: 22, scatter: 90 },
      summon: { id: 'vip', count: 2 },
      // Attacks the boss picks from in each phase (never the same one twice in a row).
      attacks: [['charge', 'cone'], ['charge', 'cone', 'bombs'], ['charge', 'cone', 'bombs', 'summon']],
      phaseBanners: [
        null,
        ['ESCALATED', "Now cc'ing your manager's manager."],
        ['FINAL PHASE', "It's 8:59. The board is logging in."],
      ],
    },
    hp: 80000, speed: 30, damage: 25, radius: 22, foot: 26, xp: 0, knockback: 0, stunResist: 0.1,
    particle: ['#29366f', '#b13e53', '#f4f4f4', '#ffcd75'],
    flavor: '"I don\'t need the details. I just need it working. By 9."',
  },
};
