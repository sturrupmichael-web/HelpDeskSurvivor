// Character sprites: playable techs and end-users.
//
// Format: every frame is an array of strings; each character is a palette key from
// data/palette.js and '.' is transparent. All rows of a grid must be the same width.
// Grids can be smaller than the sprite `size`: build.js centers them horizontally and
// aligns them to the bottom edge (feet on the floor). Hit-flash frames are generated
// automatically, so only the normal frames are drawn here.

// Builds a 4-frame walk cycle (neutral, left step, neutral, right step) from a shared
// upper body and three leg variants.
function walk(top, legs) {
  return [legs.a, legs.b, legs.a, legs.d].map((l) => [...top, ...l]);
}

// Swaps palette keys in a set of frames (e.g. to make character variants).
export function recolor(frames, map) {
  return frames.map((g) => g.map((row) => row.replace(/./g, (ch) => map[ch] ?? ch)));
}

// --- Tier 1 Tech (default player) -------------------------------------------------
// Blue polo, lanyard with badge, headset with boom mic.
const TECH_TOP = [
  '......kkkkkkkk......',
  '.....khhhhhhhhk.....',
  '....khhhhhhhhhhk....',
  '...kGhhhhhhhhhhGk...',
  '...kGhsssssssshGk...',
  '..kGGssssssssssGGk..',
  '..kGGssksssskssGGk..',
  '..kGGssksssskssGGk..',
  '..kGGssssssssssGGk..',
  '...kGkkssSSssssGk...',
  '....kssssssssssk....',
  '......kkssssskk.....',
  '...kkkbbwwwwbbkkk...',
  '..kbbbbbyBBybbbbbk..',
  '..kbbbbbbyybbbbbbk..',
  '..kbbbbbbwwbbbbbbk..',
  '..kbbbbbbwwbbbbbbk..',
  '..kbbbbbbbbbbbbbbk..',
  '..ksbbbbbbbbbbbbsk..',
  '...knnnnnnnnnnnnk...',
  '...knnnnnnnnnnnnk...',
  '...knnnnnkknnnnnk...',
];
const TECH_LEGS = {
  a: [
    '...knnnnk..knnnnk...',
    '...knnnnk..knnnnk...',
    '...knnnnk..knnnnk...',
    '...knnnnk..knnnnk...',
    '...kkkkkk..kkkkkk...',
    '...kkkkkk..kkkkkk...',
  ],
  b: [
    '...knnnnk..knnnnk...',
    '...knnnnk..knnnnk...',
    '...kkkkkk..knnnnk...',
    '...kkkkkk..knnnnk...',
    '...........kkkkkk...',
    '...........kkkkkk...',
  ],
  d: [
    '...knnnnk..knnnnk...',
    '...knnnnk..knnnnk...',
    '...knnnnk..kkkkkk...',
    '...knnnnk..kkkkkk...',
    '...kkkkkk...........',
    '...kkkkkk...........',
  ],
};

// --- Password Reset Pam -------------------------------------------------------------
// Purple cardigan, bob haircut, waving a yellow sticky note (her password, probably).
const PAM_TOP = [
  '...............kkkkk',
  '.....kkkkkkkk..kyyyk',
  '....khhhhhhhhk.kykyk',
  '...khhhhhhhhhhkkyyyk',
  '...khhhhhhhhhhkkkkkk',
  '..khhsssssssshhk.ks.',
  '..khsskssssksshk.ks.',
  '..khsskssssksshk.ks.',
  '..khsssssssssshk.ks.',
  '..khssssrrsssshk.ks.',
  '..khhsssssssshhk.ks.',
  '....kkksssskkkk.kpk.',
  '..kkpppwwwwpppkkkpk.',
  '.kpppppwwpppppppppk.',
  '.kppppppwwpppppppk..',
  '.kppppppwwpppppk....',
  '.kspppppwwpppppk....',
  '.kspppppppppppk.....',
  '..kGGGGGGGGGGGk.....',
  '..kGGGGGGGGGGGk.....',
  '.kGGGGGGGGGGGGGk....',
  '.kkkkkkkkkkkkkkk....',
];
const PAM_LEGS = {
  a: [
    '....ksk...ksk.......',
    '....ksk...ksk.......',
    '....ksk...ksk.......',
    '....ksk...ksk.......',
    '...kkkk..kkkk.......',
    '...kkkk..kkkk.......',
  ],
  b: [
    '....ksk...ksk.......',
    '....ksk...ksk.......',
    '...kkkk...ksk.......',
    '...kkkk...ksk.......',
    '.........kkkk.......',
    '.........kkkk.......',
  ],
  d: [
    '....ksk...ksk.......',
    '....ksk...ksk.......',
    '....ksk..kkkk.......',
    '....ksk..kkkk.......',
    '...kkkk.............',
    '...kkkk.............',
  ],
};

