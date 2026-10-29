// The journey: one camera, one direction — out. From low Earth orbit past
// the Moon, to the first orbits, past Mars, Jupiter, Saturn, Uranus and
// Neptune, to the edge of the system, out through the stars to a view of
// the Galaxy, then back to the blue dot. Pure data and maths (no Three.js)
// so it can be unit-tested; the engine turns keys into camera poses in the
// ecliptic frame, with the real positions of the day.
//
// Two lists: JOURNEY is the page's sections (one per waypoint, with the
// scroll length of the flight after each), KEYS is the camera's path —
// every section is a key where the camera stands while the section is
// read, and between sections there are fly-by keys (a planet filling a
// third of the screen) so the camera always passes something new.

import { EARTH_RADIUS_AU, LY_AU, MOON_RADIUS_KM, AU_KM, PLANET_BY_ID, type Vec3 } from "./ephemeris";

export type WaypointId =
  | "hero" | "liftoff"
  | "y2032" | "y2044" | "y2051" | "y2070"
  | "forWhom" | "how" | "guardians" | "statement" | "atmospheres" | "security" | "pricing" | "faq"
  | "galaxy" | "home";

/** What a key is placed against (its world position comes from the ephemeris). */
export type Anchor =
  | "earth"      // the Earth, wherever its orbits have taken it
  | "earthNow"   // where the Earth is today (it is back there after every whole orbit)
  | "moon" | "sun"
  | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune"
  | "galaxy";    // a point between the Sun and the Galaxy's centre

/**
 * The frame a direction (lat, lon) is given in:
 *  - bodySun: lon 0 = the anchor's noon side (toward the Sun), 180 = midnight; lat toward ecliptic north
 *  - earthMoon: lon 0 = from the Earth toward the Moon
 *  - ecliptic: lon from the vernal equinox, lat toward ecliptic north
 *  - galactic: lat/lon in the galactic frame (lon 0 = the centre)
 */
export type Frame = "bodySun" | "earthMoon" | "ecliptic" | "galactic";

export interface Direction { frame: Frame; lat: number; lon: number }

/** Where the camera looks: at an anchor, or along a fixed direction (the stars streaming past). */
export type Look = { at: Anchor } | Direction;

export interface Key {
  /** Journey progress this key sits at: whole numbers are sections, fractions are fly-bys. */
  at: number;
  /** Shown in the ?perf=1 overlay. */
  label: string;
  anchor: Anchor;
  /** Camera distance from the anchor, au. */
  dist: number;
  /** Direction from the anchor to the camera. */
  dir: Direction;
  look: Look;
  /** Where the looked-at point sits on screen, NDC (−1..1): desktop and phone. */
  offset: [number, number];
  offsetPhone: [number, number];
  up: "pole" | "ecliptic" | "galactic" | "centre";
  /** Earth orbits travelled since today (the trail's length). */
  orbits: number;
  /** The Earth's trail of orbits is shown at this key. */
  trail?: boolean;
  /** Scene brightness 0..1 (Security dims). */
  dim: number;
  /** Catalogue stars' brightness 0..1. */
  stars: number;
}

export interface JourneySection {
  id: WaypointId;
  /** The flight after this section, in small-viewport heights (desktop / phone). */
  leg: number;
  legPhone: number;
}

const R = EARTH_RADIUS_AU;
const MOON_R = MOON_RADIUS_KM / AU_KM;
const radius = (id: "mars" | "jupiter" | "saturn" | "uranus" | "neptune") => PLANET_BY_ID[id].radiusKm / AU_KM;

export const JOURNEY: JourneySection[] = [
  { id: "hero", leg: 170, legPhone: 150 },
  { id: "liftoff", leg: 200, legPhone: 170 },
  { id: "y2032", leg: 200, legPhone: 170 },
  { id: "y2044", leg: 200, legPhone: 170 },
  { id: "y2051", leg: 260, legPhone: 220 },
  { id: "y2070", leg: 160, legPhone: 140 },
  { id: "forWhom", leg: 90, legPhone: 80 },
  { id: "how", leg: 90, legPhone: 80 },
  { id: "guardians", leg: 90, legPhone: 80 },
  { id: "statement", leg: 80, legPhone: 70 },
  { id: "atmospheres", leg: 80, legPhone: 70 },
  { id: "security", leg: 70, legPhone: 60 },
  { id: "pricing", leg: 70, legPhone: 60 },
  { id: "faq", leg: 150, legPhone: 130 },
  { id: "galaxy", leg: 120, legPhone: 100 },
  { id: "home", leg: 0, legPhone: 0 },
];

