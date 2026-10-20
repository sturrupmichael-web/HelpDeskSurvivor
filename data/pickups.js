// Closed Tickets (XP gems). A dropped ticket uses the highest tier its value reaches.
export const TICKET_TIERS = [
  { sprite: 'ticket_blue', minValue: 1 },
  { sprite: 'ticket_green', minValue: 5 },
  { sprite: 'ticket_gold', minValue: 25 },
];

export const TICKETS = {
  maxOnFloor: 1200, // when full, the farthest ticket is moved to the new drop and takes its XP
  magnetSpeed: 60, // starting speed when a ticket flies toward you
  magnetAccel: 700, // px/s^2 while flying
  collectRadius: 10,
};

// Other floor pickups. `chance` is per enemy closed (bosses/elites use `drops` in
// data/enemies.js instead). Touch them to collect.
export const ITEMS = {
  pizza: { sprite: 'pizza', chance: 0.004, heal: 30, label: '+30 SANITY' },
  bulk_close: { sprite: 'bulk_close', chance: 0.0012, label: 'BULK CLOSE!' },
  pto: { sprite: 'pto', chance: 0.0006, invulnerable: 6, label: 'OUT OF OFFICE' },
  chest: { sprite: 'chest', chance: 0, label: 'CHANGE APPROVED' },
};

// Change Approved chest without an evolution available: how many upgrades it grants.
export const CHEST_REWARDS = [
  { upgrades: 1, weight: 75 },
  { upgrades: 3, weight: 25 },
];

export const ITEM_PICKUP_RADIUS = 14; // touch distance for non-ticket pickups
export const MAX_ITEMS = 40;
