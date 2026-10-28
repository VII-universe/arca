// The journey: one camera from low Earth orbit to a view of the Galaxy and
// back, one shot per section of the page. Pure data and maths (no
// Three.js) so it can be unit-tested; the engine turns shots into camera
// poses in the ecliptic frame, with the real positions of the day.

import { EARTH_RADIUS_AU, LY_AU } from "./ephemeris";

export type WaypointId =
  | "hero" | "liftoff"
  | "y2032" | "y2044" | "y2051" | "y2070"
  | "forWhom" | "how" | "guardians" | "statement" | "atmospheres" | "security" | "pricing" | "faq"
  | "galaxy" | "home";

/** What the camera orbits. */
export type Target = "earth" | "sun" | "mars" | "jupiter" | "saturn" | "galaxy";

/**
 * The frame the camera's direction (lat, lon) is given in:
 *  - bodySun: lon 0 = the body's noon side (toward the Sun), 180 = midnight; lat toward ecliptic north
 *  - earthMoon: lon 0 = from the Earth toward the Moon
 *  - ecliptic: lon from the vernal equinox, lat toward ecliptic north; "earth+N" lon means N° ahead of the Earth's longitude
 *  - galactic: lat/lon in the galactic frame
 */
export type Frame = "bodySun" | "earthMoon" | "ecliptic" | "galactic";

export interface Shot {
  target: Target;
  /** Camera distance from the target, au. */
  dist: number;
  frame: Frame;
  lat: number;
  lon: number;
  /** Lon is relative to the Earth's heliocentric longitude (ecliptic frame only). */
  lonFromEarth?: boolean;
  /** Where the target sits on screen, NDC (−1..1): desktop and phone. */
  offset: [number, number];
  offsetPhone: [number, number];
  up: "pole" | "ecliptic" | "galactic" | "sunward";
  /** Earth orbits travelled since today (the trail's length). */
  orbits: number;
  /** Scene brightness 0..1 (Security dims). */
  dim: number;
  /** Catalogue stars' brightness 0..1. */
  stars: number;
}

export interface JourneySection {
  id: WaypointId;
  /** Shown only in the ?perf=1 overlay. */
  label: string;
  /** The flight after this section, in small-viewport heights (desktop / phone). */
  leg: number;
  legPhone: number;
  shot: Shot;
}

const R = EARTH_RADIUS_AU;