// --- Generic end-user body ------------------------------------------------------------
// Placeholder keys, filled per character: H hair, F skin, M mouth, T top, P pants.
// person() pads the 20x28 body into a 30x32 canvas (5 px each side, 4 px on top) so
// signature props can stick out past the silhouette.
const BODY_TOP = [
  '......kkkkkkkk......',
  '.....kHHHHHHHHk.....',
  '....kHHHHHHHHHHk....',
  '...kHHHHHHHHHHHHk...',
  '...kHFFFFFFFFFFHk...',
  '...kFFFFFFFFFFFFk...',
  '...kFFkFFFFFFkFFk...',
  '...kFFkFFFFFFkFFk...',
  '...kFFFFFFFFFFFFk...',
  '...kFFFFMMMMFFFFk...',
  '....kFFFFFFFFFFk....',
  '......kkFFFFkk......',
  '...kkkTTTTTTTTkkk...',
  '..kTTTTTTTTTTTTTTk..',
  '..kTTTTTTTTTTTTTTk..',
  '..kTTTTTTTTTTTTTTk..',
  '..kTTTTTTTTTTTTTTk..',
  '..kTTTTTTTTTTTTTTk..',
  '..kFTTTTTTTTTTTTFk..',
  '...kPPPPPPPPPPPPk...',
  '...kPPPPPPPPPPPPk...',
  '...kPPPPPkkPPPPPk...',
];
const BODY_LEGS = {
  a: ['...kPPPPk..kPPPPk...', '...kPPPPk..kPPPPk...', '...kPPPPk..kPPPPk...', '...kPPPPk..kPPPPk...', '...kkkkkk..kkkkkk...', '...kkkkkk..kkkkkk...'],
  b: ['...kPPPPk..kPPPPk...', '...kPPPPk..kPPPPk...', '...kkkkkk..kPPPPk...', '...kkkkkk..kPPPPk...', '...........kkkkkk...', '...........kkkkkk...'],
  d: ['...kPPPPk..kPPPPk...', '...kPPPPk..kPPPPk...', '...kPPPPk..kkkkkk...', '...kPPPPk..kkkkkk...', '...kkkkkk...........', '...kkkkkk...........'],
};
const PAD_X = 5;
const PAD_Y = 4;

// Builds a 4-frame walk cycle for an end-user, then lets `props` draw on every frame
// with px(x, y, color) / rect(x, y, w, h, color) in padded 30x32 coordinates.
function person(colors, props) {
  const map = { H: colors.hair, F: colors.skin ?? 's', M: colors.mouth ?? 'S', T: colors.top, P: colors.pants };
  return walk(BODY_TOP, BODY_LEGS).map((frame, fi) => {
    const g = Array.from({ length: 28 + PAD_Y }, () => Array(20 + PAD_X * 2).fill('.'));
    frame.forEach((row, y) => [...row].forEach((ch, x) => (g[y + PAD_Y][x + PAD_X] = map[ch] ?? ch)));
    const px = (x, y, c) => {
      if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
    };
    const rect = (x, y, w, h, c) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
    };
    if (props) props({ px, rect, frame: fi });
    return g.map((r) => r.join(''));
  });
}

