// Builds public/cosmos/tex/*.ktx2 — the landing's planet textures — from the
// public-domain NASA sources and the CC BY 4.0 Solar System Scope set.
//
//   node scripts/build-cosmos-textures.mjs --nasa <dir> --sss <dir> [--only name,name]
//
// Expected source files (download them yourself; none are committed):
//   <nasa>/world.topo.bathy.200407.3x21600x10800.jpg   Blue Marble Next Generation, July 2004, w/ topography & bathymetry
//                                                      https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/
//   <nasa>/BlackMarble_2016_3km.jpg                    Black Marble 2016 (night lights), 3 km
//                                                      https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/
//   <nasa>/cloud_combined_8192.tif                     Blue Marble clouds (2002)
//                                                      https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/
//   <nasa>/lroc_color_poles_4k.tif                     LRO LROC WAC colour mosaic of the Moon (NASA SVS 4720)
//   <sss>/2k_earth_normal_map.tif, 2k_earth_specular_map.tif, 2k_mercury.jpg, 2k_venus_atmosphere.jpg,
//   <sss>/8k_mars.jpg, 8k_jupiter.jpg, 2k_saturn.jpg, 2k_saturn_ring_alpha.png, 2k_uranus.jpg, 2k_neptune.jpg
//                                                      https://www.solarsystemscope.com/textures/ (CC BY 4.0)
//
// Output is KTX2 with Basis ETC1S supercompression (every GPU transcodes it),
// mipmapped, Y-flipped so the north pole is v = 1 on a Three.js sphere.
// Budget: every texture together under 6 MB (checked at the end).

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { encodeToKTX2 } from "ktx2-encoder";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const NASA = opt("nasa"), SSS = opt("sss");
const ONLY = opt("only", "").split(",").filter(Boolean);
if (!NASA || !SSS) {
  console.error("usage: node scripts/build-cosmos-textures.mjs --nasa <dir> --sss <dir> [--only a,b]");
  process.exit(1);
}
const OUT = path.resolve("public/cosmos/tex");
mkdirSync(OUT, { recursive: true });
sharp.cache(false);
sharp.concurrency(2);

// name → { src, width, kind, quality }
//   kind: "color" (sRGB photo), "data" (linear: masks), "normal" (tangent-space normal map), "alpha" (RGBA, sRGB)
const JOBS = [
  { name: "earth-day", src: `${NASA}/world.topo.bathy.200407.3x21600x10800.jpg`, width: 4096, kind: "color", quality: 200 },
  { name: "earth-night", src: `${NASA}/BlackMarble_2016_3km.jpg`, width: 4096, kind: "color", quality: 160, night: true },
  { name: "earth-clouds", src: `${NASA}/cloud_combined_8192.tif`, width: 2048, kind: "data", quality: 160 },
  { name: "earth-normal", src: `${SSS}/2k_earth_normal_map.tif`, width: 2048, kind: "normal", quality: 180 },
  { name: "earth-specular", src: `${SSS}/2k_earth_specular_map.tif`, width: 1024, kind: "data", quality: 128 },
  { name: "moon", src: `${NASA}/lroc_color_poles_4k.tif`, width: 2048, kind: "color", quality: 180 },
  { name: "mercury", src: `${SSS}/2k_mercury.jpg`, width: 1024, kind: "color", quality: 160 },
  { name: "venus", src: `${SSS}/2k_venus_atmosphere.jpg`, width: 1024, kind: "color", quality: 160 },
  { name: "mars", src: `${SSS}/8k_mars.jpg`, width: 2048, kind: "color", quality: 180 },
  { name: "jupiter", src: `${SSS}/8k_jupiter.jpg`, width: 2048, kind: "color", quality: 180 },
  { name: "saturn", src: `${SSS}/2k_saturn.jpg`, width: 2048, kind: "color", quality: 180 },
  { name: "saturn-ring", src: `${SSS}/2k_saturn_ring_alpha.png`, width: 2048, height: 128, kind: "alpha", quality: 200 },
  { name: "uranus", src: `${SSS}/2k_uranus.jpg`, width: 1024, kind: "color", quality: 128 },
  { name: "neptune", src: `${SSS}/2k_neptune.jpg`, width: 1024, kind: "color", quality: 128 },
];

const imageDecoder = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

async function build(job) {
  const t0 = Date.now();
  const height = job.height ?? job.width / 2;
  let img = sharp(job.src, { limitInputPixels: false }).rotate();
  if (job.night) {
    // Black Marble: lift the faint towns a little and clamp the blown-out
    // cores, so the lights read at 4k without the big cities burning white.
    img = img.linear(1.15, -4).gamma(1.0, 1.1);
  }
  if (job.kind === "data") img = img.grayscale();
  img = img.resize(job.width, height, { fit: "fill", kernel: "lanczos3" });
  const png = await (job.kind === "alpha" ? img.ensureAlpha() : img.removeAlpha()).png({ compressionLevel: 1 }).toBuffer();
  const ktx2 = await encodeToKTX2(new Uint8Array(png), {
    isUASTC: false,
    generateMipmap: true,
    isYFlip: true,
    enableSRGB: job.kind === "color" || job.kind === "alpha",
    isNormalMap: job.kind === "normal",
    qualityLevel: job.quality,
    compressionLevel: 2,
    imageDecoder,
  });
  const out = path.join(OUT, `${job.name}.ktx2`);
  writeFileSync(out, ktx2);
  console.log(`${job.name.padEnd(16)} ${job.width}×${height}  ${(ktx2.length / 1024).toFixed(0).padStart(5)} kB  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

for (const job of JOBS) {
  if (ONLY.length && !ONLY.includes(job.name)) continue;
  await build(job);
}

let total = 0;
for (const job of JOBS) {
  try { total += statSync(path.join(OUT, `${job.name}.ktx2`)).size; } catch { /* not built in this run */ }
}
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB (budget 6 MB)`);
if (total > 6 * 1024 * 1024) process.exitCode = 2;

// Keep the licence next to the files.
writeFileSync(path.join(OUT, "..", "TEXTURES-LICENSE.md"), readFileSync(new URL("./cosmos-textures-license.md", import.meta.url)));
