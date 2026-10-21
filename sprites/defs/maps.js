// Floor tiles and props for the unlockable maps in data/maps.js (Server Room, Call
// Center, Parking Garage, Merger Day). Same character-grid format and helpers as office.js.

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grid(w, h, fill = '.') {
  const g = Array.from({ length: h }, () => Array(w).fill(fill));
  const api = {
    px(x, y, c) {
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
      return api;
    },
    rect(x, y, rw, rh, c) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) api.px(i, j, c);
      return api;
    },
    box(x, y, rw, rh, fill, line = 'k') {
      api.rect(x, y, rw, rh, line);
      return api.rect(x + 1, y + 1, rw - 2, rh - 2, fill);
    },
    rows: () => g.map((r) => r.join('')),
  };
  return api;
}

// --- Server Room ---------------------------------------------------------------------

// Raised-floor panel; `perforated` is the vented tile that sits in front of the racks.
function raisedFloor(perforated) {
  const g = grid(32, 32, 'G');
  g.rect(0, 0, 32, 1, 'g').rect(0, 0, 1, 32, 'g'); // bevel highlight
  g.rect(31, 0, 1, 32, 'R').rect(0, 31, 32, 1, 'R'); // seams
  if (perforated) for (let y = 4; y < 28; y += 3) for (let x = 4; x < 28; x += 3) g.px(x, y, 'R');
  else g.px(3, 3, 'R').px(28, 3, 'R').px(3, 28, 'R').px(28, 28, 'R'); // panel screws
  return g.rows();
}

// One 32px-wide rack seen from the front: units with blinking-light rows.
function serverRack(seed) {
  const r = rng(seed);
  const g = grid(32, 56);
  g.box(0, 0, 32, 56, 'K');
  g.rect(2, 2, 28, 1, 'm');
  for (let y = 4; y < 52; y += 4) {
    const blank = r() < 0.15;
    g.rect(3, y, 26, 3, blank ? 'k' : 'c').rect(3, y + 3, 26, 1, 'k');
    if (blank) continue;
    for (let x = 5; x < 14; x += 2) if (r() < 0.6) g.px(x, y + 1, r() < 0.7 ? 'e' : r() < 0.5 ? 'q' : 'y');
    g.rect(18, y + 1, 9, 1, 'm');
  }
  g.rect(2, 53, 28, 2, 'm');
  return g.rows();
}

// Computer-room air conditioner: big white unit with vent slats.
function crac() {
  const g = grid(40, 48);
  g.box(0, 0, 40, 48, 'w').rect(1, 46, 38, 1, 'g');
  for (let y = 6; y < 30; y += 3) g.rect(4, y, 32, 1, 'g');
  g.box(4, 34, 14, 8, 'k').rect(6, 36, 5, 1, 'q').rect(6, 38, 9, 1, 'e'); // control panel
  g.box(24, 34, 12, 8, 'g');
  return g.rows();
}

// --- Call Center ---------------------------------------------------------------------

function callCarpet(seed, dark) {
  const r = rng(seed);
  const g = grid(32, 32, 'n');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = r();
    if (v < (dark ? 0.22 : 0.1)) g.px(x, y, 'k');
    else if (v < (dark ? 0.24 : 0.13)) g.px(x, y, 'b');
  }
  g.rect(31, 0, 1, 32, 'k').rect(0, 31, 32, 1, 'k');
  return g.rows();
}

// Headset pod: a small desk with a monitor and a headset, seen from the front.
function podDesk() {
  const g = grid(30, 26);
  g.box(0, 6, 30, 14, 'D').rect(1, 19, 28, 6, 'E').rect(0, 19, 1, 6, 'k').rect(29, 19, 1, 6, 'k').rect(0, 25, 30, 1, 'k');
  g.box(9, 0, 12, 9, 'n').rect(11, 2, 6, 1, 'B').rect(11, 4, 4, 1, 'e').rect(11, 6, 7, 1, 'B'); // softphone queue
  g.rect(14, 9, 2, 2, 'G');
  g.box(8, 12, 14, 4, 'g'); // keyboard
  g.rect(23, 9, 5, 1, 'k').rect(23, 10, 1, 4, 'k').rect(27, 10, 1, 4, 'k').box(22, 13, 3, 3, 'G').box(26, 13, 3, 3, 'G'); // headset
  return g.rows();
}

// Low blue divider between pods.
function podDivider(len) {
  const g = grid(len, 10);
  g.rect(0, 0, len, 2, 'k').rect(1, 1, len - 2, 1, 'g');
  g.box(0, 2, len, 8, 'b');
  for (let x = 3; x < len - 3; x += 4) g.px(x, 5, 'n').px(x + 2, 7, 'n');
  return g.rows();
}