// Draws a pixel pattern (rows of palette keys, '.' = skip) at (x, y).
const patch = (px, x, y, rows) => rows.forEach((r, j) => [...r].forEach((c, i) => c !== '.' && px(x + i, y + j, c)));

// "Quick Question" Quinn: green cardigan, blond, a speech bubble with a question mark.
const QUINN = person({ hair: 'y', top: 'e', pants: 'n' }, ({ px }) =>
  patch(px, 21, 0, ['.kkkkkk.', 'kwwkkwwk', 'kwkwwkwk', 'kwwwwkwk', 'kwwwkwwk', 'kwwwwwwk', 'kwwwkwwk', '.kkkkkk.', '..kk....', '.k......']),
);

// Reply-All Randy: white shirt, red tie, black hair, holding up an envelope.
const RANDY = person({ hair: 'k', top: 'w', pants: 'n', skin: 'S' }, ({ px, rect }) => {
  rect(14, 17, 2, 6, 'r'); // tie
  patch(px, 20, 16, ['kkkkkkkkk', 'kwkwwwkwk', 'kwwkwkwwk', 'kwwwkwwwk', 'kwwwwwwwk', 'kkkkkkkkk']);
});

// Phish Clicker: red hoodie, fishing rod with a hook dangling a little envelope.
const PHISH = person({ hair: 'h', top: 'r', pants: 'n' }, ({ px, rect, frame }) => {
  for (let i = 0; i < 8; i++) px(21 + i, 22 - i * 2, 'h'), px(21 + i, 21 - i * 2, 'h'); // rod
  const sway = frame % 2;
  rect(29 - sway, 8, 1, 9, 'g'); // line
  patch(px, 25 - sway, 17, ['kkkkk', 'kwkwk', 'kkkkk']); // bait envelope
});

// Printer Jammer: gray shirt, carrying an armful of crumpled printouts.
const JAMMER = person({ hair: 'h', top: 'G', pants: 'k' }, ({ px, rect }) => {
  rect(3, 15, 24, 11, 'k');
  rect(4, 16, 22, 9, 'w');
  for (let y = 17; y < 25; y += 2) rect(6, y, 17, 1, 'g');
  patch(px, 1, 13, ['kkkk', 'kwwk', '.kwk', '..kk']); // sheets sticking out
  patch(px, 25, 12, ['.kkk', 'kwwk', 'kwk.', 'kk..']);
  rect(11, 14, 8, 2, 'k');
  rect(12, 14, 6, 1, 'w');
});

// Shadow IT Steve: dark hoodie with the hood up, sunglasses, carrying his own router.
const STEVE = person({ hair: 'n', top: 'n', pants: 'k' }, ({ px, rect }) => {
  rect(10, 5, 10, 1, 'k'); // hood rim
  rect(9, 10, 12, 2, 'k'); // sunglasses
  patch(px, 20, 15, ['.k....k.', '.k....k.', '.k....k.', 'kkkkkkkk', 'kGeGBGGk', 'kkkkkkkk']); // router + antennas
});

// The VIP: navy suit, white collar, red tie, phone pressed to the ear.
const VIP = person({ hair: 'G', top: 'n', pants: 'n', skin: 'S' }, ({ px, rect }) => {
  patch(px, 12, 16, ['wwwwww', '.wrrw.', '..rr..', '..rr..', '..rr..', '..rr..', '...r..']); // collar + tie
  patch(px, 21, 8, ['kkk', 'kBk', 'kkk', 'kkk', 'kkk']); // phone
  rect(21, 13, 2, 2, 'S'); // hand
});

// Ticket-less Walk-Up: red hair, blue shirt, rushing in with a smoking laptop.
const WALKUP = person({ hair: 'r', top: 'B', pants: 'n', mouth: 'k' }, ({ px, rect, frame }) => {
  rect(8, 17, 14, 7, 'k');
  rect(9, 18, 12, 5, 'n');
  patch(px, 13, 19, ['r.r', '.r.', 'r.r']); // error
  rect(7, 24, 16, 2, 'g');
  rect(7, 26, 16, 1, 'k');
  const s = frame % 2;
  patch(px, 21 + s, 11, ['.g.', 'gwg', '.g.', '..g', '.g.']); // smoke
});

