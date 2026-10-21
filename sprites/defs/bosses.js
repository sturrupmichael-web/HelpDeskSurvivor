// Boss sprites (64x64) and their minions. Bosses are built from filled shapes on a
// grid, then auto-outlined in black, so the result is the same palette-grid format as
// every hand-drawn sprite. Each boss has a 2-frame walk and a 2-frame attack.

function canvas(w = 64, h = 64) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const api = {
    px(x, y, c) {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
      return api;
    },
    rect(x, y, rw, rh, c) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) api.px(i, j, c);
      return api;
    },
    ellipse(cx, cy, rx, ry, c, clip = () => true) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && clip(x, y)) api.px(x, y, c);
      return api;
    },
    // Thick quadratic curve from (x0, y0) to (x1, y1) bending toward (cx, cy).
    curve(x0, y0, cx, cy, x1, y1, c, t = 2) {
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) + Math.hypot(cx - x0, cy - y0)) * 2;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x1;
        const y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y1;
        api.rect(Math.round(x - t / 2), Math.round(y - t / 2), t, t, c);
      }
      return api;
    },
    // Black outline around every filled shape (transparent pixels touching paint).
    outline() {
      const marks = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (g[y][x] !== '.') continue;
          const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== 'k');
          if (n) marks.push([x, y]);
        }
      for (const [x, y] of marks) g[y][x] = 'k';
      return api;
    },
    rows: () => g.map((r) => r.join('')),
  };
  return api;
}

// --- The Executive Who Needs It Fixed Before The Board Meeting ----------------------
// walk: frames 0/1 swing the legs. attack: 0 = pointing at you, 1 = phone raised.
function executive(step, pose) {
  const c = canvas();
  // Legs and shoes.
  const lift = step ? 3 : 0;
  c.rect(24, 50, 7, 10 - lift, 'n').rect(22, 60 - lift, 10, 3, 'K');
  c.rect(34, 50, 7, 10 - (step ? 0 : 3), 'n').rect(33, 60 - (step ? 0 : 3), 10, 3, 'K');
  // Suit jacket, shirt, tie, lapels.
  c.rect(17, 28, 31, 23, 'n').rect(19, 26, 27, 3, 'n');
  c.rect(29, 26, 7, 9, 'w');
  c.rect(31, 27, 3, 17, 'r').rect(30, 27, 5, 2, 'r');
  for (let i = 0; i < 8; i++) c.px(28 - Math.floor(i / 2), 27 + i, 'k').px(36 + Math.floor(i / 2), 27 + i, 'k');
  c.rect(19, 40, 6, 1, 'k').rect(40, 40, 6, 1, 'k'); // pockets
  // Left arm with briefcase.
  c.rect(12, 29, 6, 18, 'n').rect(12, 47, 6, 3, 's');
  c.rect(6, 50, 16, 10, 'h').rect(12, 48, 5, 2, 'k').rect(13, 54, 3, 2, 'y');
  // Right arm: down holding a phone, pointing, or phone raised.
  if (pose === 'point') {
    c.rect(47, 30, 13, 6, 'n').rect(59, 30, 4, 5, 's').rect(62, 31, 2, 2, 's');
  } else if (pose === 'phone') {
    c.rect(47, 14, 6, 17, 'n').rect(47, 9, 6, 5, 's').rect(46, 3, 7, 8, 'K').rect(48, 4, 3, 5, 'B');
  } else {
    c.rect(47, 29, 6, 18, 'n').rect(47, 47, 6, 3, 's').rect(48, 49, 4, 6, 'K').rect(49, 50, 2, 3, 'B');
  }
  // Neck and head.
  c.rect(29, 22, 7, 5, 's');
  c.ellipse(32, 14, 9, 10, 's');
  c.ellipse(32, 8, 10, 6, 'G', (x, y) => y <= 9).rect(22, 8, 2, 6, 'G').rect(41, 8, 2, 6, 'G');
  c.rect(27, 14, 2, 2, 'k').rect(36, 14, 2, 2, 'k'); // eyes
  c.px(26, 12, 'k').px(27, 12, 'k').px(28, 13, 'k').px(38, 12, 'k').px(37, 12, 'k').px(36, 13, 'k'); // angry brows
  if (pose) c.rect(29, 19, 7, 4, 'k').rect(30, 20, 5, 2, 'r'); // shouting
  else c.rect(29, 20, 7, 1, 'k').px(28, 21, 'k').px(36, 21, 'k'); // frown
  return c.outline().rows();
}

