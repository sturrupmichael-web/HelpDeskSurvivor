// Pickup sprites (16x16). Closed Tickets are XP gems: one ticket stub with a
// checkmark, recolored per tier. 'T' is a placeholder replaced with the tier color.

const TICKET = [
  'kkkkkkkkkk',
  'kTTTTTTTTk',
  'kTTTTTTwTk',
  '.TwTTTwTT.',
  '.TTwTwTTT.',
  'kTTTwTTTTk',
  'kTTTTTTTTk',
  'kkkkkkkkkk',
];

const tint = (grid, c) => grid.map((row) => row.replaceAll('T', c));
const one = (frame) => ({ size: [16, 16], anims: { idle: [frame] }, hitFlash: false });

export default {
  sheet: 'pickups',
  sprites: {
    ticket_blue: { size: [16, 16], anims: { idle: [tint(TICKET, 'B')] }, hitFlash: false },
    ticket_green: { size: [16, 16], anims: { idle: [tint(TICKET, 'e')] }, hitFlash: false },
    ticket_gold: { size: [16, 16], anims: { idle: [tint(TICKET, 'y')] }, hitFlash: false },

    // Leftover Vendor-Lunch Pizza: heals sanity.
    pizza: one(['kkkkkkkkkkkk', 'kddddddddddk', 'kyyryyyyyryk', '.kyyyyryyyk.', '.kyryyyyyyk.', '..kyyyyryk..', '..kyyyyyyk..', '...kyryyk...', '....kyyk....', '.....kk.....']),
    // Bulk Close: the big CLOSED stamp. Pulls every ticket to you.
    bulk_close: one(['....kkkk....', '...khhhhk...', '...khhhhk...', '....kkkk....', '....khhk....', '....khhk....', '.kkkkkkkkkk.', '.krrrrrrrrk.', 'kkkkkkkkkkkk', 'krwrwrrwrwrk', 'kkkkkkkkkkkk']),
    // Change Approved: a taped-up box with a green check label. Upgrades or evolution.
    chest: one([
      '.kkkkkkkkkkkk.', 'kdddddyydddddk', 'kdddddyydddddk', 'kkkkkkyykkkkkk', 'kdwwwwdyyddddk',
      'kdwweedyyddddk', 'kdweewdyyddddk', 'kdwwwwdyyddddk', 'kddddddyyddddk', 'kkkkkkkkkkkkkk',
    ]),
    // PTO Request: a calendar page with a beach on it. Brief invulnerability.
    // Welcome Swag Bag (Merger Day): a navy tote with the new logo. Sanity and a speed boost.
    swag_bag: one(['...kkkkkk...', '..kk....kk..', '..k......k..', 'kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kaayyyyyaaak', 'kaawwaayyaak', 'kaawwaayyaak', 'kaayyyyyaaak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk']),
    // Fruit gummies (The 19th Hole's ace drops): a purple bag with a window of gummies.
    gummies: one(['.kkkkkkkkkk.', '.kwwwwwwwwk.', 'kkkkkkkkkkkk', 'kprrwyywoopk', 'kprrwyywoopk', 'kpeewrrwyypk', 'kpeewrrwyypk', 'kppppppppppk', 'kkkkkkkkkkkk']),
    pto: one(['kkkkkkkkkkkk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwwwyywwwwwk', 'kwwyyyywwwwk', 'kwwwyywwwwwk', 'kwwwwwwBBBBk', 'kBBBBBBBBBBk', 'kkkkkkkkkkkk']),
  },
};
