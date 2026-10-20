// Office floor tiles and decoration. These are larger and very regular, so they are
// produced by small drawing helpers, but the result is the same character grid format
// as every other sprite (palette keys, '.' = transparent).

// Seeded RNG so the carpet speckle is identical on every build.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Minimal grid "canvas" for building sprites out of rectangles.
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
    // Filled rect with a 1px outline.
    box(x, y, rw, rh, fill, line = 'k') {
      api.rect(x, y, rw, rh, line);
      return api.rect(x + 1, y + 1, rw - 2, rh - 2, fill);
    },
    rows: () => g.map((r) => r.join('')),
  };
  return api;
}

// Grey/black carpet tiles. `dark` packs in more black flecks so neighbouring tiles
// read as a two-tone weave; `accent` adds stripes for the occasional odd tile.
function carpet(seed, dark, accent) {
  const r = rng(seed);
  const g = grid(32, 32, 'c');
  const black = dark ? 0.16 : 0.08;
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const v = r();
      if (v < black) g.px(x, y, 'k');
      else if (v < black + 0.04) g.px(x, y, 'm');
    }
  }
  // Carpet-tile seams on the right and bottom edges.
  g.rect(31, 0, 1, 32, 'k').rect(0, 31, 32, 1, 'k');
  if (accent) for (let i = 2; i < 30; i += 4) g.rect(i, 2, 1, 28, 'm');
  return g.rows();
}

// Cubicle work surface: spans the gap between two partition posts, with the monitor
// pushed up against the wall behind it.
function desk() {
  const g = grid(58, 30);
  g.box(0, 6, 58, 18, 'D'); // desktop
  g.rect(1, 23, 56, 6, 'E').rect(0, 23, 1, 6, 'k').rect(57, 23, 1, 6, 'k').rect(0, 29, 58, 1, 'k'); // front panel
  g.box(22, 0, 14, 11, 'n'); // monitor
  g.rect(24, 2, 4, 1, 'B').rect(24, 4, 7, 1, 'B').rect(24, 6, 5, 1, 'B'); // screen text
  g.rect(27, 11, 4, 2, 'G'); // stand
  g.box(21, 14, 16, 4, 'g'); // keyboard
  g.box(42, 12, 4, 4, 'w').px(43, 13, 'r'); // mug
  g.box(5, 10, 7, 9, 'w').rect(6, 12, 5, 1, 'g').rect(6, 14, 4, 1, 'g'); // papers
  g.box(6, 8, 3, 3, 'y'); // sticky note
  g.box(49, 9, 5, 4, 'k').rect(50, 10, 3, 2, 'G'); // desk phone
  return g.rows();
}

function chair() {
  const g = grid(14, 16);
  g.box(1, 0, 12, 7, 'K').rect(3, 1, 8, 1, 'm'); // backrest
  g.box(0, 6, 14, 6, 'K').rect(2, 7, 10, 1, 'm'); // seat
  g.rect(6, 12, 2, 2, 'k').rect(2, 14, 10, 1, 'k').px(1, 15, 'k').px(12, 15, 'k'); // base
  return g.rows();
}

// Fabric partition panel. `fabric`/`weave` pick the color (gray or the yellow accent).
function cubicleWall(len, fabric, weave) {
  const g = grid(len, 14);
  g.rect(0, 0, len, 3, 'k').rect(1, 1, len - 2, 1, 'g'); // trim
  g.box(0, 2, len, 12, fabric);
  for (let x = 2; x < len - 2; x += 3) g.px(x, 5 + (x % 2) * 3, weave).px(x + 1, 9 - (x % 2) * 2, weave); // fabric
  return g.rows();
}

function cubiclePost() {
  const g = grid(6, 44);
  g.box(0, 0, 6, 44, 'G').rect(1, 1, 4, 1, 'g').rect(2, 2, 1, 41, 'g');
  return g.rows();
}

function plant() {
  const g = grid(16, 24);
  // Overlapping leaf blobs: outlines first, then fills, so they merge into one bush.
  const leaves = [
    [6, 0, 4, 8], [2, 3, 5, 7], [9, 3, 5, 7], [0, 7, 6, 6], [10, 7, 6, 6], [4, 5, 8, 10],
  ];
  for (const [x, y, w, h] of leaves) g.rect(x, y, w, h, 'k');
  for (const [x, y, w, h] of leaves) g.rect(x + 1, y + 1, w - 2, h - 2, 'e');
  for (const [x, y] of [[7, 2], [4, 6], [11, 6], [2, 9], [13, 9], [8, 8]]) g.px(x, y, 'k');
  g.box(3, 14, 10, 10, 'h').rect(4, 15, 8, 1, 'd');
  return g.rows();
}

function waterCooler() {
  const g = grid(12, 28);
  g.box(2, 0, 8, 10, 'B').rect(3, 2, 2, 5, 'w'); // jug
  g.box(1, 9, 10, 19, 'w').rect(2, 26, 8, 1, 'g');
  g.px(3, 13, 'B').px(3, 14, 'k').px(8, 13, 'r').px(8, 14, 'k'); // taps
  g.rect(2, 20, 8, 1, 'g'); // drip tray
  return g.rows();
}

const single = (frame, size) => ({ size, anims: { idle: [frame] }, hitFlash: false });

export default {
  sheet: 'office',
  sprites: {
    carpet_a: single(carpet(11, false), [32, 32]),
    carpet_b: single(carpet(23, true), [32, 32]),
    carpet_c: single(carpet(37, false, true), [32, 32]),
    desk: single(desk(), [58, 30]),
    chair: single(chair(), [14, 16]),
    cubicle_wall: single(cubicleWall(64, 'G', 'c'), [64, 14]),
    cubicle_wall_yellow: single(cubicleWall(64, 'y', 'd'), [64, 14]),
    cubicle_post: single(cubiclePost(), [6, 44]),
    plant: single(plant(), [16, 24]),
    water_cooler: single(waterCooler(), [12, 28]),
  },
};
