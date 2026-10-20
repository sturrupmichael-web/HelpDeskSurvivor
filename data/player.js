// Playable characters and the XP curve.
// Speeds are in world pixels per second (one world pixel = one sprite pixel).

// `cost` is the Overtime Pay needed to unlock (0 = available from the start).
// `bonus` adds to the stat multipliers passives use (see BALANCE.md, "Player power"),
// e.g. { damage: 0.1 } = +10% damage, { damageTaken: -0.1 } = 10% less damage taken.
export const CHARACTERS = {
  tier1: {
    name: 'Tier 1 Tech',
    sprite: 'player_tier1',
    starter: 'reboot', // weapon id from data/weapons.js
    maxHp: 100, // "Sanity"
    speed: 74,
    radius: 7, // collision radius
    pickupRadius: 36, // Closed Tickets inside this radius fly to you
    regen: 0, // sanity per second
    cost: 0,
    bonus: {},
    perk: 'No perks. No excuses.',
    blurb: 'Fresh headset, full sanity. Answers every call with a smile. For now.',
  },
  desktop: {
    name: 'Desktop Support',
    sprite: 'player_desktop',
    starter: 'kbArticle',
    maxHp: 90,
    speed: 84,
    radius: 7,
    pickupRadius: 46,
    regen: 0,
    cost: 300,
    bonus: {},
    perk: 'Fastest on the floor, bigger pickup radius, a little less sanity.',
    blurb: 'Has walked every floor of this building. Twice. Today.',
  },
  sysadmin: {
    name: 'SysAdmin',
    sprite: 'player_sysadmin',
    starter: 'powershell',
    maxHp: 120,
    speed: 66,
    radius: 7,
    pickupRadius: 36,
    regen: 0,
    cost: 700,
    bonus: { damage: 0.1, cooldown: -0.05 },
    perk: '+10% damage, 5% faster cooldowns, more sanity, slow walker.',
    blurb: 'Automated their job in 2019. Nobody noticed. Still here.',
  },
  secops: {
    name: 'SecOps Analyst',
    sprite: 'player_secops',
    starter: 'firewall',
    maxHp: 100,
    speed: 74,
    radius: 7,
    pickupRadius: 36,
    regen: 0.5,
    cost: 1200,
    bonus: { damageTaken: -0.1 },
    perk: 'Regenerates 0.5 sanity per second and takes 10% less damage.',
    blurb: 'Trusts no one. Especially that email from "the CEO".',
  },
  neteng: {
    name: 'Network Engineer',
    sprite: 'player_neteng',
    starter: 'patchCable',
    maxHp: 100,
    speed: 74,
    radius: 7,
    pickupRadius: 36,
    regen: 0,
    cost: 1500,
    bonus: { area: 0.15 },
    perk: '+15% area on every tool.',
    blurb: 'Knows where every cable goes. Will not tell you.',
  },
  manager: {
    name: 'Help Desk Manager',
    sprite: 'player_manager',
    starter: 'delegate',
    maxHp: 110,
    speed: 67,
    radius: 7,
    pickupRadius: 36,
    regen: 0,
    cost: 2000,
    summonBonus: 0.25,
    bonus: {},
    perk: 'Helpers and turrets do +25% damage. Walks 10% slower.',
    blurb: 'Has a meeting about the meeting. Their team does the actual work.',
  },
  intern: {
    name: 'The Intern',
    sprite: 'player_intern',
    starter: 'coffeeRun',
    maxHp: 70,
    speed: 78,
    radius: 7,
    pickupRadius: 36,
    regen: 0,
    cost: 200,
    bonus: { growth: 0.3 },
    perk: '+30% XP, but only 70 sanity. Hard mode.',
    blurb: 'First week. Already has admin rights somehow.',
  },
  cloud: {
    name: 'Cloud Architect',
    sprite: 'player_cloud',
    starter: 'autoScaling',
    maxHp: 90,
    speed: 74,
    radius: 7,
    pickupRadius: 36,
    regen: 0,
    cost: 3000,
    extraCount: 1,
    bonus: {},
    perk: '+1 projectile, shield or helper on every tool. 10% less sanity.',
    blurb: 'Moved the whole company to the cloud. The cloud is down.',
  },
};

// XP needed to go from level L to L+1 is: first + (L - 1) * step,
// where step comes from the first band whose `upTo` is >= L.
export const XP_CURVE = {
  first: 5,
  bands: [
    { upTo: 20, step: 14 },
    { upTo: 40, step: 30 },
    { upTo: Infinity, step: 70 },
  ],
};

