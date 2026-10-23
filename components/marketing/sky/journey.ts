// The journey: one camera through one sky, one waypoint per section of the
// page. Pure data and maths (no Three.js) so it can be unit-tested; the
// engine turns waypoints into camera poses.

export type WaypointId =
  | "earth" | "liftoff"
  | "barnard" | "gliese251" | "vega" | "titawin"
  | "forWhom" | "howItWorks" | "guardians" | "atmospheres" | "security" | "pricing" | "faq"
  | "home";

export interface JourneySection {
  id: WaypointId;
  /** Shown only in the ?perf=1 overlay. */
  label: string;
  /** Section height in small-viewport heights (desktop / phone). */
  vh: number;
  vhPhone: number;
  /** Share of the section during which the camera holds at its waypoint before moving on. */
  hold: number;
}

// Tempo slows with the year: each leg is longer than the one before, and the
// last stop ("until I'm gone") holds the longest.
export const JOURNEY: JourneySection[] = [
  { id: "earth", label: "Hero · Země", vh: 110, vhPhone: 100, hold: 0.25 },
  { id: "liftoff", label: "Odlet", vh: 90, vhPhone: 70, hold: 0 },
  { id: "barnard", label: "2032 · Barnardova hvězda · 6 ly", vh: 170, vhPhone: 130, hold: 0.4 },
  { id: "gliese251", label: "2044 · Gliese 251 · 18 ly", vh: 190, vhPhone: 140, hold: 0.4 },
  { id: "vega", label: "2051 · Vega · 25 ly", vh: 210, vhPhone: 155, hold: 0.42 },
  { id: "titawin", label: "2070 · Titawin · 44 ly", vh: 260, vhPhone: 190, hold: 0.5 },
  { id: "forWhom", label: "Pro koho", vh: 140, vhPhone: 120, hold: 0.3 },
  { id: "howItWorks", label: "Jak to funguje", vh: 160, vhPhone: 130, hold: 0.3 },
  { id: "guardians", label: "Strážci", vh: 140, vhPhone: 120, hold: 0.3 },
  { id: "atmospheres", label: "Atmosféry", vh: 120, vhPhone: 110, hold: 0.3 },
  { id: "security", label: "Bezpečnost (kamera stojí)", vh: 130, vhPhone: 120, hold: 0.6 },
  { id: "pricing", label: "Ceník", vh: 120, vhPhone: 110, hold: 0.3 },
  { id: "faq", label: "FAQ", vh: 120, vhPhone: 110, hold: 0.3 },
  { id: "home", label: "Závěr · pohled domů", vh: 110, vhPhone: 100, hold: 0 },
];

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** power2.inOut — the camera's easing family. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Scroll position → journey progress s ∈ [0, n−1]: the integer part is the
 * section whose waypoint the camera is leaving, the fraction how far along
 * the leg to the next one (0 during that section's hold, not yet eased).
 * `tops` are the sections' document offsets, ascending.
 */
export function progressAt(tops: number[], holds: number[], scrollY: number): number {
  const n = tops.length;
  if (n === 0) return 0;
  if (scrollY <= tops[0]) return 0;
  for (let i = 0; i < n - 1; i++) {
    if (scrollY < tops[i + 1]) {
      const f = (scrollY - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
      return i + clamp01((f - holds[i]) / Math.max(1e-6, 1 - holds[i]));
    }
  }
  return n - 1;
}

/** Waypoint index the reader is "at" (for reduced motion, which cuts instead of flying). */
export function nearestWaypoint(s: number): number {
  return Math.round(s);
}

/**
 * Position along a leg of length L whose ends sit r0a and r0b from the stars
 * at either end: distance grows exponentially when leaving and shrinks
 * exponentially when arriving, so the 1 : 10 000 scale between cruising and
 * arriving stays continuous. Returns the travelled fraction of L, exactly
 * 0 at u = 0 and 1 at u = 1, monotonic in between.
 */
export function logLeg(u: number, L: number, r0a: number, r0b: number): number {
  if (L <= 0) return u;
  const a = Math.max(1e-9, Math.min(r0a, L));
  const b = Math.max(1e-9, Math.min(r0b, L));
  const sigma = (t: number) => {
    const dA = a * Math.pow(L / a, t);
    const dB = b * Math.pow(L / b, 1 - t);
    return dA / (dA + dB);
  };
  const s0 = sigma(0), s1 = sigma(1);
  return (sigma(u) - s0) / (s1 - s0);
}

/** How strongly a stop star shows as a corona at distance d (parsecs): 0 far → 1 at the stop. */
export function coronaNearness(d: number, stop = 0.0007, far = 0.25): number {
  return clamp01(Math.log(far / Math.max(d, 1e-9)) / Math.log(far / stop));
}