// Wall-mounted queue board: calls waiting (red) and agents available (green).
function wallboard() {
  const g = grid(64, 22);
  g.box(0, 0, 64, 22, 'k', 'G').rect(1, 1, 62, 20, 'k');
  // "CALLS 847" in tiny blocks, then a red bar, then "AVAIL 0".
  for (const [x, c] of [[4, 'q'], [8, 'q'], [12, 'q'], [16, 'q']]) g.rect(x, 4, 3, 5, c);
  for (const x of [26, 31, 36]) g.rect(x, 3, 4, 7, 'r');
  g.rect(4, 13, 56, 2, 'r').rect(4, 13, 6, 2, 'e');
  for (const x of [4, 8, 12, 16]) g.rect(x, 17, 3, 2, 'q');
  g.rect(26, 16, 4, 4, 'e');
  return g.rows();
}

// --- Parking Garage ------------------------------------------------------------------

function concrete(seed, variant) {
  const r = rng(seed);
  const g = grid(32, 32, 'x');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = r();
    if (v < 0.06) g.px(x, y, 'X');
    else if (v < 0.1) g.px(x, y, 'c');
  }
  if (variant === 'crack') {
    let x = 6;
    for (let y = 4; y < 28; y++) {
      g.px(x, y, 'k');
      if (r() < 0.4) x += r() < 0.5 ? 1 : -1;
    }
  }
  if (variant === 'oil') {
    for (let y = 9; y < 24; y++) for (let x = 8; x < 26; x++) {
      const d = Math.hypot((x - 17) / 9, (y - 16) / 7);
      if (d < 1 && r() < 1.2 - d) g.px(x, y, d < 0.5 ? 'k' : 'c');
    }
  }
  return g.rows();
}

// Top-down car, nose up.
function car(body, trim) {
  const g = grid(30, 52);
  g.box(1, 2, 28, 48, body);
  g.rect(0, 8, 1, 6, 'k').rect(29, 8, 1, 6, 'k').rect(0, 38, 1, 6, 'k').rect(29, 38, 1, 6, 'k'); // tires
  g.box(4, 12, 22, 8, 'B').rect(6, 13, 8, 1, 'w'); // windshield
  g.box(5, 21, 20, 14, trim); // roof
  g.box(5, 36, 20, 6, 'B'); // rear window
  g.rect(3, 2, 5, 2, 'y').rect(22, 2, 5, 2, 'y'); // headlights
  g.rect(3, 48, 5, 2, 'r').rect(22, 48, 5, 2, 'r'); // tail lights
  return g.rows();
}

// Square concrete pillar with hazard striping at the base.
function pillar() {
  const g = grid(24, 40);
  g.box(0, 0, 24, 40, 'X').rect(1, 1, 22, 1, 'g').rect(22, 1, 1, 38, 'x');
  for (let x = 1; x < 23; x++) for (let y = 30; y < 39; y++) g.px(x, y, ((x + y) >> 2) & 1 ? 'y' : 'k');
  g.box(5, 8, 14, 10, 'w').rect(7, 10, 3, 6, 'b').rect(10, 10, 6, 2, 'b'); // "P2" sign
  return g.rows();
}

// --- Merger Day ----------------------------------------------------------------------

// The parent company's polished navy floor: big glossy tiles with a diagonal sheen and
// gold seams.
function corpTile(seed, logo) {
  const r = rng(seed);
  const g = grid(32, 32, 'a');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (((x + y) % 16 === 3 || (x + y) % 16 === 4) && x + y < 28) g.px(x, y, 'A');
    else if (r() < 0.02) g.px(x, y, 'A');
  }
  g.rect(31, 0, 1, 32, 'd').rect(0, 31, 32, 1, 'd');
  if (logo) {
    // Inlaid logo: two interlocking rings (the merged companies).
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      g.px(Math.round(12 + Math.cos(t) * 6), Math.round(15 + Math.sin(t) * 6), 'w');
      g.px(Math.round(19 + Math.cos(t) * 6), Math.round(15 + Math.sin(t) * 6), 'y');
    }
  }
  return g.rows();
}

