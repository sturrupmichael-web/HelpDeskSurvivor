// Endless floor in one of the map styles from data/maps.js (office, server, callcenter,
// garage). The world is split into 256x256 chunks; each chunk is generated
// deterministically from its coordinates (floor tiles + a random furniture layout),
// rendered once to an offscreen canvas and cached. Decoration only: nothing here
// collides with anything. The Server Room's hot aisles are the one gameplay feature,
// read back with isHot().

const CHUNK = 256;
const TILE = 32;
const MAX_CACHED = 64;

// Floor tile sprite per style, from global tile coordinates.
const TILES = {
  office: (gx, gy) => (hash2(gx, gy) % 37 === 0 ? 'carpet_c' : (gx + gy) & 1 ? 'carpet_a' : 'carpet_b'),
  server: (gx, gy) => (hash2(gx, gy) % 7 === 0 ? 'raised_vent' : 'raised_a'),
  callcenter: (gx, gy) => ((gx + gy) & 1 ? 'call_carpet_a' : 'call_carpet_b'),
  garage: (gx, gy) => {
    const h = hash2(gx, gy) % 41;
    return h === 0 ? 'concrete_crack' : h === 1 ? 'concrete_oil' : 'concrete_a';
  },
};

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
    this.hot = new Map(); // chunk key -> hot-aisle rect [x, y, w, h] in world px, or null
    this.style = 'office';
  }

  setStyle(style) {
    if (style === this.style) return;
    this.style = style;
    this.clear();
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
    const tiles = TILES[this.style];
    for (let ty = 0; ty < CHUNK / TILE; ty++) {
      for (let tx = 0; tx < CHUNK / TILE; tx++) this.put(ctx, tiles(cx * 8 + tx, cy * 8 + ty), tx * TILE, ty * TILE);
    }
    // Furniture layout for this chunk.
    const r = rng(hash2(cx * 7 + 3, cy * 13 + 5));
    const ox = 16 + Math.floor(r() * 40);
    const oy = 16 + Math.floor(r() * 40);
    this[this.style](ctx, r, ox, oy, r(), cx, cy);
    return canvas;
  }

  office(ctx, r, ox, oy, roll) {
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
  }

  // Server Room: a row of racks with its hot aisle (exhaust side) glowing in front.
  server(ctx, r, ox, oy, roll, cx, cy) {
    if (roll < 0.65) {
      const n = 3 + Math.floor(r() * 3);
      const x = Math.min(ox, CHUNK - n * 32 - 8);
      const hot = this.hotRect(cx, cy);
      ctx.fillStyle = 'rgba(239, 125, 87, 0.28)';
      ctx.fillRect(hot[0] - cx * CHUNK, hot[1] - cy * CHUNK, hot[2], hot[3]);
      ctx.fillStyle = 'rgba(239, 125, 87, 0.5)';
      for (let i = 0; i < hot[2]; i += 12) ctx.fillRect(hot[0] - cx * CHUNK + i, hot[1] - cy * CHUNK + hot[3] / 2 - 1, 6, 2);
      for (let i = 0; i < n; i++) this.put(ctx, ['rack_a', 'rack_b', 'rack_c'][Math.floor(r() * 3)], x + i * 32, oy);
    } else if (roll < 0.8) {
      this.put(ctx, 'crac', ox + 30, oy + 30);
    }
  }

  // Call Center: clusters of headset pods behind low dividers, the odd queue wallboard.
  callcenter(ctx, r, ox, oy, roll) {
    if (roll < 0.7) {
      const n = ox + 4 * 34 <= CHUNK - 8 && r() < 0.5 ? 4 : 3;
      const rows = r() < 0.6 ? 2 : 1;
      for (let row = 0; row < rows; row++) {
        const y = oy + row * 64;
        for (let i = 0; i < n; i++) this.put(ctx, 'pod_divider', ox + i * 34 - 2, y);
        for (let i = 0; i < n; i++) this.put(ctx, 'pod_desk', ox + i * 34, y + 6);
      }
    } else if (roll < 0.85) {
      this.put(ctx, 'wallboard', ox + 40, oy + 40);
    }
  }

  // Parking Garage: painted stalls with parked cars, and concrete pillars.
  garage(ctx, r, ox, oy, roll) {
    if (roll < 0.7) {
      const n = 4;
      const x0 = Math.min(ox, CHUNK - n * 44 - 8);
      ctx.fillStyle = '#ffcd75';
      for (let i = 0; i <= n; i++) ctx.fillRect(x0 + i * 44, oy, 2, 64);
      ctx.fillRect(x0, oy + 63, n * 44 + 2, 2);
      const cars = ['car_red', 'car_blue', 'car_white', 'car_green'];
      for (let i = 0; i < n; i++) if (r() < 0.65) this.put(ctx, cars[Math.floor(r() * cars.length)], x0 + i * 44 + 8, oy + 6);
    } else if (roll < 0.9) {
      this.put(ctx, 'pillar', ox + 40, oy + 40);
    }
  }

  // The hot-aisle rectangle (world px) of a server-room chunk, or null. Uses the same
  // RNG sequence as build() so the glow and the gameplay effect line up.
  hotRect(cx, cy) {
    const k = this.key(cx, cy);
    if (this.hot.has(k)) return this.hot.get(k);
    const r = rng(hash2(cx * 7 + 3, cy * 13 + 5));
    const ox = 16 + Math.floor(r() * 40);
    const oy = 16 + Math.floor(r() * 40);
    let rect = null;
    if (r() < 0.65) {
      const n = 3 + Math.floor(r() * 3);
      const x = Math.min(ox, CHUNK - n * 32 - 8);
      rect = [cx * CHUNK + x - 6, cy * CHUNK + oy + 58, n * 32 + 12, 26];
    }
    if (this.hot.size > 512) this.hot.clear();
    this.hot.set(k, rect);
    return rect;
  }

  isHot(x, y) {
    if (this.style !== 'server') return false;
    const h = this.hotRect(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
    return !!h && x >= h[0] && x < h[0] + h[2] && y >= h[1] && y < h[1] + h[3];
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