// --- Major Incident: a furious conference speakerphone running the bridge call -------
// walk: LEDs blink. attack: siren and LEDs blaze, sound waves pour out.
function incident(frame, attack) {
  const c = canvas();
  c.ellipse(32, 48, 28, 12, 'K'); // base
  c.ellipse(32, 44, 24, 10, 'G'); // grille dome
  for (let y = 38; y < 52; y += 3) for (let x = 12; x < 54; x += 3) if (((x - 32) / 24) ** 2 + ((y - 44) / 10) ** 2 < 0.8) c.px(x, y, 'k');
  c.rect(23, 39, 19, 9, 'n'); // LCD
  const eye = attack ? 'y' : 'r';
  c.rect(26, 41, 4, 2, eye).px(25, 40, 'k').px(29, 40, 'k').rect(35, 41, 4, 2, eye).px(35, 40, 'k').px(39, 40, 'k');
  c.rect(28, 45, 9, 1, eye);
  const led = (i) => (attack ? 'y' : (i + frame) % 2 ? 'r' : 'y');
  [[12, 50], [32, 57], [52, 50]].forEach(([x, y], i) => c.rect(x - 2, y - 1, 4, 2, led(i)));
  // Siren on top.
  c.rect(25, 30, 15, 5, 'G');
  c.ellipse(32, 26, 6, 6, attack || frame ? 'r' : 'y', (x, y) => y <= 30);
  c.rect(30, 22, 2, 3, 'w');
  if (attack) {
    // Sound waves.
    for (const [cx, dir] of [[8, -1], [56, 1]])
      for (const r of [4, 8]) for (let a = -0.8; a <= 0.8; a += 0.12) c.px(cx + dir * Math.cos(a) * r, 36 + Math.sin(a) * r, 'w');
    for (let i = 0; i < 4; i++) c.px(20 - i * 2, 22 - i, 'y').px(44 + i * 2, 22 - i, 'y');
  }
  return c.outline().rows();
}

// Small seeded RNG so generated art is identical on every build.
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// --- The Rat's Nest (Server Room boss): a living tangle of patch cables ---------------
// walk: dangling cables shuffle along like legs. attack: cables rear up, plugs out.
// `size` 64 for the full nest, 40 for the three smaller nests it splits into.
function ratsnest(frame, attack, size = 64) {
  const c = canvas(size, size);
  const k = size / 64;
  const R = rng(7);
  const cx = 32 * k;
  const cy = 38 * k;
  const COLS = ['B', 'y', 'e', 'r', 'o', 'b', 'g', 'q'];
  // Dangling "legs": cables down to the floor ending in RJ45 plugs.
  for (let i = 0; i < 5; i++) {
    const x = (14 + i * 9) * k;
    const sway = ((i + frame) % 2 ? 3 : -3) * k;
    const col = COLS[i % COLS.length];
    if (attack) {
      // Reared up: cables whip outward and up.
      const tx = cx + (x - cx) * 2.2;
      c.curve(x, cy, x + sway, 6 * k, tx, 4 * k + (i % 2) * 6 * k, col, 2);
      c.rect(Math.round(tx - 2), Math.round(4 * k + (i % 2) * 6 * k - 2), 4, 4, 'w');
    } else {
      c.curve(x, cy, x + sway * 2, 52 * k, x + sway, 60 * k, col, 2);
      c.rect(Math.round(x + sway - 2), Math.round(59 * k), 4, 3, 'w');
    }
  }
  // The body: dark core, then dozens of looping cables on top.
  c.ellipse(cx, cy, 25 * k, 19 * k, 'K');
  for (let i = 0; i < 46 * k; i++) {
    const a0 = R() * Math.PI * 2;
    const a1 = a0 + 1 + R() * 2.5;
    const r0 = (0.5 + R() * 0.5) * 24 * k;
    const r1 = (0.5 + R() * 0.5) * 24 * k;
    const x0 = cx + Math.cos(a0) * r0;
    const y0 = cy + Math.sin(a0) * r0 * 0.8;
    const x1 = cx + Math.cos(a1) * r1;
    const y1 = cy + Math.sin(a1) * r1 * 0.8;
    const bx = cx + (R() - 0.5) * 50 * k;
    const by = cy + (R() - 0.5) * 40 * k;
    c.curve(x0, y0, bx, by, x1, y1, COLS[(R() * COLS.length) | 0], k > 0.8 ? 2 : 1);
  }
  // A gap in the tangle with two angry eyes.
  const ey = cy - 4 * k;
  c.ellipse(cx, ey, 11 * k, 5 * k, 'k');
  const eye = attack ? 'r' : 'y';
  c.rect(Math.round(cx - 7 * k), Math.round(ey - 1), 3, 2, eye).rect(Math.round(cx + 4 * k), Math.round(ey - 1), 3, 2, eye);
  // A blinking link light.
  c.rect(Math.round(cx + 14 * k), Math.round(cy + 8 * k), 2, 2, frame ? 'e' : 'o');
  return c.outline().rows();
}

