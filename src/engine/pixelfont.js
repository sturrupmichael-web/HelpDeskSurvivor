// Tiny 3x5 pixel font for text drawn in the world (damage numbers, pickup labels).
// Each color gets a pre-rendered strip of outlined glyphs, so drawing text is a few
// drawImage calls instead of the canvas's (slow, blurry when scaled) text rendering.

const GLYPHS = {
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '### ..# ### #.. ###', 3: '### ..# .## ..# ###',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ### ..# ###', 6: '### #.. ### #.# ###', 7: '### ..# ..# .#. .#.',
  8: '### #.# ### #.# ###', 9: '### #.# ### ..# ###',
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
  '+': '... .#. ### .#. ...', '-': '... ... ### ... ...', '!': '.#. .#. .#. ... .#.', '?': '##. ..# .#. ... .#.',
  '.': '... ... ... ... .#.', ',': '... ... ... .#. #..', "'": '.#. .#. ... ... ...', '%': '#.# ..# .#. #.. #.#',
  '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.', ':': '... .#. ... .#. ...', ' ': '... ... ... ... ...',
};
const CHARS = Object.keys(GLYPHS);
const INDEX = Object.fromEntries(CHARS.map((c, i) => [c, i]));
const CELL_W = 5; // glyph + 1 px outline each side
const CELL_H = 7;
export const ADVANCE = 4; // glyph width + 1 px spacing (outlines overlap)
const OUTLINE = '#1a1c2c';

const strips = new Map(); // color -> canvas

function strip(color) {
  let c = strips.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = CHARS.length * CELL_W;
  c.height = CELL_H;
  const g = c.getContext('2d');
  CHARS.forEach((ch, i) => {
    const rows = GLYPHS[ch].split(' ');
    const on = (x, y) => rows[y]?.[x] === '#';
    for (let y = -1; y <= 5; y++) {
      for (let x = -1; x <= 3; x++) {
        let fill = null;
        if (on(x, y)) fill = color;
        else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1)) fill = OUTLINE;
        if (!fill) continue;
        g.fillStyle = fill;
        g.fillRect(i * CELL_W + x + 1, y + 1, 1, 1);
      }
    }
  });
  strips.set(color, c);
  return c;
}

// Draws `text` centered on x with the bottom of the letters at y, `size` px per font pixel.
// Lowercase is shown as uppercase; characters the font lacks are skipped.
export function drawPixelText(ctx, text, x, y, color, size = 1) {
  const img = strip(color);
  const n = text.length;
  let px = Math.round(x - ((n * ADVANCE - 1) * size) / 2) - size;
  const py = Math.round(y - 6 * size);
  for (let i = 0; i < n; i++, px += ADVANCE * size) {
    let k = INDEX[text[i]];
    if (k === undefined) k = INDEX[text[i].toUpperCase()];
    if (k === undefined) continue;
    ctx.drawImage(img, k * CELL_W, 0, CELL_W, CELL_H, px, py, CELL_W * size, CELL_H * size);
  }
}