// --- Unlockable techs (same body as the end-users, with their own kit) -------------

// Desktop Support: green polo, khakis, lanyard, carrying a red toolbag.
const DESKTOP = person({ hair: 'k', top: 'e', pants: 'd', skin: 'S' }, ({ px, rect }) => {
  rect(14, 16, 2, 4, 'y'); // lanyard
  rect(14, 20, 2, 2, 'w'); // badge
  patch(px, 21, 17, ['.kkk.', 'kk.kk', 'kkkkk', 'krrrk', 'krwrk', 'kkkkk']); // toolbag
});

// SysAdmin: black tee with a terminal prompt, beard, mug of very old coffee.
const SYSADMIN = person({ hair: 'h', top: 'K', pants: 'n' }, ({ px, rect }) => {
  rect(10, 13, 10, 2, 'h'); // beard
  rect(11, 15, 8, 1, 'h');
  patch(px, 11, 18, ['e....', '.e...', 'e.eee']); // >_
  patch(px, 21, 16, ['kkkk..', 'kwwwkk', 'kwwwk.k', 'kwwwkk.', 'kkkk...'].map((r) => r.padEnd(7, '.'))); // mug
});

// SecOps Analyst: gray hoodie, gold shield badge, tablet with a green lock screen.
const SECOPS = person({ hair: 'r', top: 'G', pants: 'k' }, ({ px }) => {
  patch(px, 13, 17, ['kkkk', 'kyyk', 'kyyk', '.kk.']); // shield badge
  patch(px, 3, 17, ['kkkkk', 'kBBBk', 'kBeBk', 'kBBBk', 'kkkkk']); // tablet
});

// Network Engineer: light-blue shirt, a coil of yellow patch cable over the shoulder,
// and a crimping tool.
const NETENG = person({ hair: 'h', top: 'B', pants: 'k' }, ({ px, rect }) => {
  patch(px, 4, 14, ['.yyyy.', 'y....y', 'y.yy.y', 'y....y', '.yyyy.', '..y...']); // cable coil
  patch(px, 21, 17, ['kk...', 'kGk..', '.kGk.', '..kGk', '...kk']); // crimper
  rect(14, 16, 2, 2, 'y'); // RJ45 tip
});

// Help Desk Manager: white shirt, purple tie, grey hair, clipboard with the SLA report.
const MANAGER = person({ hair: 'G', top: 'w', pants: 'n' }, ({ px, rect }) => {
  patch(px, 14, 16, ['pp', 'pp', 'pp', 'pp', '.p']); // tie
  patch(px, 20, 15, ['.kkk.', 'kwwwk', 'kwrrk', 'kwwwk', 'kweek', 'kwwwk', 'kkkkk']); // clipboard
  rect(10, 8, 10, 1, 'g'); // reading glasses
});

// The Intern: orange hoodie, INTERN badge, carrying a tray of four coffees.
const INTERN = person({ hair: 'y', top: 'o', pants: 'n' }, ({ px, rect }) => {
  rect(14, 18, 3, 2, 'w'); // badge
  patch(px, 18, 16, ['.k.k.k.k.', 'kwkwkwkwk', 'khkhkhkhk', 'kkkkkkkkk', 'kdddddddk', 'kkkkkkkkk']); // coffee tray
});

// Cloud Architect: cyan tee with a cloud logo, laptop open on one arm.
const CLOUD = person({ hair: 'k', top: 'q', pants: 'k' }, ({ px }) => {
  patch(px, 12, 17, ['.ww.', 'wwww', '.ww.']); // cloud logo
  patch(px, 2, 16, ['kkkkkkk', 'kBBBBBk', 'kBwBBBk', 'kBBBBBk', 'kkkkkkk', 'kgggggk', 'kkkkkkk']); // laptop
});