// --- The Angry Caller (Call Center boss): a huge furious customer on a headset -------
// walk: stomps, cord swings. attack: 0 = screaming (mouth wide, red face),
// 1 = phone raised to dial everyone in.
function caller(step, pose) {
  const c = canvas();
  const lift = step ? 3 : 0;
  c.rect(23, 50, 8, 10 - lift, 'h').rect(21, 60 - lift, 11, 3, 'K');
  c.rect(34, 50, 8, 10 - (step ? 0 : 3), 'h').rect(33, 60 - (step ? 0 : 3), 11, 3, 'K');
  // Puffy jacket, wide.
  c.ellipse(32, 38, 18, 15, 'p').rect(16, 40, 33, 11, 'p');
  c.rect(31, 26, 2, 25, 'k'); // zipper
  c.rect(19, 44, 7, 1, 'k').rect(39, 44, 7, 1, 'k');
  // Arms: left on hip, right holds a phone (raised in pose 1).
  c.rect(10, 30, 7, 14, 'p').rect(12, 44, 6, 4, 's');
  if (pose === 1) c.rect(48, 14, 7, 17, 'p').rect(48, 9, 7, 5, 's').rect(47, 2, 8, 9, 'K').rect(49, 3, 4, 6, 'q');
  else c.rect(48, 30, 7, 14, 'p').rect(48, 44, 6, 4, 's').rect(48, 47, 5, 7, 'K').rect(49, 48, 3, 4, 'q');
  // Head: red when screaming.
  const skin = pose === 0 ? 'r' : 's';
  c.rect(28, 20, 9, 5, skin);
  c.ellipse(32, 13, 10, 10, skin);
  c.ellipse(32, 6, 10, 5, 'h', (x, y) => y <= 7); // hair
  // Headset: band, ear cups, mic boom.
  c.curve(21, 13, 32, -2, 43, 13, 'G', 2);
  c.rect(19, 10, 4, 7, 'K').rect(42, 10, 4, 7, 'K');
  c.curve(21, 16, 22, 22, 28, 22, 'G', 1);
  c.rect(28, 21, 2, 2, 'k');
  // Face.
  c.rect(26, 12, 2, 2, 'k').rect(36, 12, 2, 2, 'k');
  c.px(25, 10, 'k').px(26, 10, 'k').px(27, 11, 'k').px(38, 10, 'k').px(37, 10, 'k').px(36, 11, 'k');
  if (pose === 0) c.rect(28, 16, 8, 6, 'k').rect(29, 17, 6, 3, 'r');
  else c.rect(29, 18, 6, 1, 'k').px(28, 19, 'k').px(35, 19, 'k');
  // Curly phone cord from the headset down to the belt (swings with the step).
  for (let y = 24; y < 44; y += 2) c.px(18 + ((y / 2 + step) % 2 ? 1 : -1), y, 'k');
  return c.outline().rows();
}

