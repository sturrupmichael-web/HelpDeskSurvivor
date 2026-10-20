// Weapon definitions. `behavior` picks a module from src/game/weapons/.
// `levels` has one full row per level (1..8) so you can read and tune each level directly.
// `notes` is the text shown on the level-up card for reaching that level.
//
// Common stats (not every behavior uses every stat):
//   damage    per hit (multiplied by the Domain Admin Rights passive)
//   cooldown  seconds between activations (Runbook passive reduces it)
//   radius    area size in world px (Second Monitor passive increases it)
//   knockback push strength in world px/s
//   speed     how fast the effect travels / expands (Mechanical Keyboard increases it)
//   count     projectiles / shields per activation
//   pierce    extra enemies a projectile passes through
//
// `tags` matter for enemy resistances (Shadow IT Steve shrugs off `policy` weapons).
// `sprite` is the projectile / deployable sprite id. `weight` is the chance of being
// offered on a level-up card relative to other items.

export const WEAPONS = {
  reboot: {
    name: 'Turn It Off and On Again',
    icon: 'power',
    behavior: 'pulse',
    tags: ['restart'],
    weight: 10, // chance weight when rolling level-up cards
    desc: 'Releases a shockwave around you at regular intervals.',
    flavor: 'Have you tried turning it off and on again?',
    color: '#41a6f6',
    levels: [
      { damage: 7, cooldown: 2.0, radius: 52, knockback: 140, speed: 260 },
      { damage: 9, cooldown: 2.0, radius: 52, knockback: 140, speed: 260 },
      { damage: 9, cooldown: 1.8, radius: 60, knockback: 150, speed: 280 },
      { damage: 12, cooldown: 1.8, radius: 60, knockback: 150, speed: 280 },
      { damage: 12, cooldown: 1.6, radius: 68, knockback: 160, speed: 300 },
      { damage: 15, cooldown: 1.6, radius: 72, knockback: 160, speed: 300 },
      { damage: 18, cooldown: 1.4, radius: 76, knockback: 170, speed: 320 },
      { damage: 24, cooldown: 1.2, radius: 84, knockback: 180, speed: 340 },
    ],
    notes: [
      'Releases a shockwave around you.',
      '+2 damage.',
      'Larger area, faster reboots.',
      '+3 damage.',
      'Larger area, faster reboots.',
      '+3 damage, larger area.',
      '+3 damage, faster reboots.',
      'Hard power cycle: +6 damage, much faster, much larger.',
    ],
  },
  autoClose: {
    name: 'Ticket Auto-Close', icon: 'ticket', behavior: 'projectile', sprite: 'proj_ticket',
    tags: ['ticket'], weight: 10, color: '#f4f4f4',
    desc: 'Fires closed tickets at the nearest user.',
    flavor: 'Closing due to no response. It has been four minutes.',
    levels: [
      { damage: 9, cooldown: 1.2, count: 1, speed: 240, pierce: 0, life: 1.6, knockback: 40 },
      { damage: 9, cooldown: 1.2, count: 2, speed: 240, pierce: 0, life: 1.6, knockback: 40 },
      { damage: 12, cooldown: 1.1, count: 2, speed: 250, pierce: 0, life: 1.6, knockback: 40 },
      { damage: 12, cooldown: 1.1, count: 3, speed: 250, pierce: 1, life: 1.6, knockback: 40 },
      { damage: 15, cooldown: 1.0, count: 3, speed: 260, pierce: 1, life: 1.7, knockback: 50 },
      { damage: 15, cooldown: 0.9, count: 4, speed: 270, pierce: 1, life: 1.7, knockback: 50 },
      { damage: 19, cooldown: 0.9, count: 4, speed: 280, pierce: 2, life: 1.8, knockback: 50 },
      { damage: 24, cooldown: 0.8, count: 5, speed: 300, pierce: 2, life: 1.8, knockback: 60 },
    ],
    notes: ['Fires closed tickets at the nearest user.', '+1 ticket per burst.', '+3 damage, slightly faster.', '+1 ticket, tickets pierce 1 user.', '+3 damage, faster.', '+1 ticket, faster.', '+4 damage, pierce 2 users.', 'Bulk close: +1 ticket, +5 damage, faster.'],
  },

  kbArticle: {
    name: 'KB Article', icon: 'kb', behavior: 'boomerang', sprite: 'proj_kb',
    tags: ['docs'], weight: 10, color: '#41a6f6',
    desc: 'Throws a knowledge-base article that cuts through users and comes back.',
    flavor: 'It\'s all in the KB. Nobody reads the KB.',
    levels: [
      { damage: 12, cooldown: 2.4, count: 1, speed: 240, range: 130, knockback: 70 },
      { damage: 15, cooldown: 2.4, count: 1, speed: 240, range: 140, knockback: 70 },
      { damage: 15, cooldown: 2.2, count: 2, speed: 250, range: 140, knockback: 70 },
      { damage: 19, cooldown: 2.2, count: 2, speed: 250, range: 155, knockback: 80 },
      { damage: 19, cooldown: 2.0, count: 3, speed: 260, range: 155, knockback: 80 },
      { damage: 24, cooldown: 2.0, count: 3, speed: 260, range: 170, knockback: 90 },
      { damage: 28, cooldown: 1.8, count: 3, speed: 280, range: 180, knockback: 90 },
      { damage: 34, cooldown: 1.6, count: 4, speed: 300, range: 200, knockback: 100 },
    ],
    notes: ['Throws an article that pierces and returns.', '+3 damage, longer throw.', '+1 article, faster.', '+4 damage, longer throw.', '+1 article, faster.', '+5 damage, longer throw.', '+4 damage, faster.', 'Full documentation: +1 article, +6 damage, much longer throw.'],
  },

  firewall: {
    name: 'Firewall', icon: 'firewall', behavior: 'orbit', sprite: 'proj_firewall',
    tags: ['policy', 'security'], weight: 10, color: '#b13e53',
    desc: 'Brick shields orbit you for a few seconds at a time.',
    flavor: 'Default deny. Especially for Steve.',
    levels: [
      { damage: 8, count: 2, radius: 42, rotSpeed: 3.0, duration: 3.0, cooldown: 3.0, hitInterval: 0.5, knockback: 120 },
      { damage: 8, count: 3, radius: 42, rotSpeed: 3.0, duration: 3.0, cooldown: 3.0, hitInterval: 0.5, knockback: 120 },
      { damage: 11, count: 3, radius: 46, rotSpeed: 3.2, duration: 3.5, cooldown: 3.0, hitInterval: 0.5, knockback: 130 },
      { damage: 11, count: 4, radius: 46, rotSpeed: 3.2, duration: 3.5, cooldown: 2.8, hitInterval: 0.5, knockback: 130 },
      { damage: 14, count: 4, radius: 50, rotSpeed: 3.4, duration: 4.0, cooldown: 2.8, hitInterval: 0.45, knockback: 140 },
      { damage: 14, count: 5, radius: 50, rotSpeed: 3.6, duration: 4.0, cooldown: 2.6, hitInterval: 0.45, knockback: 140 },
      { damage: 18, count: 5, radius: 54, rotSpeed: 3.8, duration: 4.5, cooldown: 2.4, hitInterval: 0.4, knockback: 150 },
      { damage: 22, count: 6, radius: 58, rotSpeed: 4.0, duration: 5.0, cooldown: 2.0, hitInterval: 0.4, knockback: 160 },
    ],
    notes: ['Shields orbit you for a few seconds at a time.', '+1 shield.', '+3 damage, longer uptime.', '+1 shield, shorter downtime.', '+3 damage, longer uptime.', '+1 shield, faster spin.', '+4 damage, longer uptime.', 'Deny all: +1 shield, +4 damage, nearly always up.'],
  },

  groupPolicy: {
    name: 'Group Policy Push', icon: 'policy', behavior: 'aura',
    tags: ['policy'], weight: 10, color: '#38b764',
    desc: 'A policy field around you that damages and slows users inside it.',
    flavor: 'gpupdate /force. Then wait 90 minutes anyway.',
    levels: [
      { damage: 4, tick: 0.5, radius: 44, slow: 0.75 },
      { damage: 5, tick: 0.5, radius: 48, slow: 0.75 },
      { damage: 5, tick: 0.45, radius: 52, slow: 0.7 },
      { damage: 6, tick: 0.45, radius: 56, slow: 0.7 },
      { damage: 7, tick: 0.4, radius: 60, slow: 0.65 },
      { damage: 8, tick: 0.4, radius: 64, slow: 0.6 },
      { damage: 9, tick: 0.35, radius: 68, slow: 0.55 },
      { damage: 11, tick: 0.3, radius: 76, slow: 0.5 },
    ],
    notes: ['A field that damages and slows users.', '+1 damage, larger.', 'Ticks faster, larger, slows more.', '+1 damage, larger.', '+1 damage, ticks faster, slows more.', '+1 damage, larger, slows more.', '+1 damage, ticks faster.', 'Enforced: +2 damage, much larger, halves user speed.'],
  },

  rdp: {
    name: 'Remote Desktop Session', icon: 'rdp', behavior: 'homing', sprite: 'proj_rdp',
    tags: ['remote'], weight: 10, color: '#41a6f6',
    desc: 'Remote cursors that seek out users far away from you.',
    flavor: 'Can I take control of your screen? Please stop moving the mouse.',
    levels: [
      { damage: 14, cooldown: 1.8, count: 1, speed: 170, turn: 4.0, life: 3.0 },
      { damage: 14, cooldown: 1.8, count: 2, speed: 170, turn: 4.0, life: 3.0 },
      { damage: 18, cooldown: 1.7, count: 2, speed: 180, turn: 4.5, life: 3.0 },
      { damage: 18, cooldown: 1.6, count: 3, speed: 180, turn: 4.5, life: 3.2 },
      { damage: 23, cooldown: 1.5, count: 3, speed: 190, turn: 5.0, life: 3.2 },
      { damage: 23, cooldown: 1.4, count: 4, speed: 200, turn: 5.0, life: 3.4 },
      { damage: 28, cooldown: 1.3, count: 4, speed: 210, turn: 5.5, life: 3.4 },
      { damage: 34, cooldown: 1.1, count: 5, speed: 220, turn: 6.0, life: 3.6 },
    ],
    notes: ['Homing cursors that seek far-away users.', '+1 cursor.', '+4 damage, faster.', '+1 cursor.', '+5 damage, tighter turns.', '+1 cursor, faster.', '+5 damage.', 'Admin session: +1 cursor, +6 damage, much faster.'],
  },

  mfa: {
    name: 'MFA Prompt', icon: 'mfa', behavior: 'chain',
    tags: ['policy', 'security'], weight: 10, color: '#ffcd75',
    desc: 'A push notification that jumps between users and stuns them.',
    flavor: 'Approve sign-in? Users stop dead while they hunt for their phone.',
    levels: [
      { damage: 10, cooldown: 2.6, jumps: 3, jumpRange: 70, stun: 0.6 },
      { damage: 10, cooldown: 2.5, jumps: 4, jumpRange: 70, stun: 0.6 },
      { damage: 13, cooldown: 2.4, jumps: 4, jumpRange: 75, stun: 0.7 },
      { damage: 13, cooldown: 2.3, jumps: 5, jumpRange: 75, stun: 0.8 },
      { damage: 16, cooldown: 2.2, jumps: 6, jumpRange: 80, stun: 0.8 },
      { damage: 16, cooldown: 2.0, jumps: 7, jumpRange: 85, stun: 0.9 },
      { damage: 20, cooldown: 1.9, jumps: 8, jumpRange: 90, stun: 1.0 },
      { damage: 24, cooldown: 1.6, jumps: 10, jumpRange: 100, stun: 1.2 },
    ],
    notes: ['Chains between users and stuns them.', '+1 jump.', '+3 damage, longer stun.', '+1 jump, longer stun.', '+3 damage, +1 jump.', '+1 jump, faster.', '+4 damage, +1 jump, longer stun.', 'Number matching: +2 jumps, +4 damage, long stun.'],
  },

  powershell: {
    name: 'PowerShell Script', icon: 'terminal', behavior: 'turret', sprite: 'turret',
    tags: ['script'], weight: 10, color: '#3b5dc9',
    desc: 'Deploys a script turret that shoots nearby users.',
    flavor: 'Tested in production. Works on my machine.',
    levels: [
      { cooldown: 6.0, max: 1, duration: 5.0, fireRate: 0.6, damage: 8, range: 150, boltSpeed: 260 },
      { cooldown: 5.5, max: 1, duration: 6.0, fireRate: 0.55, damage: 9, range: 150, boltSpeed: 260 },
      { cooldown: 5.5, max: 2, duration: 6.0, fireRate: 0.55, damage: 9, range: 160, boltSpeed: 270 },
      { cooldown: 5.0, max: 2, duration: 6.5, fireRate: 0.5, damage: 11, range: 160, boltSpeed: 270 },
      { cooldown: 5.0, max: 2, duration: 7.0, fireRate: 0.45, damage: 12, range: 170, boltSpeed: 280 },
      { cooldown: 4.5, max: 3, duration: 7.0, fireRate: 0.4, damage: 12, range: 170, boltSpeed: 280 },
      { cooldown: 4.0, max: 3, duration: 7.5, fireRate: 0.35, damage: 14, range: 180, boltSpeed: 300 },
      { cooldown: 3.5, max: 4, duration: 8.0, fireRate: 0.3, damage: 16, range: 190, boltSpeed: 320 },
    ],
    notes: ['Deploys a turret that shoots nearby users.', 'Lasts longer, fires faster.', '+1 turret at a time.', '+2 damage, fires faster.', 'Lasts longer, fires faster.', '+1 turret at a time.', '+2 damage, fires faster.', 'Scheduled for every minute: +1 turret, much faster fire.'],
  },

  reimage: {
    name: 'Reimage', icon: 'disc', behavior: 'nuke',
    tags: ['restart'], weight: 3, color: '#41a6f6',
    desc: 'Rare. Wipes every user in a large radius back to factory settings.',
    flavor: 'Did you back up your files? You did not back up your files.',
    levels: [
      { damage: 120, cooldown: 18, radius: 130, knockback: 200 },
      { damage: 160, cooldown: 17, radius: 140, knockback: 200 },
      { damage: 200, cooldown: 16, radius: 150, knockback: 220 },
      { damage: 260, cooldown: 15, radius: 160, knockback: 220 },
      { damage: 320, cooldown: 14, radius: 175, knockback: 240 },
      { damage: 400, cooldown: 13, radius: 190, knockback: 240 },
      { damage: 480, cooldown: 12, radius: 205, knockback: 260 },
      { damage: 600, cooldown: 10, radius: 225, knockback: 280 },
    ],
    notes: ['Wipes everything in a large radius.', '+40 damage, larger.', '+40 damage, larger.', '+60 damage, larger.', '+60 damage, larger, faster.', '+80 damage, larger.', '+80 damage, larger.', 'Gold image: +120 damage, huge radius, much faster.'],
  },

  // --- Added with the new characters ---
  patchCable: {
    name: 'Patch Cable', icon: 'cable', behavior: 'whip', tags: ['network'], weight: 9, color: '#ffcd75',
    desc: 'Lashes a patch cable at the nearest user, hitting everything in a line.',
    flavor: 'Cat6, 15 feet, no idea which port it goes to.',
    levels: [
      { damage: 12, cooldown: 1.2, range: 70, width: 18, sides: 1, knockback: 80 },
      { damage: 15, cooldown: 1.2, range: 74, width: 18, sides: 1, knockback: 80 },
      { damage: 15, cooldown: 1.15, range: 78, width: 20, sides: 2, knockback: 90 },
      { damage: 18, cooldown: 1.15, range: 84, width: 20, sides: 2, knockback: 90 },
      { damage: 18, cooldown: 1.1, range: 90, width: 22, sides: 2, knockback: 100 },
      { damage: 22, cooldown: 1.0, range: 96, width: 22, sides: 2, knockback: 100 },
      { damage: 25, cooldown: 0.95, range: 102, width: 24, sides: 2, knockback: 110 },
      { damage: 32, cooldown: 0.9, range: 112, width: 26, sides: 2, knockback: 120 },
    ],
    notes: ['Lashes a cable at the nearest user.', '+3 damage, longer.', 'Lashes both ways. Faster.', '+3 damage, longer.', 'Faster, wider.', '+4 damage, faster.', '+3 damage, faster, longer.', 'Crossover cable: +7 damage, much longer.'],
  },
  delegate: {
    name: 'Delegate', icon: 'delegate', behavior: 'minion', sprite: 'helper', tags: ['people'], weight: 9, color: '#3b5dc9',
    desc: 'Interns follow you and tackle users near you.',
    flavor: '"Great learning opportunity." They are not paid.',
    levels: [
      { count: 1, damage: 6, speed: 110, leash: 130, hitInterval: 0.5, knockback: 40 },
      { count: 1, damage: 9, speed: 115, leash: 135, hitInterval: 0.5, knockback: 40 },
      { count: 2, damage: 9, speed: 120, leash: 140, hitInterval: 0.45, knockback: 50 },
      { count: 2, damage: 12, speed: 125, leash: 145, hitInterval: 0.45, knockback: 50 },
      { count: 2, damage: 14, speed: 130, leash: 150, hitInterval: 0.4, knockback: 60 },
      { count: 3, damage: 14, speed: 135, leash: 155, hitInterval: 0.4, knockback: 60 },
      { count: 3, damage: 17, speed: 140, leash: 160, hitInterval: 0.35, knockback: 70 },
      { count: 3, damage: 20, speed: 150, leash: 170, hitInterval: 0.3, knockback: 80 },
    ],
    notes: ['An intern follows you and fights.', '+3 damage.', 'A second intern.', '+3 damage.', '+2 damage, faster attacks.', 'A third intern.', '+3 damage, faster attacks.', 'Return offer: +3 damage, faster.'],
  },
  coffeeRun: {
    name: 'Coffee Run', icon: 'mug', behavior: 'trail', tags: ['coffee'], weight: 9, color: '#5d3a1a',
    desc: 'You spill hot coffee behind you. Users who walk through it get burned.',
    flavor: 'Four lattes, one oat, one decaf, one "surprise me". You were surprised.',
    levels: [
      { damage: 4, tick: 0.5, radius: 15, life: 3, gap: 0.6 },
      { damage: 6, tick: 0.5, radius: 15, life: 3, gap: 0.6 },
      { damage: 6, tick: 0.45, radius: 17, life: 3.5, gap: 0.55 },
      { damage: 8, tick: 0.45, radius: 17, life: 3.5, gap: 0.5 },
      { damage: 8, tick: 0.4, radius: 19, life: 4, gap: 0.5 },
      { damage: 10, tick: 0.4, radius: 20, life: 4, gap: 0.45 },
      { damage: 12, tick: 0.35, radius: 21, life: 4.5, gap: 0.45 },
      { damage: 15, tick: 0.35, radius: 24, life: 5, gap: 0.4 },
    ],
    notes: ['Leaves burning coffee behind you.', '+2 damage.', 'Bigger, longer-lasting puddles.', '+2 damage, more puddles.', 'Bigger puddles, faster burns.', '+2 damage.', '+2 damage, longer-lasting.', 'Venti: +3 damage, huge puddles.'],
  },
  autoScaling: {
    name: 'Auto-Scaling', icon: 'cloud', behavior: 'projectile', sprite: 'proj_cloud', tags: ['cloud'], weight: 9, color: '#73eff7',
    desc: 'Fires cloud instances at users. The bigger the crowd around you, the more it fires.',
    flavor: 'Scales up instantly. Scales down never. Finance has questions.',
    levels: [
      { damage: 7, cooldown: 1.3, count: 1, speed: 260, pierce: 0, life: 1.4, knockback: 30, scaleRadius: 120, scalePer: 8, maxCount: 3 },
      { damage: 9, cooldown: 1.3, count: 1, speed: 260, pierce: 0, life: 1.4, knockback: 30, scaleRadius: 120, scalePer: 8, maxCount: 3 },
      { damage: 9, cooldown: 1.2, count: 1, speed: 270, pierce: 0, life: 1.5, knockback: 30, scaleRadius: 130, scalePer: 7, maxCount: 4 },
      { damage: 11, cooldown: 1.2, count: 2, speed: 270, pierce: 0, life: 1.5, knockback: 35, scaleRadius: 130, scalePer: 7, maxCount: 4 },
      { damage: 11, cooldown: 1.1, count: 2, speed: 280, pierce: 1, life: 1.5, knockback: 35, scaleRadius: 140, scalePer: 6, maxCount: 5 },
      { damage: 14, cooldown: 1.0, count: 2, speed: 290, pierce: 1, life: 1.6, knockback: 40, scaleRadius: 140, scalePer: 6, maxCount: 6 },
      { damage: 16, cooldown: 1.0, count: 2, speed: 300, pierce: 1, life: 1.6, knockback: 40, scaleRadius: 150, scalePer: 5, maxCount: 6 },
      { damage: 20, cooldown: 0.9, count: 3, speed: 320, pierce: 2, life: 1.7, knockback: 45, scaleRadius: 160, scalePer: 5, maxCount: 8 },
    ],
    notes: ['Fires more shots the bigger the crowd.', '+2 damage.', 'Scales up sooner, up to 4 shots.', '+2 damage, 2 shots minimum.', 'Shots pierce. Up to 5.', '+3 damage, up to 6.', '+2 damage, scales up even sooner.', 'Multi-region: +4 damage, up to 8 shots.'],
  },
  outOfOffice: {
    name: 'Out-of-Office Reply', icon: 'ooo', behavior: 'shield', tags: ['email'], weight: 8, color: '#73eff7',
    desc: 'Every few seconds a bubble shoves users away and blocks boss bullets.',
    flavor: '"I am currently out of the office with limited access to email." You are at your desk.',
    levels: [
      { cooldown: 8, duration: 1.5, radius: 34, damage: 8, knockback: 260 },
      { cooldown: 7.5, duration: 1.6, radius: 35, damage: 10, knockback: 270 },
      { cooldown: 7, duration: 1.8, radius: 37, damage: 12, knockback: 280 },
      { cooldown: 6.5, duration: 2.0, radius: 38, damage: 14, knockback: 290 },
      { cooldown: 6, duration: 2.2, radius: 40, damage: 16, knockback: 300 },
      { cooldown: 5.5, duration: 2.4, radius: 42, damage: 19, knockback: 310 },
      { cooldown: 5, duration: 2.6, radius: 44, damage: 22, knockback: 320 },
      { cooldown: 4.5, duration: 3.0, radius: 48, damage: 26, knockback: 340 },
    ],
    notes: ['A bubble shoves users away and blocks bullets.', 'More often, +2 damage.', 'Lasts longer, bigger.', 'More often, +2 damage.', 'Lasts longer, bigger.', 'More often, +3 damage.', 'Lasts longer, +3 damage.', 'Sabbatical: much longer, much bigger.'],
  },
  pingSweep: {
    name: 'Ping Sweep', icon: 'radar', behavior: 'sweep', tags: ['network'], weight: 9, color: '#38b764',
    desc: 'A radar beam circles you and hits every user it passes.',
    flavor: '64 bytes from user: icmp_seq=1 ttl=64 time=too long.',
    levels: [
      { damage: 6, range: 80, rotSpeed: 2.4, width: 0.5, hitInterval: 1.2 },
      { damage: 8, range: 82, rotSpeed: 2.5, width: 0.5, hitInterval: 1.2 },
      { damage: 8, range: 88, rotSpeed: 2.7, width: 0.55, hitInterval: 1.1 },
      { damage: 10, range: 92, rotSpeed: 2.8, width: 0.55, hitInterval: 1.1 },
      { damage: 10, range: 98, rotSpeed: 3.0, width: 0.6, hitInterval: 1.0 },
      { damage: 13, range: 104, rotSpeed: 3.1, width: 0.6, hitInterval: 1.0 },
      { damage: 15, range: 110, rotSpeed: 3.3, width: 0.65, hitInterval: 0.9 },
      { damage: 19, range: 120, rotSpeed: 3.6, width: 0.7, hitInterval: 0.8 },
    ],
    notes: ['A radar beam circles you.', '+2 damage.', 'Longer, faster beam.', '+2 damage.', 'Longer, faster beam.', '+3 damage.', '+2 damage, faster.', 'Full subnet scan: +4 damage, longer, faster.'],
  },

  // --- Evolutions (see data/evolutions.js). One level each; never offered on cards. ---
  fleetReboot: {
    name: 'Fleet-Wide Reboot', icon: 'power', behavior: 'pulse', evolved: true, from: 'reboot',
    tags: ['restart'], color: '#ffcd75', ringColors: ['#ffcd75', '#f4f4f4'], ringWidth: 5,
    desc: 'Every machine on the floor restarts at once. Huge, fast, stunning shockwaves.',
    flavor: 'Scheduled for 2 PM on a Tuesday. In the middle of the all-hands.',
    levels: [{ damage: 36, cooldown: 1.2, radius: 140, knockback: 260, speed: 460, stun: 0.3 }],
    notes: ['Evolved.'],
  },
  scheduledTasks: {
    name: 'Scheduled Task Army', icon: 'terminal', behavior: 'turret', sprite: 'turret_evo', boltSprite: 'proj_bolt_evo',
    evolved: true, from: 'powershell', tags: ['script'], color: '#38b764',
    desc: 'A swarm of green turrets, each firing three-way bursts.',
    flavor: 'Runs every minute. Nobody remembers who created it. Nobody dares delete it.',
    levels: [{ cooldown: 1.2, max: 8, duration: 9, fireRate: 0.28, damage: 20, range: 230, boltSpeed: 360, spread: 3 }],
    notes: ['Evolved.'],
  },
  zeroTrust: {
    name: 'Zero Trust Perimeter', icon: 'firewall', behavior: 'orbit', sprite: 'proj_firewall', evolved: true, from: 'firewall',
    tags: ['policy', 'security'], color: '#b13e53', rings: 2,
    desc: 'Two counter-rotating walls that never go down.',
    flavor: 'Never trust, always verify. Especially Randy.',
    levels: [{ damage: 30, count: 10, radius: 72, rotSpeed: 4.0, duration: Infinity, cooldown: 0, hitInterval: 0.3, knockback: 220 }],
    notes: ['Evolved.'],
  },
  autoTriage: {
    name: 'Automated Triage', icon: 'ticket', behavior: 'projectile', sprite: 'proj_ticket_gold', evolved: true, from: 'autoClose',
    tags: ['ticket'], color: '#ffcd75',
    desc: 'Golden tickets that pick separate targets, home in, and pierce.',
    flavor: 'The AI routes every ticket to the right queue. The right queue is yours.',
    levels: [{ damage: 32, cooldown: 0.6, count: 6, speed: 340, pierce: 4, life: 2.2, knockback: 60, homing: true, turn: 9 }],
    notes: ['Evolved.'],
  },
  fiberBackbone: {
    name: 'Fiber Backbone', icon: 'cable', behavior: 'whip', evolved: true, from: 'patchCable', tags: ['network'], color: '#73eff7',
    desc: 'A fiber line whirls all the way around you, hitting everything in reach.',
    flavor: 'Ten gigabits of pure spite.',
    levels: [{ damage: 32, cooldown: 0.85, range: 130, width: 30, sides: 2, knockback: 170, full: true }],
    notes: ['Evolved.'],
  },
  outsourcedTeam: {
    name: 'Outsourced Team', icon: 'delegate', behavior: 'minion', sprite: 'helper_evo', evolved: true, from: 'delegate', tags: ['people'], color: '#ef7d57',
    desc: 'Five contractors in orange polos who close users fast.',
    flavor: 'Follow-the-sun support. The sun is never where you need it.',
    levels: [{ count: 5, damage: 20, speed: 165, leash: 190, hitInterval: 0.28, knockback: 90 }],
    notes: ['Evolved.'],
  },
  espresso: {
    name: 'Espresso Machine', icon: 'mug', behavior: 'trail', evolved: true, from: 'coffeeRun', tags: ['coffee'], color: '#3d2410',
    desc: 'Huge, scalding espresso spills that also slow users to a crawl.',
    flavor: 'Somebody expensed a commercial machine. Nobody knows how to clean it.',
    levels: [{ damage: 16, tick: 0.35, radius: 32, life: 5.5, gap: 0.35, slow: 0.45 }],
    notes: ['Evolved.'],
  },
};
