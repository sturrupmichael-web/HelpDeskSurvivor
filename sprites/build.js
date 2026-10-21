#!/usr/bin/env node
// Sprite build script: renders every definition in sprites/defs/*.js to PNG
// spritesheets plus sprites/out/manifest.json. No npm dependencies (own PNG encoder).
//
//   node sprites/build.js                 build sheets + manifest
//   node sprites/build.js --preview DIR   also write 6x-scaled previews to DIR
//
// The game only ever reads manifest.json and the PNGs, so a third-party asset pack can
// replace them as long as it provides the same sprite ids (see README "Swapping art").

import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PALETTE, FLASH_COLOR } from '../data/palette.js';

const here = dirname(fileURLToPath(import.meta.url));
const defsDir = join(here, 'defs');
const outDir = join(here, 'out');
const previewIdx = process.argv.indexOf('--preview');
const previewDir = previewIdx > 0 ? process.argv[previewIdx + 1] : null;

const hexToRgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);
const COLORS = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hexToRgba(v)]));
const FLASH = hexToRgba(FLASH_COLOR);

// Validates a grid and places it in a w*h frame (centered horizontally, bottom aligned).
function normalize(rows, w, h, where) {
  const gw = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== gw) throw new Error(`${where}: row ${i} is ${r.length} wide, expected ${gw}`);
    for (const ch of r) if (ch !== '.' && !COLORS[ch]) throw new Error(`${where}: unknown palette key '${ch}' in row ${i}`);
  });
  if (gw > w || rows.length > h) throw new Error(`${where}: grid ${gw}x${rows.length} larger than ${w}x${h}`);
  const ox = Math.floor((w - gw) / 2);
  const oy = h - rows.length;
  const out = Array.from({ length: h }, () => '.'.repeat(w).split(''));
  rows.forEach((r, y) => [...r].forEach((ch, x) => (out[y + oy][x + ox] = ch)));
  return out.map((r) => r.join(''));
}

// --- PNG encoding -------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function scaleUp(w, h, rgba, s) {
  const out = Buffer.alloc(w * s * h * s * 4);
  for (let y = 0; y < h * s; y++)
    for (let x = 0; x < w * s; x++) rgba.copy(out, (y * w * s + x) * 4, (((y / s) | 0) * w + ((x / s) | 0)) * 4, (((y / s) | 0) * w + ((x / s) | 0)) * 4 + 4);
  return out;
}

// --- Build --------------------------------------------------------------------------
const manifest = { version: 1, sheets: {}, sprites: {} };
mkdirSync(outDir, { recursive: true });
if (previewDir) mkdirSync(previewDir, { recursive: true });

for (const file of readdirSync(defsDir).filter((f) => f.endsWith('.js')).sort()) {
  const { default: def } = await import(pathToFileURL(join(defsDir, file)));
  // Lay each sprite out as one row: every anim's frames, then their hit-flash frames.
  const rows = [];
  for (const [id, spr] of Object.entries(def.sprites)) {
    const [w, h] = spr.size;
    const frames = [];
    const anims = {};
    for (const [name, list] of Object.entries(spr.anims)) {
      const normal = list.map((g, i) => normalize(g, w, h, `${file}:${id}.${name}[${i}]`));
      anims[name] = { frames: normal.map((g) => frames.push({ g, flash: false }) - 1) };
      if (spr.hitFlash !== false) anims[name].hit = normal.map((g) => frames.push({ g, flash: true }) - 1);
    }
    rows.push({ id, spr, w, h, frames, anims });
  }
  const sheetW = Math.max(...rows.map((r) => r.w * r.frames.length));
  const sheetH = rows.reduce((s, r) => s + r.h, 0);
  const rgba = Buffer.alloc(sheetW * sheetH * 4);
  let y0 = 0;
  for (const r of rows) {
    r.frames.forEach(({ g, flash }, fi) => {
      g.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          const col = flash ? FLASH : COLORS[ch];
          rgba.set(col, ((y0 + y) * sheetW + fi * r.w + x) * 4);
        }),
      );
    });
    const rect = (i) => [i * r.w, y0];
    const anims = {};
    for (const [name, a] of Object.entries(r.anims)) {
      anims[name] = { frames: a.frames.map(rect) };
      if (a.hit) anims[name].hit = a.hit.map(rect);
    }
    manifest.sprites[r.id] = {
      sheet: def.sheet,
      w: r.w,
      h: r.h,
      anchor: r.spr.anchor ?? [r.w / 2, r.h], // feet: bottom center
      fps: r.spr.fps ?? 1,
      anims,
    };
    y0 += r.h;
  }
  writeFileSync(join(outDir, `${def.sheet}.png`), encodePNG(sheetW, sheetH, rgba));
  // The ?v= tag changes whenever the pixels do, so the installed app (sw.js) can keep
  // sheets cached and still fetch a new one the moment the art changes.
  const tag = createHash('sha1').update(rgba).update(`${sheetW}x${sheetH}`).digest('hex').slice(0, 10);
  manifest.sheets[def.sheet] = `${def.sheet}.png?v=${tag}`;
  if (previewDir) writeFileSync(join(previewDir, `${def.sheet}.png`), encodePNG(sheetW * 6, sheetH * 6, scaleUp(sheetW, sheetH, rgba, 6)));
  console.log(`${def.sheet}.png  ${sheetW}x${sheetH}  ${rows.length} sprites`);
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest.json  ${Object.keys(manifest.sprites).length} sprites`);
