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
    status_update: { size: [16, 16], fps: 4, anims: { walk: [[...STATUS, blank], [blank, ...STATUS]] } },
  },
};