// --- The Night Janitor (Parking Garage boss): rides a floor buffer, wields a mop -------
// walk: buffer pad spins. attack: 0 = mop swung out, 1 = leaning in for a charge.
function janitor(frame, pose) {
  const c = canvas();
  // Floor buffer machine: round pad and housing at the bottom, handle up to his hands.
  c.ellipse(32, 56, 22, 6, 'G');
  c.ellipse(32, 53, 18, 6, 'y');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (frame ? 0.5 : 0);
    c.px(32 + Math.cos(a) * 14, 56 + Math.sin(a) * 4, 'k');
  }
  c.rect(30, 34, 3, 18, 'g'); // handle
  c.rect(24, 33, 15, 3, 'K');
  // Body: grey coveralls, hi-vis vest.
  const lean = pose === 1 ? 4 : 0;
  c.rect(22 + lean, 20, 20, 16, 'G').rect(22 + lean, 22, 20, 4, 'o').rect(22 + lean, 30, 20, 2, 'y');
  c.rect(24 + lean, 36, 6, 12, 'G').rect(34 + lean, 36, 6, 12, 'G');
  // Arms on the handle.
  c.rect(18 + lean, 22, 5, 12, 'G').rect(41 + lean, 22, 5, 12, 'G').rect(22, 32, 4, 3, 'S').rect(37, 32, 4, 3, 'S');
  // Head with a beanie.
  c.ellipse(32 + lean, 13, 8, 8, 'S');
  c.ellipse(32 + lean, 8, 9, 5, 'n', (x, y) => y <= 9).rect(23 + lean, 8, 18, 2, 'b');
  c.rect(28 + lean, 13, 2, 2, 'k').rect(35 + lean, 13, 2, 2, 'k');
  c.rect(29 + lean, 17, 7, 1, 'k');
  // Mop over the shoulder, or swung out to the side.
  if (pose === 0) c.curve(46, 26, 54, 34, 60, 44, 'h', 2).rect(54, 44, 10, 6, 'g');
  else c.curve(46, 18, 50, 8, 54, 2, 'h', 2).rect(51, 0, 8, 4, 'g');
  if (frame) c.px(10, 58, 'B').px(54, 58, 'B'); // water spray
  return c.outline().rows();
}

// --- The Hostile Takeover (Merger Day boss): a giant acquiring exec in a navy suit -----
// walk: frames 0/1 swing the legs. attack: 0 = holding up a Restructuring memo,
// 1 = arms wide ("welcome to the family").
function takeover(step, pose) {
  const c = canvas();
  const lift = step ? 3 : 0;
  c.rect(23, 50, 8, 10 - lift, 'a').rect(21, 60 - lift, 11, 3, 'K');
  c.rect(34, 50, 8, 10 - (step ? 0 : 3), 'a').rect(33, 60 - (step ? 0 : 3), 11, 3, 'K');
  // Broad navy suit with gold pinstripe edge, a white shirt and a gold tie.
  c.rect(17, 24, 31, 27, 'a').rect(18, 25, 2, 25, 'y');
  c.rect(28, 24, 9, 14, 'w').rect(31, 25, 3, 12, 'y');
  c.px(27, 24, 'k').px(28, 25, 'k').px(29, 26, 'k').px(37, 24, 'k').px(36, 25, 'k').px(35, 26, 'k');
  // Two lanyards: the old company's (navy) and the new one's (gold), both on him.
  c.rect(24, 26, 1, 12, 'b').rect(40, 26, 1, 12, 'y').rect(23, 38, 3, 4, 'w').rect(39, 38, 3, 4, 'w');
  // Arms.
  if (pose === 0) {
    // Memo raised high in the right hand; left hand on hip.
    c.rect(10, 26, 7, 14, 'a').rect(11, 40, 6, 4, 's');
    c.rect(48, 10, 7, 18, 'a').rect(48, 6, 7, 5, 's');
    c.rect(45, 0, 16, 10, 'w').rect(47, 2, 12, 1, 'k').rect(47, 4, 9, 1, 'g').rect(47, 6, 11, 1, 'g').rect(56, 7, 3, 2, 'r');
  } else if (pose === 1) {
    // Arms wide open.
    c.rect(2, 24, 15, 6, 'a').rect(0, 23, 4, 7, 's');
    c.rect(48, 24, 15, 6, 'a').rect(60, 23, 4, 7, 's');
  } else {
    c.rect(10, 26, 7, 16, 'a').rect(10, 42, 6, 4, 's');
    c.rect(48, 26, 7, 16, 'a').rect(49, 42, 6, 4, 's');
    // Briefcase with the merged logo.
    c.rect(46, 46, 14, 10, 'h').rect(51, 44, 4, 2, 'k').px(52, 50, 'y').px(54, 50, 'w');
  }
  // Head: slicked hair, smug grin.
  c.rect(28, 19, 9, 6, 's');
  c.ellipse(32, 12, 10, 10, 's');
  c.ellipse(32, 6, 10, 5, 'k', (x, y) => y <= 7).rect(22, 6, 3, 5, 'k');
  c.rect(26, 11, 3, 2, 'k').rect(36, 11, 3, 2, 'k');
  c.rect(27, 17, 10, 1, 'k').px(26, 16, 'k').px(37, 16, 'k').rect(28, 18, 8, 1, 'w');
  return c.outline().rows();
}

