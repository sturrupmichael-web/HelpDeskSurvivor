// Achievements. `check(r, meta)` returns true once earned; it is evaluated about once a
// second during a shift and again when a shift ends. `r` is the current run's tracker
// (see src/game/achievements.js), `meta` the save data (src/game/meta.js).

export const ACHIEVEMENTS = [
  { id: 'first_shift', name: 'Onboarding Complete', icon: 'ticket', desc: 'Finish your first shift, one way or another.', check: (r) => r.ended },
  { id: 'speedrun', name: 'Rage Quit', icon: 'power', desc: 'Burn out in under a minute.', check: (r) => r.ended && !r.won && r.time < 60 },
  { id: 'patch', name: 'Fully Patched', icon: 'disc', desc: 'Survive past Patch Tuesday (5:30).', check: (r) => r.time >= 330 },
  { id: 'tickets_1k', name: 'Queue Buster', icon: 'filter', desc: 'Close 1,000 tickets in one shift.', check: (r) => r.kills >= 1000 },
  { id: 'tickets_10k', name: 'Ticket Machine', icon: 'terminal', desc: 'Close 10,000 tickets in one shift.', check: (r) => r.kills >= 10000 },
  { id: 'streak', name: 'Customer Obsessed', icon: 'cert', desc: 'Reach the maximum CSAT streak multiplier.', check: (r) => r.maxMult >= 5 },
  { id: 'evolve', name: 'Digital Transformation', icon: 'key', desc: 'Evolve a tool.', check: (r) => r.evolutions >= 1 },
  { id: 'evolve_all', name: 'Fully Automated', icon: 'policy', desc: 'Evolve all four tools in one shift.', check: (r) => r.evolutions >= 4 },
  { id: 'incident', name: 'Incident Commander', icon: 'mfa', desc: 'Resolve the Major Incident.', check: (r) => r.incident },
  { id: 'win', name: 'Clocked Out', icon: 'firewall', desc: "Close The Executive's ticket.", check: (r) => r.won },
  { id: 'win_flawless', name: 'Zen Mode', icon: 'headphones', desc: 'Win a shift without ever dropping below half sanity.', check: (r) => r.won && r.minHpFrac >= 0.5 },
  { id: 'overtime', name: 'Unpaid Overtime', icon: 'coffee', desc: 'Still be on the clock at 21:00.', check: (r) => r.time >= 1260 },
  { id: 'pizza', name: 'Pizza Party', icon: 'pizza', desc: 'Eat 5 slices of vendor-lunch pizza in one shift.', check: (r) => r.pizzas >= 5 },
  { id: 'steve', name: 'Shadow IT Audit', icon: 'rdp', desc: 'Close 100 Shadow IT Steves in one shift.', check: (r) => (r.killsById.steve ?? 0) >= 100 },
  { id: 'union', name: 'Solidarity', icon: 'union', desc: 'Get rescued by your Union Rep.', check: (r) => r.revived },
  { id: 'hired_all', name: 'Full Headcount', icon: 'monitor', desc: 'Hire every character.', check: (r, m) => m.unlocked.length >= 4 },
  { id: 'shopper', name: 'Expense Report', icon: 'laptop', desc: 'Buy 15 shop upgrades.', check: (r, m) => Object.values(m.shop).reduce((a, b) => a + b, 0) >= 15 },
  { id: 'map_server', name: 'Cold Aisle Containment', icon: 'ssd', desc: 'Win a shift in the Server Room.', check: (r, m) => m.mapsWon?.includes('server') },
  { id: 'map_call', name: 'First Call Resolution', icon: 'headphones', desc: 'Win a shift in the Call Center.', check: (r, m) => m.mapsWon?.includes('callcenter') },
  { id: 'map_garage', name: 'Night Owl', icon: 'key', desc: 'Win the Night Shift in the Parking Garage.', check: (r, m) => m.mapsWon?.includes('garage') },
  { id: 'veteran', name: 'Employee of the Month', icon: 'chair', desc: 'Work 25 shifts.', check: (r, m) => m.shifts >= 25 },
];
