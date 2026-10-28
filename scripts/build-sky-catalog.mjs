// Builds components/marketing/cosmos/stars.bin — the landing's star field — from the HYG
// Database (v4.4, CC BY-SA 4.0, https://codeberg.org/astronexus/hyg).
//
//   node scripts/build-sky-catalog.mjs <hyg_v44.csv.gz> [count=30000]
//
// Layout (little-endian), decoded by components/marketing/cosmos/catalog.ts:
//   header 16 B: "ARSK", u16 version (1), u16 0, u32 star count, u32 0
//   per star 8 B: u16 octX, u16 octY  — direction from the Sun, octahedral
//                 u16 logDist         — log10(parsecs) over [-1, 4]
//                 u8  absMag          — (M + 10) / 0.11
//                 u8  colorIndex      — (B−V + 0.5) / 0.01
// Index 0 is the Sun; 1–4 are the journey's stops (see STOPS); the rest are
// the brightest stars as seen from Earth.

import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const [src, countArg] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/build-sky-catalog.mjs <hyg_v44.csv.gz> [count]");
  process.exit(1);
}
const COUNT = Number(countArg ?? 30000);

// The four stops, matched by Gliese number (stable across HYG releases).
const STOPS = [
  { year: 2032, gl: "Gl 699", name: "Barnard's Star" },
  { year: 2044, gl: "Gl 251", name: "Gliese 251" },
  { year: 2051, gl: "Gl 721", name: "Vega" },
  { year: 2070, gl: "Gl 61", name: "Titawin (ups And)" },
];

function splitCsv(line) {
  const out = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const rows = [];
let sun = null;
const stops = new Map();
let header = null;
const rl = createInterface({ input: createReadStream(src).pipe(createGunzip()), crlfDelay: Infinity });
for await (const line of rl) {
  const f = splitCsv(line);
  if (!header) { header = Object.fromEntries(f.map((k, i) => [k, i])); continue; }
  const get = (k) => f[header[k]];
  const x = Number(get("x")), y = Number(get("y")), z = Number(get("z"));
  const absmag = Number(get("absmag")), mag = Number(get("mag")), dist = Number(get("dist"));
  if (![x, y, z, absmag, mag, dist].every(Number.isFinite)) continue;
  const ciRaw = get("ci");
  const ci = ciRaw === "" || !Number.isFinite(Number(ciRaw)) ? 0.65 : Number(ciRaw);
  const star = { x, y, z, absmag, ci, mag, dist };
  if (get("proper") === "Sol") { sun = star; continue; }
  if (dist >= 100000) continue; // HYG's placeholder for unknown distance
  const stop = STOPS.find((s) => s.gl === get("gl").trim());
  if (stop) stops.set(stop.year, { ...star, stop });
  else rows.push(star);
}

if (!sun || stops.size !== STOPS.length) throw new Error(`missing Sun or stops (${[...stops.keys()]})`);
rows.sort((a, b) => a.mag - b.mag);
const stars = [sun, ...STOPS.map((s) => stops.get(s.year)), ...rows.slice(0, COUNT)];

function octEncode(x, y, z) {
  const n = Math.abs(x) + Math.abs(y) + Math.abs(z);
  let u = x / n, v = y / n;
  if (z < 0) {
    const pu = (1 - Math.abs(v)) * Math.sign(u || 1);
    const pv = (1 - Math.abs(u)) * Math.sign(v || 1);
    u = pu; v = pv;
  }
  const q = (t) => Math.round((Math.max(-1, Math.min(1, t)) * 0.5 + 0.5) * 65535);
  return [q(u), q(v)];
}
const clampInt = (v, max) => Math.max(0, Math.min(max, Math.round(v)));

const buf = Buffer.alloc(16 + stars.length * 8);
buf.write("ARSK", 0, "ascii");
buf.writeUInt16LE(1, 4);
buf.writeUInt32LE(stars.length, 8);
stars.forEach((s, i) => {
  const o = 16 + i * 8;
  const d = Math.hypot(s.x, s.y, s.z);
  const [ox, oy] = d > 0 ? octEncode(s.x / d, s.y / d, s.z / d) : [32768, 32768];
  const logD = d > 0 ? clampInt(((Math.log10(d) + 1) / 5) * 65535, 65535) : 0;
  buf.writeUInt16LE(ox, o);
  buf.writeUInt16LE(oy, o + 2);
  buf.writeUInt16LE(logD, o + 4);
  buf.writeUInt8(clampInt((s.absmag + 10) / 0.11, 255), o + 6);
  buf.writeUInt8(clampInt((s.ci + 0.5) / 0.01, 255), o + 7);
});

writeFileSync("components/marketing/cosmos/stars.bin", buf);
console.log(`components/marketing/cosmos/stars.bin: ${stars.length} stars, ${buf.length} bytes`);
for (const [i, s] of stars.slice(1, 5).entries()) {
  console.log(`  [${i + 1}] ${s.stop.year} ${s.stop.name}: ${(s.dist * 3.26156).toFixed(2)} ly`);
}