// Delegate helpers (the Help Desk Manager's interns), 16x16: blue polo, yellow lanyard.
// The evolved Outsourced Team wears orange.
const HELPER = recolor(
  walk(
    [
      '..kkkkkk..',
      '.kyyyyyyk.',
      '.kssssssk.',
      '.kskssksk.',
      '.kssssssk.',
      '..kksskk..',
      '.kbbyybbk.',
      'kbbbyybbbk',
      'kbbbwwbbbk',
      'ksnnnnnnsk',
      '.knnnnnnk.',
    ],
    {
      a: ['.knnkknnk.', '.knk..knk.', '.kkk..kkk.'],
      b: ['.knnkknnk.', '.knk..kkk.', '.kkk......'],
      d: ['.knnkknnk.', '.kkk..knk.', '......kkk.'],
    },
  ),
  {},
);
const HELPER_EVO = recolor(HELPER, { b: 'o', y: 'k' });

// Small Reply-All Randy (spawned when a Randy is closed): 16x16.
const RANDY_SMALL_TOP = [
  '..kkkkkk..',
  '.kkkkkkkk.',
  '.kssssssk.',
  '.kskssksk.',
  '.kssssssk.',
  '..kksskk..',
  '.kwwrrwwk.',
  'kwwwrrwwwk',
  'kwwwrrwwwk',
  'ksnnnnnnsk',
  '.knnnnnnk.',
];
const RANDY_SMALL = walk(RANDY_SMALL_TOP, {
  a: ['.knnkknnk.', '.knk..knk.', '.kkk..kkk.'],
  b: ['.knnkknnk.', '.knk..kkk.', '.kkk......'],
  d: ['.knnkknnk.', '.kkk..knk.', '......kkk.'],
});

// Malware minion (spawned by the Phish Clicker): a little red bug, 16x16.
const MALWARE = [
  [
    '..k......k..',
    '...k....k...',
    '....kkkk....',
    '..kkrrrrkk..',
    '.krrwrrwrrk.',
    'kkrrrrrrrrkk',
    '.krrprrprrk.',
    'k.krrrrrrk.k',
    '...kkkkkk...',
  ],
  [
    '...k....k...',
    '...k....k...',
    '....kkkk....',
    '..kkrrrrkk..',
    '.krrwrrwrrk.',
    '.kkrrrrrrkk.',
    'kkrrprrprrkk',
    '.kkrrrrrrkk.',
    '...kkkkkk...',
  ],
];

// --- Merger Day users -----------------------------------------------------------------

// Synergy Consultants: grey suits, gold lanyards from the new parent company, a laptop
// showing a slide with an arrow going up. They come in pairs (the second has red hair).
const consultant = (hair) =>
  person({ hair, top: 'G', pants: 'G' }, ({ px, rect }) => {
    patch(px, 13, 16, ['wwww', '.aa.', '.aa.', '.aa.']); // shirt + navy tie
    rect(10, 16, 1, 6, 'y'); // lanyard
    patch(px, 1, 16, ['kkkkkkk', 'kwwwwwk', 'kwwwewk', 'kwweewk', 'kweewwk', 'kkkkkkk', 'kgggggk', 'kkkkkkk']); // slide deck
  });
const CONSULTANT = consultant('h');
const CONSULTANT_B = consultant('r');

// Duplicate Dave: two badges, two laptops' worth of stress. Dave (2) has the copy's
// orange shirt and a "2" tag.
const DAVE = person({ hair: 'h', top: 'b', pants: 'k', mouth: 'k' }, ({ px }) => {
  patch(px, 11, 17, ['ww..ww', 'wy..wa']); // one old badge, one new badge
});
const DAVE2 = person({ hair: 'h', top: 'o', pants: 'k', mouth: 'k' }, ({ px }) => {
  patch(px, 11, 17, ['ww..ww', 'wy..wa']);
  patch(px, 21, 1, ['kkkkk', 'kwwwk', 'kkkwk', 'kwwwk', 'kwkkk', 'kwwwk', 'kkkkk']); // (2)
});