// A cardboard moving box, taped, with a label. `stack` piles three of them.
function movingBox(stack) {
  const g = grid(stack ? 34 : 18, stack ? 34 : 16);
  const one = (x, y) => {
    g.box(x, y, 18, 16, 'd').rect(x + 1, y + 1, 16, 1, 'y'); // lid edge catches the light
    g.rect(x + 8, y + 1, 2, 14, 'h'); // packing tape
    g.box(x + 2, y + 7, 5, 4, 'w').rect(x + 3, y + 8, 3, 1, 'k'); // "MISC" label
  };
  if (stack) {
    one(0, 18);
    one(16, 18);
    one(8, 3);
  } else one(0, 0);
  return g.rows();
}

// Tiny 3x5 block letters for signs.
const FONT = {
  S: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
  Y: ['x.x', 'x.x', '.x.', '.x.', '.x.'],
  N: ['xx.', 'x.x', 'x.x', 'x.x', 'x.x'],
  E: ['xxx', 'x..', 'xx.', 'x..', 'xxx'],
  R: ['xx.', 'x.x', 'xx.', 'x.x', 'x.x'],
  G: ['xxx', 'x..', 'x.x', 'x.x', 'xxx'],
  '!': ['.x.', '.x.', '.x.', '...', '.x.'],
};
function text(g, x, y, str, c) {
  for (const ch of str) {
    FONT[ch].forEach((row, j) => [...row].forEach((v, i) => v === 'x' && g.px(x + i, y + j, c)));
    x += 4;
  }
}

// Hanging "SYNERGY!" banner with the new logo.
function synergyBanner() {
  const g = grid(52, 14);
  g.box(0, 0, 52, 14, 'a').rect(1, 1, 50, 1, 'y');
  for (let x = 2; x < 50; x += 6) g.px(x, 12, 'y');
  text(g, 10, 5, 'SYNERGY!', 'w');
  g.rect(3, 4, 4, 4, 'y').px(4, 5, 'a');
  return g.rows();
}

// Hot desk: a long white bench with laptops (nobody has an assigned seat any more).
function benchDesk() {
  const g = grid(70, 24);
  g.box(0, 4, 70, 12, 'w').rect(1, 15, 68, 6, 'g').rect(0, 15, 1, 6, 'k').rect(69, 15, 1, 6, 'k').rect(0, 21, 70, 1, 'k');
  for (let x = 6; x < 64; x += 20) g.box(x, 0, 12, 8, 'G').rect(x + 2, 2, 8, 4, 'B').box(x - 1, 8, 14, 3, 'g');
  return g.rows();
}

// A navy bean bag (the acquirer calls this "collaboration seating").
function beanBag() {
  const g = grid(22, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) {
    const d = Math.hypot((x - 10.5) / 10.5, (y - 9) / 7);
    if (d < 1) g.px(x, y, d > 0.85 ? 'k' : y < 6 && x < 12 ? 'A' : 'a');
  }
  g.rect(8, 7, 6, 1, 'k');
  return g.rows();
}

const single = (frame, size) => ({ size, anims: { idle: [frame] }, hitFlash: false });

export default {
  sheet: 'maps',
  sprites: {
    raised_a: single(raisedFloor(false), [32, 32]),
    raised_vent: single(raisedFloor(true), [32, 32]),
    rack_a: single(serverRack(5), [32, 56]),
    rack_b: single(serverRack(17), [32, 56]),
    rack_c: single(serverRack(29), [32, 56]),
    crac: single(crac(), [40, 48]),
    call_carpet_a: single(callCarpet(41, false), [32, 32]),
    call_carpet_b: single(callCarpet(53, true), [32, 32]),
    pod_desk: single(podDesk(), [30, 26]),
    pod_divider: single(podDivider(34), [34, 10]),
    wallboard: single(wallboard(), [64, 22]),
    concrete_a: single(concrete(61), [32, 32]),
    concrete_crack: single(concrete(73, 'crack'), [32, 32]),
    concrete_oil: single(concrete(89, 'oil'), [32, 32]),
    car_red: single(car('r', 'k'), [30, 52]),
    car_blue: single(car('b', 'n'), [30, 52]),
    car_white: single(car('w', 'g'), [30, 52]),
    car_green: single(car('e', 'h'), [30, 52]),
    pillar: single(pillar(), [24, 40]),
    corp_a: single(corpTile(97), [32, 32]),
    corp_b: single(corpTile(101), [32, 32]),
    corp_logo: single(corpTile(103, true), [32, 32]),
    box_stack: single(movingBox(true), [34, 34]),
    box_single: single(movingBox(false), [18, 16]),
    synergy_banner: single(synergyBanner(), [52, 14]),
    bench_desk: single(benchDesk(), [70, 24]),
    bean_bag: single(beanBag(), [22, 16]),
  },
};
