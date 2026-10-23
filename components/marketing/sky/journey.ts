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
  /**
   * Length of the flight to the next waypoint, in small-viewport heights
   * (desktop / phone). The camera holds at its waypoint for as long as the
   * section's content takes to read, then flies during this stretch — never
   * more than a screen with nothing to read.
   */
  leg: number;
  legPhone: number;
}

// Tempo slows with the year: each leg between the stars is a little longer
// than the one before. After the journey the hops are short.
export const JOURNEY: JourneySection[] = [
  { id: "earth", label: "Hero · Země", leg: 45, legPhone: 35 },
  { id: "liftoff", label: "Odlet", leg: 60, legPhone: 50 },
  { id: "barnard", label: "2032 · Barnardova hvězda · 6 ly", leg: 50, legPhone: 40 },
  { id: "gliese251", label: "2044 · Gliese 251 · 18 ly", leg: 55, legPhone: 45 },
  { id: "vega", label: "2051 · Vega · 25 ly", leg: 60, legPhone: 50 },
  { id: "titawin", label: "2070 · Titawin · 44 ly", leg: 40, legPhone: 35 },
  { id: "forWhom", label: "Pro koho", leg: 25, legPhone: 20 },
  { id: "howItWorks", label: "Jak to funguje", leg: 25, legPhone: 20 },
  { id: "guardians", label: "Strážci", leg: 25, legPhone: 20 },
  { id: "atmospheres", label: "Atmosféry", leg: 20, legPhone: 15 },
  { id: "security", label: "Bezpečnost (kamera stojí)", leg: 20, legPhone: 15 },
  { id: "pricing", label: "Ceník", leg: 15, legPhone: 10 },
  { id: "faq", label: "FAQ", leg: 15, legPhone: 10 },
  { id: "home", label: "Závěr · pohled domů", leg: 0, legPhone: 0 },
];

/** Where the camera "reads" the page: this far down the viewport. */
export const READING_LINE = 0.5;

/** A waypoint's place on the page: where its section starts and where its flight starts. */
export interface WaypointMark {
  top: number;
  legStart: number;
}

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** power2.inOut — the camera's easing family. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Reading position → journey progress s ∈ [0, n−1]. While the reading line
 * is inside section i's content the camera holds at waypoint i (s = i);
 * across its leg — up to where section i+1 starts — it flies to i+1
 * (s = i + fraction, not yet eased). `y` is the document position of the
 * reading line (scrollY + READING_LINE × viewport height).
 */
export function progressAt(marks: WaypointMark[], y: number): number {
  const n = marks.length;
  if (n === 0 || y <= marks[0].top) return 0;
  for (let i = 0; i < n - 1; i++) {
    const next = marks[i + 1].top;
    if (y < next) {
      const legStart = Math.min(marks[i].legStart, next);
      if (y <= legStart) return i;
      return i + clamp01((y - legStart) / Math.max(1, next - legStart));
    }
  }
  return n - 1;
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