// Tempo slows with the year; every leg has something moving in it (the
// Earth completing orbits, the Moon passing, a planet growing).
export const JOURNEY: JourneySection[] = [
  { id: "hero", label: "Hero · Země z oběžné dráhy", leg: 55, legPhone: 45,
    shot: { target: "earth", dist: 3.6 * R, frame: "bodySun", lat: 12, lon: 112, offset: [0.5, -0.08], offsetPhone: [0.1, -0.5], up: "pole", orbits: 0, dim: 1, stars: 0.55 } },
  { id: "liftoff", label: "Odlet · kolem Měsíce", leg: 70, legPhone: 60,
    shot: { target: "earth", dist: 0.0007, frame: "bodySun", lat: 22, lon: 58, offset: [0.35, -0.05], offsetPhone: [0, 0.35], up: "ecliptic", orbits: 0, dim: 1, stars: 0.8 } },
  { id: "y2032", label: "2032 · 6 oběhů", leg: 60, legPhone: 50,
    shot: { target: "sun", dist: 2.7, frame: "ecliptic", lat: 60, lon: 35, lonFromEarth: true, offset: [0, -0.3], offsetPhone: [0, -0.42], up: "ecliptic", orbits: 6, dim: 1, stars: 0.9 } },
  { id: "y2044", label: "2044 · 18 oběhů", leg: 65, legPhone: 55,
    shot: { target: "sun", dist: 3.3, frame: "ecliptic", lat: 64, lon: 70, lonFromEarth: true, offset: [0, -0.3], offsetPhone: [0, -0.42], up: "ecliptic", orbits: 18, dim: 1, stars: 0.9 } },
  { id: "y2051", label: "2051 · 25 oběhů", leg: 70, legPhone: 60,
    shot: { target: "sun", dist: 3.9, frame: "ecliptic", lat: 68, lon: 105, lonFromEarth: true, offset: [0, -0.3], offsetPhone: [0, -0.42], up: "ecliptic", orbits: 25, dim: 1, stars: 0.9 } },
  { id: "y2070", label: "2070 · 44 oběhů", leg: 55, legPhone: 45,
    shot: { target: "sun", dist: 4.7, frame: "ecliptic", lat: 72, lon: 140, lonFromEarth: true, offset: [0, -0.3], offsetPhone: [0, -0.42], up: "ecliptic", orbits: 44, dim: 1, stars: 0.9 } },
  { id: "forWhom", label: "Pro koho · vnitřní soustava", leg: 40, legPhone: 30,
    shot: { target: "sun", dist: 5.6, frame: "ecliptic", lat: 46, lon: 185, lonFromEarth: true, offset: [-0.32, -0.12], offsetPhone: [0, 0.35], up: "ecliptic", orbits: 44, dim: 1, stars: 1 } },
  { id: "how", label: "Jak to funguje · Jupiter", leg: 40, legPhone: 30,
    shot: { target: "jupiter", dist: 0.0028, frame: "bodySun", lat: 9, lon: 58, offset: [0.42, -0.1], offsetPhone: [0.2, 0.42], up: "ecliptic", orbits: 44, dim: 1, stars: 1 } },
  { id: "guardians", label: "Strážci · Saturn", leg: 40, legPhone: 30,
    shot: { target: "saturn", dist: 0.0029, frame: "bodySun", lat: 26, lon: 58, offset: [0.36, 0.0], offsetPhone: [0, 0.4], up: "ecliptic", orbits: 44, dim: 1, stars: 1 } },
  { id: "statement", label: "Některá slova · celá soustava", leg: 35, legPhone: 30,
    shot: { target: "sun", dist: 78, frame: "ecliptic", lat: 34, lon: 215, lonFromEarth: true, offset: [0, 0.1], offsetPhone: [0, 0.2], up: "ecliptic", orbits: 44, dim: 1, stars: 1 } },
  { id: "atmospheres", label: "Atmosféry · okraj soustavy", leg: 30, legPhone: 25,
    shot: { target: "sun", dist: 420, frame: "ecliptic", lat: 28, lon: 245, lonFromEarth: true, offset: [0.3, 0.05], offsetPhone: [0, 0.4], up: "ecliptic", orbits: 44, dim: 1, stars: 1 } },
  { id: "security", label: "Bezpečnost (kamera stojí)", leg: 25, legPhone: 20,
    shot: { target: "sun", dist: 3200, frame: "ecliptic", lat: 22, lon: 268, lonFromEarth: true, offset: [0.4, 0.3], offsetPhone: [0.2, 0.55], up: "ecliptic", orbits: 44, dim: 0.5, stars: 0.6 } },
  { id: "pricing", label: "Ceník · Slunce jako hvězda", leg: 25, legPhone: 20,
    shot: { target: "sun", dist: 0.7 * LY_AU, frame: "ecliptic", lat: 18, lon: 300, lonFromEarth: true, offset: [-0.35, 0.3], offsetPhone: [-0.3, 0.6], up: "ecliptic", orbits: 44, dim: 0.9, stars: 1 } },
  { id: "faq", label: "FAQ · 30 světelných let", leg: 45, legPhone: 40,
    shot: { target: "sun", dist: 30 * LY_AU, frame: "ecliptic", lat: 12, lon: 335, lonFromEarth: true, offset: [0.3, 0.2], offsetPhone: [0.2, 0.55], up: "galactic", orbits: 44, dim: 0.9, stars: 1 } },
  { id: "galaxy", label: "Mléčná dráha · pohled shora", leg: 80, legPhone: 70,
    shot: { target: "galaxy", dist: 56_000 * LY_AU, frame: "galactic", lat: 84, lon: 205, offset: [0, 0.08], offsetPhone: [0, 0.1], up: "sunward", orbits: 44, dim: 1, stars: 0 } },
  { id: "home", label: "Závěr · zpátky k modré tečce", leg: 0, legPhone: 0,
    shot: { target: "earth", dist: 5.2 * R, frame: "bodySun", lat: 12, lon: 42, offset: [0, -0.12], offsetPhone: [0, -0.3], up: "pole", orbits: 0, dim: 1, stars: 0.5 } },
];

export const WAYPOINTS = JOURNEY.map((s) => s.id);
export const indexOf = (id: WaypointId) => WAYPOINTS.indexOf(id);

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
 * is inside section i's content the camera holds at shot i (s = i); across
 * its leg — up to where section i+1 starts — it flies to i+1.
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
 * Earth orbits travelled at progress s: holds at each stop, and between two
 * stops the Earth goes round while the camera is already well away from
 * it (the orbits begin after a third of the leg, so the camera never
 * whirls around a moving Earth up close).
 */
export function orbitsAt(s: number): number {
  const i = Math.min(JOURNEY.length - 2, Math.max(0, Math.floor(s)));
  const f = clamp01(s - i);
  const a = JOURNEY[i].shot.orbits, b = JOURNEY[i + 1].shot.orbits;
  if (a === b) return a;
  const u = easeInOut(clamp01((f - 0.3) / 0.7));
  return a + (b - a) * u;
}

/** The trail's opacity at progress s: full at the stops, gone a section later. */
export function trailFadeAt(s: number): number {
  const first = indexOf("liftoff"), last = indexOf("y2070");
  if (s <= first) return 0;
  if (s <= last) return clamp01(s - first);
  return clamp01(1 - (s - last));
}

/** Distance from target A to B interpolated on a log scale — the camera "zooms", never jumps. */
export function logLerp(a: number, b: number, t: number): number {
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** Year shown at a stop (the sample messages are written in WRITTEN_IN). */
export const WRITTEN_IN = 2026;
export const STOP_YEARS: Record<"y2032" | "y2044" | "y2051" | "y2070", number> = { y2032: 2032, y2044: 2044, y2051: 2051, y2070: 2070 };
