// Endless "open office" floor. The world is split into 256x256 chunks; each chunk is
// generated deterministically from its coordinates (carpet tiles + a random furniture
// layout), rendered once to an offscreen canvas and cached. Decoration only: nothing
// here collides with anything.

const CHUNK = 256;
const TILE = 32;
const MAX_CACHED = 64;

// Integer hash -> 32-bit unsigned.
function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Floor {
  constructor(assets) {
    this.assets = assets;
    this.cache = new Map();
  }

  key(cx, cy) {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  // Draws a sprite's first frame with its top-left corner at (x, y).
  put(ctx, id, x, y) {
    const s = this.assets.sprite(id);
    const f = s.anims[Object.keys(s.anims)[0]].frames[0];
    ctx.drawImage(s.image, f[0], f[1], s.w, s.h, Math.round(x), Math.round(y), s.w, s.h);
  }

  // A row of cubicles: partition panels along the top, a desk pushed against each
  // panel, chairs in front, and posts between neighbours. Some panels are yellow.
  cubicleRow(ctx, r, x, y, segments) {
    for (let i = 0; i < segments; i++) this.put(ctx, r() < 0.2 ? 'cubicle_wall_yellow' : 'cubicle_wall', x + i * 64, y);
    for (let i = 0; i < segments; i++) {
      this.put(ctx, 'desk', x + i * 64 + 3, y + 6);
      this.put(ctx, 'chair', x + i * 64 + 25, y + 38);
    }
    for (let i = 0; i <= segments; i++) this.put(ctx, 'cubicle_post', x + i * 64 - 3, y);
  }

  build(cx, cy) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CHUNK;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Carpet tiles: alternating weave, with the occasional odd replacement tile.
    for (let ty = 0; ty < CHUNK / TILE; ty++) {
      for (let tx = 0; tx < CHUNK / TILE; tx++) {
        const gx = cx * 8 + tx;
        const gy = cy * 8 + ty;
        const odd = hash2(gx, gy) % 37 === 0;
        this.put(ctx, odd ? 'carpet_c' : (gx + gy) & 1 ? 'carpet_a' : 'carpet_b', tx * TILE, ty * TILE);
      }
    }

    // Furniture layout for this chunk.
    const r = rng(hash2(cx * 7 + 3, cy * 13 + 5));
    const ox = 16 + Math.floor(r() * 40);
    const oy = 16 + Math.floor(r() * 40);
    const roll = r();
    if (roll < 0.55) {
      // Cubicle block: one or two rows of two or three cubicles.
      const segments = ox + 192 <= CHUNK - 8 && r() < 0.5 ? 3 : 2;
      const rows = r() < 0.5 ? 2 : 1;
      for (let row = 0; row < rows; row++) this.cubicleRow(ctx, r, ox, oy + row * 96, segments);
    } else if (roll < 0.65) {
      // Break area.
      this.put(ctx, 'water_cooler', ox + 40, oy + 20);
      this.put(ctx, 'plant', ox + 10, oy + 24);
      this.put(ctx, 'plant', ox + 60, oy + 24);
    } else if (roll < 0.8) {
      this.put(ctx, 'plant', ox + 60, oy + 60);
    }
    return canvas;
  }

  chunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.cache.get(k);
    if (!c) {
      c = this.build(cx, cy);
      this.cache.set(k, c);
    }
    return c;
  }

  // Draws every chunk overlapping the world-space view rectangle.
  draw(ctx, left, top, w, h) {
    const cx0 = Math.floor(left / CHUNK);
    const cy0 = Math.floor(top / CHUNK);
    const cx1 = Math.floor((left + w) / CHUNK);
    const cy1 = Math.floor((top + h) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(this.chunk(cx, cy), cx * CHUNK, cy * CHUNK);
    if (this.cache.size > MAX_CACHED) this.prune((cx0 + cx1) / 2, (cy0 + cy1) / 2);
  }

  // Drops cached chunks far from the view.
  prune(ccx, ccy) {
    for (const k of this.cache.keys()) {
      const cx = Math.floor(k / 65536) - 32768;
      const cy = (k % 65536) - 32768;
      if (Math.abs(cx - ccx) > 4 || Math.abs(cy - ccy) > 3) this.cache.delete(k);
    }
  }

  clear() {
    this.cache.clear();
  }
}