// Badge Brenda: navy new-hire top, holding up a badge that blinks red at every door.
const BRENDA = person({ hair: 'y', top: 'A', pants: 'G' }, ({ px, frame }) => {
  patch(px, 21, 14, ['kkkkk', 'kwwwk', 'kw' + (frame % 2 ? 'r' : 'k') + 'wk', 'kwwwk', 'kkkkk', '..y..', '..y..']); // badge on a lanyard
});

// Unclaimed Moving Box: it doesn't walk, it waits. Smash it open for whatever is inside.
const MOVING_BOX = [
  [
    '..kkkkkkkkkkkkkkkkkkkk..',
    '..kyyyyyyyyhhyyyyyyyyk..',
    '..kddddddddhhddddddddk..',
    '..kddddddddhhddddddddk..',
    '..kddkkkkkkhhddddddddk..',
    '..kddkwwwwkhhddddddddk..',
    '..kddkwkkwkhhddddddddk..',
    '..kddkwwwwkhhddddddddk..',
    '..kddkkkkkkhhddddddddk..',
    '..kddddddddhhddddddddk..',
    '..kddddddddhhddhdhdddk..',
    '..kddddddddhhdddhddddk..',
    '..kddddddddhhddhdhdddk..',
    '..kddddddddhhddddddddk..',
    '..khhhhhhhhhhhhhhhhhhk..',
    '..kkkkkkkkkkkkkkkkkkkk..',
  ],
];

export default {
  sheet: 'characters',
  sprites: {
    player_tier1: { size: [32, 32], fps: 8, anims: { walk: walk(TECH_TOP, TECH_LEGS) } },
    player_desktop: { size: [32, 32], fps: 9, anims: { walk: DESKTOP } },
    player_sysadmin: { size: [32, 32], fps: 7, anims: { walk: SYSADMIN } },
    player_secops: { size: [32, 32], fps: 8, anims: { walk: SECOPS } },
    player_neteng: { size: [32, 32], fps: 8, anims: { walk: NETENG } },
    player_manager: { size: [32, 32], fps: 7, anims: { walk: MANAGER } },
    player_intern: { size: [32, 32], fps: 10, anims: { walk: INTERN } },
    player_cloud: { size: [32, 32], fps: 8, anims: { walk: CLOUD } },
    helper: { size: [16, 16], fps: 10, anims: { walk: HELPER }, hitFlash: false },
    helper_evo: { size: [16, 16], fps: 10, anims: { walk: HELPER_EVO }, hitFlash: false },
    pam: { size: [32, 32], fps: 6, anims: { walk: walk(PAM_TOP, PAM_LEGS) } },
    quinn: { size: [32, 32], fps: 10, anims: { walk: QUINN } },
    randy: { size: [32, 32], fps: 6, anims: { walk: RANDY } },
    randy_small: { size: [16, 16], fps: 8, anims: { walk: RANDY_SMALL } },
    phish: { size: [32, 32], fps: 5, anims: { walk: PHISH } },
    malware: { size: [16, 16], fps: 8, anims: { walk: MALWARE } },
    jammer: { size: [32, 32], fps: 4, anims: { walk: JAMMER } },
    steve: { size: [32, 32], fps: 6, anims: { walk: STEVE } },
    vip: { size: [32, 32], fps: 5, anims: { walk: VIP } },
    walkup: { size: [32, 32], fps: 10, anims: { walk: WALKUP } },
    consultant: { size: [32, 32], fps: 6, anims: { walk: CONSULTANT } },
    consultant_b: { size: [32, 32], fps: 6, anims: { walk: CONSULTANT_B } },
    dave: { size: [32, 32], fps: 7, anims: { walk: DAVE } },
    dave2: { size: [32, 32], fps: 9, anims: { walk: DAVE2 } },
    brenda: { size: [32, 32], fps: 8, anims: { walk: BRENDA } },
    moving_box: { size: [32, 32], fps: 1, anims: { walk: MOVING_BOX } },
  },
};
