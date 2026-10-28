// The star catalogue behind the landing — HYG v4.4, quantised to 8 bytes per
// star by scripts/build-sky-catalog.mjs (see the layout there). Positions are
// parsecs in the equatorial J2000 frame, with the Sun at the origin.

// Emitted by the bundler as a hashed, immutable /_next/static asset — cached
// forever and outside the proxy's matcher.
export const CATALOG_URL = new URL("./stars.bin", import.meta.url).href;

/** Fixed indices: the Sun, then the four stops of the journey. */
export const SUN = 0;
export const STOP_STARS = { barnard: 1, gliese251: 2, vega: 3, titawin: 4 } as const;

export interface Catalog {
  count: number;
  /** x, y, z per star (parsecs) */
  positions: Float32Array;
  absMag: Float32Array;
  /** B−V colour index */
  colorIndex: Float32Array;
}

export function decodeCatalog(buffer: ArrayBuffer): Catalog {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== "ARSK" || view.getUint16(4, true) !== 1) throw new Error("Unknown star catalogue format");
  const count = view.getUint32(8, true);
  if (buffer.byteLength < 16 + count * 8) throw new Error("Truncated star catalogue");

  const positions = new Float32Array(count * 3);
  const absMag = new Float32Array(count);
  const colorIndex = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = 16 + i * 8;
    const logD = view.getUint16(o + 4, true);
    absMag[i] = view.getUint8(o + 6) * 0.11 - 10;
    colorIndex[i] = view.getUint8(o + 7) * 0.01 - 0.5;
    if (i === SUN) continue; // stays at the origin
    // Octahedral decode → unit direction, then scale by the distance.
    const u = (view.getUint16(o, true) / 65535) * 2 - 1;
    const v = (view.getUint16(o + 2, true) / 65535) * 2 - 1;
    let x = u, y = v;
    const z = 1 - Math.abs(u) - Math.abs(v);
    if (z < 0) {
      x = (1 - Math.abs(v)) * Math.sign(u || 1);
      y = (1 - Math.abs(u)) * Math.sign(v || 1);
    }
    const d = Math.pow(10, (logD / 65535) * 5 - 1) / Math.hypot(x, y, z);
    positions[i * 3] = x * d;
    positions[i * 3 + 1] = y * d;
    positions[i * 3 + 2] = z * d;
  }
  return { count, positions, absMag, colorIndex };
}

export async function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  const res = await fetch(CATALOG_URL, { signal });
  if (!res.ok) throw new Error(`Star catalogue: HTTP ${res.status}`);
  return decodeCatalog(await res.arrayBuffer());
}