export const WAYPOINTS = JOURNEY.map((s) => s.id);
export const indexOf = (id: WaypointId) => WAYPOINTS.indexOf(id);

/**
 * The planets are arranged on the flight line: each at its real distance
 * from the Sun, on its real orbit, but at a heliocentric longitude a few
 * degrees to one side or the other of the Earth's — so the camera flies one
 * straight way out and passes them on alternating sides. (Their longitudes
 * of the day would ask for turns of 100–150° between Jupiter, Saturn, Uranus
 * and Neptune.) Degrees east of the Earth; the stops alternate text sides.
 */
export const ARRANGED_LON: Record<"mars" | "jupiter" | "saturn" | "uranus" | "neptune", number> = {
  mars: 7, jupiter: -7, saturn: 7, uranus: -7, neptune: 7,
};
/** The Moon's place in the Earth's noon frame (lat, lon): a gibbous Moon over the night side, the same every day. */
export const MOON_DIR: Direction = { frame: "bodySun", lat: -6, lon: 228 };

/** Stops: which side the planet is on (the text takes the other). */
export const STOP_SIDE: Record<"y2032" | "y2044" | "y2051" | "y2070", "left" | "right"> = { y2032: "right", y2044: "left", y2051: "right", y2070: "left" };

// A stop's planet fills about half the screen's height (4.6 radii at a 50° field); fly-bys the same.
const NEAR = 4.6;
/** Where the finale flies: away from the Sun along the Earth's outward line, bending down toward the Galaxy's south pole so the disc is seen from outside. */
const OUT = (lat: number, lon: number): Direction => ({ frame: "galactic", lat, lon });

// Tempo slows with the year; the Galaxy is the slowest.
export const KEYS: Key[] = [
  { at: 0, label: "Hero · Země z oběžné dráhy", anchor: "earth", dist: 3.6 * R, dir: { frame: "bodySun", lat: 12, lon: 112 }, look: { at: "earth" },
    offset: [0.5, -0.08], offsetPhone: [0.1, -0.5], up: "pole", orbits: 0, dim: 1, stars: 0.4 },
  { at: 1, label: "Odlet · Měsíc", anchor: "moon", dist: 5.2 * MOON_R, dir: { frame: "bodySun", lat: 10, lon: 69 }, look: { at: "moon" },
    offset: [-0.42, -0.04], offsetPhone: [0, 0.32], up: "ecliptic", orbits: 0, dim: 1, stars: 0.55 },
  { at: 2, label: "2032 · Mars · 6 oběhů", anchor: "mars", dist: NEAR * radius("mars"), dir: { frame: "bodySun", lat: 8, lon: 26 }, look: { at: "mars" },
    offset: [0.46, -0.08], offsetPhone: [0, -0.48], up: "ecliptic", orbits: 6, trail: true, dim: 1, stars: 0.8 },
  { at: 3, label: "2044 · Jupiter · 18 oběhů", anchor: "jupiter", dist: NEAR * radius("jupiter"), dir: { frame: "bodySun", lat: 8, lon: -26 }, look: { at: "jupiter" },
    offset: [-0.46, -0.08], offsetPhone: [0, -0.48], up: "ecliptic", orbits: 18, trail: true, dim: 1, stars: 0.8 },
  { at: 4, label: "2051 · Saturn · 25 oběhů", anchor: "saturn", dist: 5.6 * radius("saturn"), dir: { frame: "bodySun", lat: 20, lon: 28 }, look: { at: "saturn" },
    offset: [0.42, -0.08], offsetPhone: [0, -0.46], up: "ecliptic", orbits: 25, trail: true, dim: 1, stars: 0.8 },
  { at: 4.55, label: "Průlet · Uran", anchor: "uranus", dist: NEAR * radius("uranus"), dir: { frame: "bodySun", lat: 8, lon: 56 }, look: { at: "uranus" },
    offset: [-0.34, 0.04], offsetPhone: [0, 0.3], up: "ecliptic", orbits: 25, dim: 1, stars: 0.85 },
  { at: 5, label: "2070 · Neptun · 44 oběhů", anchor: "neptune", dist: 4.2 * radius("neptune"), dir: { frame: "bodySun", lat: 8, lon: 54 }, look: { at: "neptune" },
    offset: [-0.46, -0.08], offsetPhone: [0, -0.48], up: "ecliptic", orbits: 44, trail: true, dim: 1, stars: 0.85 },
  // The finale: out of the system, the Sun behind becoming a star; one way, no turning back until the Galaxy.
  { at: 6, label: "Pro koho · Slunce se stává hvězdou", anchor: "sun", dist: 1800, dir: OUT(-36, 140), look: { at: "sun" },
    offset: [-0.35, 0.15], offsetPhone: [0, 0.35], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 7, label: "Jak to funguje · let hvězdami", anchor: "sun", dist: 3 * LY_AU, dir: OUT(-42, 142), look: { at: "sun" },
    offset: [0.3, 0.1], offsetPhone: [0, 0.3], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 8, label: "Strážci · 40 světelných let", anchor: "sun", dist: 40 * LY_AU, dir: OUT(-48, 144), look: { at: "sun" },
    offset: [-0.3, 0], offsetPhone: [0, 0.3], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 9, label: "Některá slova · 400 světelných let", anchor: "sun", dist: 400 * LY_AU, dir: OUT(-54, 146), look: { at: "sun" },
    offset: [0, 0.1], offsetPhone: [0, 0.2], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 10, label: "Atmosféry · pod diskem", anchor: "sun", dist: 2500 * LY_AU, dir: OUT(-60, 148), look: { at: "sun" },
    offset: [0.3, 0.2], offsetPhone: [0, 0.4], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 11, label: "Bezpečnost (kamera stojí)", anchor: "sun", dist: 9000 * LY_AU, dir: OUT(-66, 150), look: { at: "sun" },
    offset: [0.35, 0.3], offsetPhone: [0.2, 0.55], up: "centre", orbits: 44, dim: 0.5, stars: 0.6 },
  { at: 12, label: "Ceník · 22 000 světelných let", anchor: "sun", dist: 22_000 * LY_AU, dir: OUT(-72, 153), look: { at: "sun" },
    offset: [-0.35, 0.3], offsetPhone: [-0.3, 0.6], up: "centre", orbits: 44, dim: 0.9, stars: 1 },
  { at: 13, label: "FAQ · 38 000 světelných let", anchor: "sun", dist: 38_000 * LY_AU, dir: OUT(-78, 156), look: { at: "sun" },
    offset: [0.3, 0.25], offsetPhone: [0.2, 0.55], up: "centre", orbits: 44, dim: 0.9, stars: 1 },
  { at: 14, label: "Mléčná dráha · pohled zvenčí", anchor: "galaxy", dist: 56_000 * LY_AU, dir: OUT(-84, 160), look: { at: "galaxy" },
    offset: [0, 0.08], offsetPhone: [0, 0.1], up: "centre", orbits: 44, dim: 1, stars: 0 },
  { at: 15, label: "Závěr · zpátky k modré tečce", anchor: "earthNow", dist: 5.2 * R, dir: { frame: "bodySun", lat: 12, lon: 42 }, look: { at: "earthNow" },
    offset: [0.5, -0.18], offsetPhone: [0.1, -0.66], up: "pole", orbits: 0, dim: 1, stars: 0.5 },
];

