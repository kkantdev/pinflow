/**
 * PinFlow — icon generator.
 *
 * Produces the extension icon set (16/32/48/128) as real PNG files with no
 * third-party dependencies: a rounded indigo->violet tile carrying a white pin
 * with a play triangle punched out of its head (pin + video, per PRD 27).
 *
 * Usage: node tools/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'application', 'assets', 'icons');
const SIZES = [16, 32, 48, 128];

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ------------------------------------------------------------------ PNG ---- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Encode straight RGBA bytes (top-down, 8 bit) as a PNG buffer. */
function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    for (let x = 0; x < stride; x += 1) raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x];
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method: adaptive
  ihdr[12] = 0; // interlace: none

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ------------------------------------------------------------- geometry ---- */

const SS = 4; // supersampling factor for anti-aliasing
const BG_FROM = [79, 70, 229]; // #4F46E5
const BG_TO = [124, 58, 237]; // #7C3AED

function roundedRectContains(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const r = Math.min(radius, (right - left) / 2, (bottom - top) / 2);
  const cx = Math.min(Math.max(x, left + r), right - r);
  const cy = Math.min(Math.max(y, top + r), bottom - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function circleContains(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function triangleContains(x, y, a, b, c) {
  const side = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = side([x, y], a, b);
  const d2 = side([x, y], b, c);
  const d3 = side([x, y], c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

function mix(from, to, t) {
  const k = Math.min(1, Math.max(0, t));
  return [
    from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k,
    from[2] + (to[2] - from[2]) * k
  ];
}

/* -------------------------------------------------------------- artwork ---- */

/** Colour of one sample point in normalised (0..1) icon space. [r,g,b,a] */
function sampleColor(px, py) {
  if (!roundedRectContains(px, py, 0, 0, 1, 1, 0.22)) return [0, 0, 0, 0];

  const bg = mix(BG_FROM, BG_TO, py);
  const inHead = circleContains(px, py, 0.5, 0.395, 0.2);
  const inStem = roundedRectContains(px, py, 0.455, 0.54, 0.545, 0.8, 0.03);

  if (inHead || inStem) {
    const inPlay = triangleContains(px, py, [0.45, 0.325], [0.45, 0.465], [0.575, 0.395]);
    if (!inPlay) return [255, 255, 255, 1];
  }

  return [bg[0], bg[1], bg[2], 1];
}

function drawIcon(size) {
  const out = new Uint8ClampedArray(size * size * 4);
  const samples = SS * SS;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          const sample = sampleColor(px, py);
          r += sample[0] * sample[3];
          g += sample[1] * sample[3];
          b += sample[2] * sample[3];
          a += sample[3];
        }
      }

      const index = (y * size + x) * 4;
      if (a <= 0) continue;
      out[index] = Math.round(r / a);
      out[index + 1] = Math.round(g / a);
      out[index + 2] = Math.round(b / a);
      out[index + 3] = Math.round((a / samples) * 255);
    }
  }

  return out;
}

/* ---------------------------------------------------------------- checks ---- */

function readPngSize(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(SIGNATURE)) return null;
  if (buffer.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/* ------------------------------------------------------------------ main ---- */

mkdirSync(OUT_DIR, { recursive: true });

let failed = false;
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, drawIcon(size)));

  const readBack = readPngSize(file);
  const ok = readBack && readBack.width === size && readBack.height === size;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${file} (${size}x${size})`);
}

if (failed) {
  console.error('Icon generation failed validation.');
  process.exit(1);
}
console.log(`Wrote ${SIZES.length} icons to ${OUT_DIR}`);