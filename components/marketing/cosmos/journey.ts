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

import { EARTH_RADIUS_AU, LY_AU, MOON_RADIUS_KM, AU_KM, PLANET_BY_ID } from "./ephemeris";

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
/** A planet fills a third of the screen (its disc ~23° tall at a 50° field) from this many radii. */
const PASS = 5.5;
/** The flight ray out of the system: toward galactic north, leaning to the centre — it ends above the disc, the Sun low. */
const RAY: Direction = { frame: "galactic", lat: 78, lon: 348 };

export const JOURNEY: JourneySection[] = [
  { id: "hero", leg: 100, legPhone: 90 },
  { id: "liftoff", leg: 110, legPhone: 100 },
  { id: "y2032", leg: 150, legPhone: 130 },
  { id: "y2044", leg: 150, legPhone: 130 },
  { id: "y2051", leg: 220, legPhone: 190 },
  { id: "y2070", leg: 110, legPhone: 90 },
  { id: "forWhom", leg: 90, legPhone: 80 },
  { id: "how", leg: 90, legPhone: 80 },
  { id: "guardians", leg: 90, legPhone: 80 },
  { id: "statement", leg: 80, legPhone: 70 },
  { id: "atmospheres", leg: 80, legPhone: 70 },
  { id: "security", leg: 70, legPhone: 60 },
  { id: "pricing", leg: 70, legPhone: 60 },
  { id: "faq", leg: 100, legPhone: 90 },
  { id: "galaxy", leg: 120, legPhone: 100 },
  { id: "home", leg: 0, legPhone: 0 },
];

export const WAYPOINTS = JOURNEY.map((s) => s.id);
export const indexOf = (id: WaypointId) => WAYPOINTS.indexOf(id);