/** The key of a section (for stills and labels). */
export const keyOf = (id: WaypointId) => KEYS.find((k) => k.at === indexOf(id))!;

/** The two keys around progress s and the raw fraction between them. */
export function segmentAt(s: number): { i: number; f: number } {
  const n = KEYS.length;
  if (s <= KEYS[0].at) return { i: 0, f: 0 };
  for (let i = 0; i < n - 1; i++) {
    if (s < KEYS[i + 1].at) return { i, f: (s - KEYS[i].at) / (KEYS[i + 1].at - KEYS[i].at) };
  }
  return { i: n - 2, f: 1 };
}

/** Where the camera "reads" the page: this far down the viewport. */
export const READING_LINE = 0.5;

export interface WaypointMark {
  top: number;
  legStart: number;
}

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** power2.inOut — the camera's easing family. */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/**
 * The flight's easing: power2.inOut, then flattened further at both ends
 * (rate 0.4 of linear), so that the last e-folds of an approach — where the
 * planet is big on screen — take most of the hop's scroll, and the first
 * ones — where it is a speck — go by quickly.
 */
export const flightEase = (f: number) => { const u = easeInOut(f); return u - (0.8 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI); };
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Reading position → journey progress s ∈ [0, n−1]. While the reading line
 * is inside section i's content the camera holds at key i (s = i); across
 * its leg — up to where section i+1 starts — it flies to i+1 (through the
 * fly-by keys in between).
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

/** How far the reading line is through the current section's content (0..1); 0 while flying. */
export function holdAt(marks: WaypointMark[], y: number): number {
  const n = marks.length;
  if (n === 0 || y <= marks[0].top) return 0;
  for (let i = 0; i < n; i++) {
    const next = i + 1 < n ? marks[i + 1].top : Infinity;
    if (y < next) {
      const legStart = Math.min(marks[i].legStart, next);
      if (y > legStart) return 0;
      return clamp01((y - marks[i].top) / Math.max(1, legStart - marks[i].top));
    }
  }
  return 0;
}

