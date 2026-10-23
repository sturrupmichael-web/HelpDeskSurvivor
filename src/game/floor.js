// Endless floor in one of the map styles from data/maps.js (office, server, callcenter,
// garage, merger). The world is split into 256x256 chunks; each chunk is generated
// deterministically from its coordinates (floor tiles + a random furniture layout),
// rendered once to an offscreen canvas and cached. The gameplay features are read back
// from the same layout: the Server Room's hot aisles (isHot), Merger Day's acquired floor
// (isAcquired) and, on maps with `solid` in data/maps.js, the cubicle rows nobody can walk
// through (solidRects / collide).

const CHUNK = 256;
const TILE = 32;
const MAX_CACHED = 64;
const SOLID_DEPTH = 38; // px of a cubicle row that blocks: partition and desks, not chairs
const REBUILDS_PER_FRAME = 2; // outdated chunks repainted per frame (new ones always are)

// Floor tile sprite per style, from global tile coordinates.
const TILES = {
  merger: (gx, gy, acquired) =>
    acquired ? (hash2(gx, gy) % 29 === 0 ? 'corp_logo' : (gx + gy) & 1 ? 'corp_a' : 'corp_b') : TILES.office(gx, gy),
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
// Value noise in 0..1, bilinearly interpolated between integer grid points.
function smooth(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const v = (i, j) => (hash2(x0 + i + 911, y0 + j + 377) % 1000) / 999;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = v(0, 0) + (v(1, 0) - v(0, 0)) * sx;
  const bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * sx;
  return top + (bottom - top) * sy;
}

// How "legacy" a Merger Day chunk is (0..1): smooth noise, so the parent company's
// floor arrives as rounded regions, a little higher around the start so you begin on
// the old company's floor.
function legacy(cx, cy) {
  return 0.15 * Math.max(0, 1 - Math.hypot(cx, cy) / 4) + 0.85 * smooth(cx / 2.5, cy / 2.5);
}

// legacy() values of the chunks around the start, sorted: share -> threshold.
const LEGACY_QUANTILES = [];
for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) if (Math.hypot(x, y) <= 8) LEGACY_QUANTILES.push(legacy(x, y));
LEGACY_QUANTILES.sort((a, b) => a - b);

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
    this.stale = new Set(); // cached chunk keys whose art is out of date (Merger Day borders)
    this.hot = new Map(); // chunk key -> hot-aisle rect [x, y, w, h] in world px, or null
    this.solids = new Map(); // chunk key -> solid rects [[x, y, w, h], ...] in world px
    this.solid = false; // furniture blocks movement (set from the map's `solid`)
    this.style = 'office';
    this.share = -1; // Merger Day: share of the floor the parent company owns (0..1)
    this.owned = -1; // ...as a threshold on legacy(): chunks below it are acquired
  }

  // Merger Day: the parent company now owns about `share` of the floor.
  setOwned(share) {
    if (share === this.share) return;
    this.share = share;
    const before = this.owned;
    this.owned = LEGACY_QUANTILES[Math.min(LEGACY_QUANTILES.length - 1, Math.floor(share * LEGACY_QUANTILES.length))];
    if (this.style !== 'merger') return this.clear();
    // Repaint only the chunks whose floor changed hands, and their neighbours (whose
    // integration line moved). The old art shows until draw() gets round to them.
    const flipped = (cx, cy) => {
      const l = legacy(cx, cy);
      return l < before !== l < this.owned;
    };
    for (const k of this.cache.keys()) {
      const [cx, cy] = this.unkey(k);
      if (flipped(cx, cy) || flipped(cx - 1, cy) || flipped(cx + 1, cy) || flipped(cx, cy - 1) || flipped(cx, cy + 1)) this.stale.add(k);
    }
  }

  acquiredChunk(cx, cy) {
    return legacy(cx, cy) < this.owned;
  }

  // A chunk that shows off the style: on Merger Day, the first acquired chunk next to
  // the old office (so the integration line is in the picture).
  previewChunk() {
    if (this.style === 'merger')
      for (let cx = 1; cx < 30; cx++) if (this.acquiredChunk(cx, 3) && !this.acquiredChunk(cx - 1, 3)) return [cx, 3];
    return [1, 3];
  }

  isAcquired(x, y) {
    return this.style === 'merger' && this.acquiredChunk(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
  }

  setStyle(style) {
    if (style === this.style) return;
    this.style = style;
    this.clear();
  }

  key(cx, cy) {
    return (cx + 32768) * 65536 + (cy + 32768);
  }

  unkey(k) {
    return [Math.floor(k / 65536) - 32768, (k % 65536) - 32768];
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
    const acquired = this.style === 'merger' && this.acquiredChunk(cx, cy);
    for (let ty = 0; ty < CHUNK / TILE; ty++) {
      for (let tx = 0; tx < CHUNK / TILE; tx++) this.put(ctx, tiles(cx * 8 + tx, cy * 8 + ty, acquired), tx * TILE, ty * TILE);
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

  // Merger Day: the old office (cubicles, half packed into moving boxes) next to the
  // parent company's floor (hot-desk benches, bean bags, SYNERGY banners). A dashed
  // integration line marks every border between the two.
  merger(ctx, r, ox, oy, roll, cx, cy) {
    if (!this.acquiredChunk(cx, cy)) {
      this.office(ctx, r, ox, oy, roll);
      if (r() < 0.6) this.put(ctx, r() < 0.5 ? 'box_stack' : 'box_single', 200 - Math.floor(r() * 30), 190 + Math.floor(r() * 30));
    } else if (roll < 0.6) {
      const rows = r() < 0.5 ? 2 : 1;
      for (let i = 0; i < rows; i++) this.put(ctx, 'bench_desk', ox + 20, oy + 20 + i * 70);
      if (r() < 0.5) this.put(ctx, 'bean_bag', ox + 110, oy + 50);
    } else if (roll < 0.85) {
      this.put(ctx, 'synergy_banner', ox + 30, oy + 30);
      this.put(ctx, 'bean_bag', ox + 40, oy + 80);
      this.put(ctx, 'bean_bag', ox + 80, oy + 90);
    }
    const mine = this.acquiredChunk(cx, cy);
    const edge = (x, y, w, h, horizontal) => {
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(x, y, w, h);
      for (let i = 0; i < (horizontal ? w : h); i += 16) {
        ctx.fillStyle = (i >> 4) & 1 ? '#f4f4f4' : '#ffcd75';
        if (horizontal) ctx.fillRect(x + i, y + 1, 12, h - 2);
        else ctx.fillRect(x + 1, y + i, w - 2, 12);
      }
    };
    if (this.acquiredChunk(cx, cy - 1) !== mine) edge(0, 0, CHUNK, 4, true);
    if (this.acquiredChunk(cx, cy + 1) !== mine) edge(0, CHUNK - 4, CHUNK, 4, true);
    if (this.acquiredChunk(cx - 1, cy) !== mine) edge(0, 0, 4, CHUNK, false);
    if (this.acquiredChunk(cx + 1, cy) !== mine) edge(CHUNK - 4, 0, 4, CHUNK, false);
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

  // The solid furniture of an office chunk: one rect per cubicle row (partition, posts
  // and desks; the chairs in front stay walkable). Same RNG sequence as build()/office().
  solidRects(cx, cy) {
    const k = this.key(cx, cy);
    let rects = this.solids.get(k);
    if (rects) return rects;
    rects = [];
    const r = rng(hash2(cx * 7 + 3, cy * 13 + 5));
    const ox = 16 + Math.floor(r() * 40);
    const oy = 16 + Math.floor(r() * 40);
    if (r() < 0.55) {
      const segments = ox + 192 <= CHUNK - 8 && r() < 0.5 ? 3 : 2;
      const rows = r() < 0.5 ? 2 : 1;
      for (let row = 0; row < rows; row++) rects.push([cx * CHUNK + ox - 3, cy * CHUNK + oy + row * 96, segments * 64 + 6, SOLID_DEPTH]);
    }
    if (this.solids.size > 512) this.solids.clear();
    this.solids.set(k, rects);
    return rects;
  }

  // Is the point (x, y) inside solid furniture?
  blocked(x, y) {
    if (!this.solid) return false;
    for (const s of this.solidRects(Math.floor(x / CHUNK), Math.floor(y / CHUNK)))
      if (x >= s[0] && x < s[0] + s[2] && y >= s[1] && y < s[1] + s[3]) return true;
    return false;
  }

  // Pushes `o` (anything with x, y) out of solid furniture, treating it as a circle of
  // radius `r` at its feet (`foot` px below o.y). Returns the last rect it touched (or
  // null); `this.hitSide` says which face: true for left/right, false for top/bottom.
  collide(o, foot, r) {
    if (!this.solid) return null;
    let hit = null;
    const fy = o.y + foot;
    const cx0 = Math.floor((o.x - r) / CHUNK);
    const cx1 = Math.floor((o.x + r) / CHUNK);
    const cy0 = Math.floor((fy - r) / CHUNK);
    const cy1 = Math.floor((fy + r) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++)
        for (const s of this.solidRects(cx, cy)) {
          const y = o.y + foot;
          const nx = Math.max(s[0], Math.min(o.x, s[0] + s[2]));
          const ny = Math.max(s[1], Math.min(y, s[1] + s[3]));
          const dx = o.x - nx;
          const dy = y - ny;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          hit = s;
          if (d2 > 1e-6) {
            // Outside the rect: back off along the line from the closest point.
            const d = Math.sqrt(d2);
            o.x += (dx / d) * (r - d);
            o.y += (dy / d) * (r - d);
            this.hitSide = dx !== 0 && Math.abs(dx) >= Math.abs(dy);
          } else {
            // Feet inside the rect: leave by the nearest face.
            const left = o.x - s[0] + r;
            const right = s[0] + s[2] - o.x + r;
            const top = y - s[1] + r;
            const bottom = s[1] + s[3] - y + r;
            const m = Math.min(left, right, top, bottom);
            this.hitSide = m === left || m === right;
            if (m === left) o.x -= left;
            else if (m === right) o.x += right;
            else if (m === top) o.y -= top;
            else o.y += bottom;
          }
        }
    return hit;
  }

  chunk(cx, cy) {
    const k = this.key(cx, cy);
    let c = this.cache.get(k);
    if (!c || (this.stale.has(k) && this.rebuilds-- > 0)) {
      c = this.build(cx, cy);
      this.cache.set(k, c);
      this.stale.delete(k);
    }
    return c;
  }

  // Draws every chunk overlapping the world-space view rectangle.
  draw(ctx, left, top, w, h) {
    const cx0 = Math.floor(left / CHUNK);
    const cy0 = Math.floor(top / CHUNK);
    const cx1 = Math.floor((left + w) / CHUNK);
    const cy1 = Math.floor((top + h) / CHUNK);
    this.rebuilds = REBUILDS_PER_FRAME;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(this.chunk(cx, cy), cx * CHUNK, cy * CHUNK);
    if (this.cache.size > MAX_CACHED) this.prune((cx0 + cx1) / 2, (cy0 + cy1) / 2);
  }

  // Drops cached chunks far from the view.
  prune(ccx, ccy) {
    for (const k of this.cache.keys()) {
      const [cx, cy] = this.unkey(k);
      if (Math.abs(cx - ccx) > 4 || Math.abs(cy - ccy) > 3) {
        this.cache.delete(k);
        this.stale.delete(k);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.stale.clear();
  }
}