// Tempo slows with the year; the Galaxy is the slowest.
export const KEYS: Key[] = [
  { at: 0, label: "Hero · Země z oběžné dráhy", anchor: "earth", dist: 3.6 * R, dir: { frame: "bodySun", lat: 12, lon: 112 }, look: { at: "earth" },
    offset: [0.5, -0.08], offsetPhone: [0.1, -0.5], up: "pole", orbits: 0, dim: 1, stars: 0.4 },
  { at: 0.5, label: "Průlet · Měsíc", anchor: "moon", dist: PASS * MOON_R, dir: { frame: "bodySun", lat: 16, lon: 38 }, look: { at: "moon" },
    offset: [0.26, -0.08], offsetPhone: [0, 0.22], up: "ecliptic", orbits: 0, dim: 1, stars: 0.5 },
  { at: 1, label: "Odlet · Měsíc v popředí, Země za ním", anchor: "moon", dist: 11 * MOON_R, dir: { frame: "earthMoon", lat: 6, lon: 22 }, look: { at: "earthNow" },
    offset: [-0.02, 0.1], offsetPhone: [-0.2, 0.3], up: "ecliptic", orbits: 0, dim: 1, stars: 0.55 },
  { at: 2, label: "2032 · 6 oběhů", anchor: "earthNow", dist: 0.7, dir: { frame: "bodySun", lat: 40, lon: 96 }, look: { at: "earthNow" },
    offset: [0.08, -0.34], offsetPhone: [0, -0.46], up: "ecliptic", orbits: 6, trail: true, dim: 1, stars: 0.9 },
  { at: 2.5, label: "Průlet · Mars", anchor: "mars", dist: PASS * radius("mars"), dir: { frame: "bodySun", lat: 12, lon: 44 }, look: { at: "mars" },
    offset: [0.28, 0], offsetPhone: [0, 0.26], up: "ecliptic", orbits: 6, dim: 1, stars: 0.9 },
  { at: 3, label: "2044 · 18 oběhů", anchor: "sun", dist: 2.7, dir: { frame: "ecliptic", lat: 42, lon: 112 }, look: { at: "earthNow" },
    offset: [0.1, -0.3], offsetPhone: [0, -0.45], up: "ecliptic", orbits: 18, trail: true, dim: 1, stars: 0.9 },
  { at: 3.5, label: "Průlet · Jupiter", anchor: "jupiter", dist: PASS * radius("jupiter"), dir: { frame: "bodySun", lat: 8, lon: 50 }, look: { at: "jupiter" },
    offset: [-0.26, 0.04], offsetPhone: [0, 0.26], up: "ecliptic", orbits: 18, dim: 1, stars: 0.9 },
  { at: 4, label: "2051 · 25 oběhů", anchor: "sun", dist: 5.2, dir: { frame: "ecliptic", lat: 40, lon: 75 }, look: { at: "earthNow" },
    offset: [0.1, -0.3], offsetPhone: [0, -0.45], up: "ecliptic", orbits: 25, trail: true, dim: 1, stars: 0.9 },
  { at: 4.4, label: "Průlet · Saturn", anchor: "saturn", dist: PASS * radius("saturn"), dir: { frame: "bodySun", lat: 24, lon: 55 }, look: { at: "saturn" },
    offset: [0.22, -0.04], offsetPhone: [0, 0.24], up: "ecliptic", orbits: 25, dim: 1, stars: 0.9 },
  { at: 4.65, label: "Průlet · Uran", anchor: "uranus", dist: PASS * radius("uranus"), dir: { frame: "bodySun", lat: 10, lon: 40 }, look: { at: "uranus" },
    offset: [-0.3, 0.05], offsetPhone: [0, 0.26], up: "ecliptic", orbits: 25, dim: 1, stars: 0.9 },
  { at: 4.85, label: "Průlet · Neptun", anchor: "neptune", dist: PASS * radius("neptune"), dir: { frame: "bodySun", lat: 14, lon: 45 }, look: { at: "neptune" },
    offset: [0.3, 0], offsetPhone: [0, 0.26], up: "ecliptic", orbits: 25, dim: 1, stars: 0.9 },
  { at: 5, label: "2070 · 44 oběhů · okraj soustavy", anchor: "sun", dist: 62, dir: { frame: "ecliptic", lat: 56, lon: 40 }, look: { at: "sun" },
    offset: [0, -0.28], offsetPhone: [0, -0.42], up: "ecliptic", orbits: 44, trail: true, dim: 1, stars: 0.9 },
  { at: 6, label: "Pro koho · Slunce se stává hvězdou", anchor: "sun", dist: 1800, dir: RAY, look: { at: "sun" },
    offset: [-0.35, 0.15], offsetPhone: [0, 0.35], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 7, label: "Jak to funguje · let hvězdami", anchor: "sun", dist: 3 * LY_AU, dir: RAY, look: RAY,
    offset: [0.3, 0.1], offsetPhone: [0, 0.3], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 8, label: "Strážci · 40 světelných let", anchor: "sun", dist: 40 * LY_AU, dir: RAY, look: RAY,
    offset: [-0.3, 0], offsetPhone: [0, 0.3], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 9, label: "Některá slova · 400 světelných let", anchor: "sun", dist: 400 * LY_AU, dir: RAY, look: { frame: "galactic", lat: 30, lon: 348 },
    offset: [0, 0.1], offsetPhone: [0, 0.2], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 10, label: "Atmosféry · nad diskem", anchor: "sun", dist: 2500 * LY_AU, dir: RAY, look: { at: "sun" },
    offset: [0.3, 0.2], offsetPhone: [0, 0.4], up: "centre", orbits: 44, dim: 1, stars: 1 },
  { at: 11, label: "Bezpečnost (kamera stojí)", anchor: "sun", dist: 9000 * LY_AU, dir: RAY, look: { at: "sun" },
    offset: [0.35, 0.3], offsetPhone: [0.2, 0.55], up: "centre", orbits: 44, dim: 0.5, stars: 0.6 },
  { at: 12, label: "Ceník · 22 000 světelných let", anchor: "sun", dist: 22_000 * LY_AU, dir: RAY, look: { at: "sun" },
    offset: [-0.35, 0.3], offsetPhone: [-0.3, 0.6], up: "centre", orbits: 44, dim: 0.9, stars: 1 },
  { at: 13, label: "FAQ · 38 000 světelných let", anchor: "sun", dist: 38_000 * LY_AU, dir: RAY, look: { at: "sun" },
    offset: [0.3, 0.25], offsetPhone: [0.2, 0.55], up: "centre", orbits: 44, dim: 0.9, stars: 1 },
  { at: 14, label: "Mléčná dráha · pohled shora", anchor: "galaxy", dist: 56_000 * LY_AU, dir: { frame: "galactic", lat: 84, lon: 205 }, look: { at: "galaxy" },
    offset: [0, 0.08], offsetPhone: [0, 0.1], up: "centre", orbits: 44, dim: 1, stars: 0 },
  { at: 15, label: "Závěr · zpátky k modré tečce", anchor: "earth", dist: 5.2 * R, dir: { frame: "bodySun", lat: 12, lon: 42 }, look: { at: "earth" },
    offset: [0, -0.12], offsetPhone: [0, -0.3], up: "pole", orbits: 0, dim: 1, stars: 0.5 },
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
  const a = Math.min(0.95, Math.max(1e-9, xa)), b = Math.min(0.95, Math.max(1e-9, xb));
  const wStar = (1 + b - a) / 2;                                   // where the two profiles move at the same speed
  const la = Math.log(wStar / a + 1), lb = Math.log((1 - wStar) / b + 1);
  const c = la + lb, uStar = la / c;
  return u <= uStar ? a * (Math.exp(c * u) - 1) : 1 - b * (Math.exp(c * (1 - u)) - 1);
}

/** Distance interpolated on a log scale — the camera "zooms", never jumps. */
export function logLerp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** Year shown at a stop (the sample messages are written in WRITTEN_IN). */
export const WRITTEN_IN = 2026;
export const STOP_YEARS: Record<"y2032" | "y2044" | "y2051" | "y2070", number> = { y2032: 2032, y2044: 2044, y2051: 2051, y2070: 2070 };