/** The inverse: the reading position that puts the camera at progress s (used by the capture scripts). */
export function scrollForProgress(marks: WaypointMark[], s: number): number {
  const n = marks.length;
  if (n === 0) return 0;
  const i = Math.min(n - 1, Math.max(0, Math.floor(s)));
  if (i >= n - 1) return marks[n - 1].top;
  const f = s - i;
  const next = marks[i + 1].top;
  const legStart = Math.min(marks[i].legStart, next);
  if (f <= 0) return marks[i].top;
  return legStart + (next - legStart) * f;
}

/** The window of a key segment in which the Earth goes round and the trail fades in: after a fly-by, before the stop. */
const RUN_FROM = 0.35, RUN_TO = 0.85;

/**
 * Earth orbits travelled at progress s: holds at each key, and on the way
 * to a stop the Earth goes round while the camera is already well away
 * from it (never up close).
 */
export function orbitsAt(s: number): number {
  const { i, f } = segmentAt(s);
  const a = KEYS[i].orbits, b = KEYS[i + 1].orbits;
  if (a === b) return a;
  return a + (b - a) * easeInOut(clamp01((f - RUN_FROM) / (RUN_TO - RUN_FROM)));
}

/** The trail's opacity at progress s: it comes in with the orbits before a stop, holds there, and goes as the camera leaves. */
export function trailFadeAt(s: number): number {
  const { i, f } = segmentAt(s);
  const from = KEYS[i].trail === true, to = KEYS[i + 1].trail === true;
  if (from && to) return 1;
  if (to) return smoothstep(RUN_FROM, RUN_TO, f);
  if (from) return 1 - smoothstep(0, 0.35, f);
  return 0;
}

/**
 * Where along the straight line from key A to key B the camera is at eased
 * fraction u, given each end's distance from its anchor as a fraction of
 * the line (xa, xb). The camera moves at a speed proportional to its
 * distance from the nearer anchor — an exponential zoom out of A that hands
 * over, at matched speed, to an exponential zoom into B — so a planet 1 au
 * away grows on screen at a steady pace instead of appearing in the last
 * percent, and the Earth shrinks evenly behind.
 */
export function bilog(u: number, xa: number, xb: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  // Keys that sit close to their anchors relative to the hop (both within half the line) need no zoom
  // profile at all: capped at a half, the curve is nearly linear.
  const a = Math.min(0.5, Math.max(1e-9, xa)), b = Math.min(0.5, Math.max(1e-9, xb));
  const wStar = (1 + b - a) / 2;                                   // where the two profiles move at the same speed
  const la = Math.log(wStar / a + 1), lb = Math.log((1 - wStar) / b + 1);
  const c = la + lb, uStar = la / c;
  return u <= uStar ? a * (Math.exp(c * u) - 1) : 1 - b * (Math.exp(c * (1 - u)) - 1);
}

/**
 * The hop from p1 to p2 as a cubic Hermite curve whose end tangents point
 * along the bisectors of the neighbouring hops (p0 → p1 → p2 → p3), with a
 * bounded magnitude: the camera rounds every key instead of kinking at it,
 * and the curve never strays more than a small fraction of the hop from its
 * chord — whatever the ratio of the hops, which here spans ten orders of
 * magnitude (a plain Catmull-Rom would bulge or cusp there).
 */
export function roundedHop(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a: Vec3): Vec3 => { const l = len(a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };
  const chord = sub(p2, p1);
  const L = len(chord);
  if (L === 0) return p1;
  const out = unit(chord);
  const inA = unit(sub(p1, p0)), outB = unit(sub(p3, p2));
  // Tangent directions: the bisector of in/out at each end (the chord itself where there is no neighbour).
  const mA = unit(len(inA) > 0 ? [inA[0] + out[0], inA[1] + out[1], inA[2] + out[2]] : out);
  const mB = unit(len(outB) > 0 ? [out[0] + outB[0], out[1] + outB[1], out[2] + outB[2]] : out);
  const k = 0.5 * L;   // tangent magnitude: a gentle curve, bounded well inside the hop
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const r: Vec3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) r[c] = h00 * p1[c] + h10 * k * mA[c] + h01 * p2[c] + h11 * k * mB[c];
  return r;
}

/** Distance interpolated on a log scale — the camera "zooms", never jumps. */
export function logLerp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** Year shown at a stop (the sample messages are written in WRITTEN_IN). */
export const WRITTEN_IN = 2026;
export const STOP_YEARS: Record<"y2032" | "y2044" | "y2051" | "y2070", number> = { y2032: 2032, y2044: 2044, y2051: 2051, y2070: 2070 };
