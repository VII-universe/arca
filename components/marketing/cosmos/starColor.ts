// Star colour from the catalogue's B–V colour index.
// B–V → effective temperature: Ballesteros (2012), EPL 97 34008.
// Temperature → sRGB: Tanner Helland's blackbody fit (good to ~1% in 1000–40000 K).
// Real stars look much whiter to the eye than their blackbody colour, so the
// result is pulled toward white — enough to read as "warm" or "cool", never neon.

export type RGB = [number, number, number];

export function bvToKelvin(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

export function kelvinToRgb(kelvin: number): RGB {
  const t = kelvin / 100;
  const clamp = (v: number) => Math.min(255, Math.max(0, v)) / 255;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)];
}

/** Perceived star colour (0..1 RGB), pulled toward white by `whiten`. */
export function starColor(bv: number, whiten = 0.35): RGB {
  const [r, g, b] = kelvinToRgb(bvToKelvin(Math.max(-0.4, Math.min(2.0, bv))));
  return [r + (1 - r) * whiten, g + (1 - g) * whiten, b + (1 - b) * whiten];
}