// The Subsidiary (spun off by the Hostile Takeover): a smaller exec in a grey suit.
function subsidiary(step, pose) {
  const c = canvas(40, 40);
  const lift = step ? 2 : 0;
  c.rect(14, 30, 5, 7 - lift, 'n').rect(13, 37 - lift, 7, 2, 'K');
  c.rect(21, 30, 5, 7 - (step ? 0 : 2), 'n').rect(20, 37 - (step ? 0 : 2), 7, 2, 'K');
  c.rect(11, 15, 18, 16, 'G').rect(18, 15, 4, 8, 'w').rect(19, 16, 2, 7, 'y');
  if (pose === 0) c.rect(29, 6, 4, 11, 'G').rect(28, 1, 10, 6, 'w').rect(29, 3, 7, 1, 'g');
  else c.rect(29, 16, 4, 10, 'G').rect(29, 26, 4, 3, 's');
  c.rect(7, 16, 4, 10, 'G').rect(7, 26, 4, 3, 's');
  c.ellipse(20, 8, 6, 6, 's');
  c.ellipse(20, 4, 6, 3, 'y', (x, y) => y <= 4);
  c.rect(17, 7, 2, 2, 'k').rect(22, 7, 2, 2, 'k').rect(18, 11, 4, 1, 'k');
  return c.outline().rows();
}

// --- Status Update Request (Major Incident minion), 16x16 ----------------------------
const STATUS = ['.kkkkkkkkk.', 'kyyyyyyyyyk', 'kykyykyykyk', 'kyyyyyyyyyk', '.kkykkkkkk.', '..kk.......'];
const blank = '...........';

export default {
  sheet: 'bosses',
  sprites: {
    executive: {
      size: [64, 64],
      fps: 4,
      anims: { walk: [executive(0), executive(1)], attack: [executive(0, 'point'), executive(1, 'phone')] },
    },
    incident: {
      size: [64, 64],
      fps: 4,
      anims: { walk: [incident(0), incident(1)], attack: [incident(0, true), incident(1, true)] },
    },
    ratsnest: {
      size: [64, 64],
      fps: 4,
      anims: { walk: [ratsnest(0), ratsnest(1)], attack: [ratsnest(0, true), ratsnest(1, true)] },
    },
    ratsnest_small: {
      size: [40, 40],
      fps: 5,
      anims: { walk: [ratsnest(0, false, 40), ratsnest(1, false, 40)], attack: [ratsnest(0, true, 40), ratsnest(1, true, 40)] },
    },
    caller: {
      size: [64, 64],
      fps: 4,
      anims: { walk: [caller(0), caller(1)], attack: [caller(0, 0), caller(1, 1)] },
    },
    janitor: {
      size: [64, 64],
      fps: 6,
      anims: { walk: [janitor(0), janitor(1)], attack: [janitor(0, 0), janitor(1, 1)] },
    },
    takeover: {
      size: [64, 64],
      fps: 4,
      anims: { walk: [takeover(0), takeover(1)], attack: [takeover(0, 0), takeover(1, 1)] },
    },
    subsidiary: {
      size: [40, 40],
      fps: 5,
      anims: { walk: [subsidiary(0), subsidiary(1)], attack: [subsidiary(0, 0), subsidiary(1, 0)] },
    },
    status_update: { size: [16, 16], fps: 4, anims: { walk: [[...STATUS, blank], [blank, ...STATUS]] } },
  },
};
