import { describe, it, expect } from "vitest";
import { JOURNEY, KEYS, STOP_YEARS, WRITTEN_IN, bilog, holdAt, roundedHop, indexOf, keyOf, logLerp, orbitsAt, progressAt, scrollForProgress, segmentAt, trailFadeAt } from "./journey";
import { LY_AU } from "./ephemeris";

describe("journey progress", () => {
  const marks = [
    { top: 0, legStart: 800 },
    { top: 1000, legStart: 1500 },
    { top: 2000, legStart: 2600 },
  ];

  it("starts at 0 and ends at the last waypoint", () => {
    expect(progressAt(marks, -50)).toBe(0);
    expect(progressAt(marks, 9999)).toBe(2);
  });

  it("holds at a waypoint while its content is being read, then flies", () => {
    expect(progressAt(marks, 400)).toBe(0);
    expect(progressAt(marks, 1200)).toBe(1);
    expect(progressAt(marks, 900)).toBeCloseTo(0.5);
  });

  it("never runs backwards while scrolling down", () => {
    let last = -1;
    for (let y = 0; y < 3000; y += 37) {
      const s = progressAt(marks, y);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it("inverts: scrollForProgress lands where progressAt reads the same value", () => {
    for (const s of [0, 0.25, 0.5, 1, 1.5, 1.99, 2]) {
      expect(progressAt(marks, scrollForProgress(marks, s))).toBeCloseTo(s, 6);
    }
  });
});

describe("keys", () => {
  it("has one key per section, at whole numbers, in order, with fly-bys between", () => {
    for (const [i, section] of JOURNEY.entries()) {
      const k = KEYS.find((k) => k.at === i);
      expect(k, section.id).toBeDefined();
    }
    for (let i = 1; i < KEYS.length; i++) expect(KEYS[i].at).toBeGreaterThan(KEYS[i - 1].at);
    expect(KEYS[KEYS.length - 1].at).toBe(JOURNEY.length - 1);
  });

  it("passes the Moon, Mars, Jupiter, Saturn, Uranus and Neptune close enough to fill a third of the screen", () => {
    const passes = KEYS.filter((k) => !Number.isInteger(k.at));
    expect(passes.map((k) => k.anchor)).toEqual(["moon", "mars", "jupiter", "saturn", "uranus", "neptune"]);
    for (const k of passes) {
      // dist ≤ 6.9 radii → the disc spans ≥ 16.7°, a third of a 50° field
      const km: Record<string, number> = { moon: 1737.4, mars: 3389.5, jupiter: 69_911, saturn: 58_232, uranus: 25_362, neptune: 24_622 };
      const radiusAu = km[k.anchor] / 149_597_870.7;
      expect(k.dist / radiusAu).toBeLessThanOrEqual(6.9);
    }
  });

  it("goes one way out: the distance from the Sun grows from the Earth to the Galaxy, and the stars are flown in one direction", () => {
    const first = indexOf("y2032"), last = indexOf("galaxy");
    const stops = KEYS.filter((k) => Number.isInteger(k.at) && k.at >= first && k.at <= last && k.anchor === "sun");
    for (let i = 1; i < stops.length; i++) expect(stops[i].dist).toBeGreaterThan(stops[i - 1].dist);
    const ray = KEYS.filter((k) => k.at >= indexOf("forWhom") && k.at <= indexOf("faq")).map((k) => JSON.stringify(k.dir));
    expect(new Set(ray).size).toBe(1);
  });

  it("segments: a fly-by sits in the middle of its leg", () => {
    expect(segmentAt(2.25)).toEqual({ i: 3, f: 0.5 });
    expect(segmentAt(-1)).toEqual({ i: 0, f: 0 });
    expect(segmentAt(99).f).toBe(1);
  });
});

describe("orbits", () => {
  it("counts year − written year at every stop", () => {
    for (const [id, year] of Object.entries(STOP_YEARS)) {
      expect(keyOf(id as keyof typeof STOP_YEARS).orbits).toBe(year - WRITTEN_IN);
    }
  });

  it("starts at zero on the hero and holds at each stop", () => {
    expect(orbitsAt(0)).toBe(0);
    expect(orbitsAt(indexOf("y2044"))).toBe(18);
    expect(orbitsAt(indexOf("y2070") + 0.5)).toBe(44);
  });

  it("goes round only after the fly-by, on the way to the stop, and is monotonic", () => {
    expect(orbitsAt(indexOf("y2032") + 0.5)).toBe(6);       // passing Mars: still six
    expect(orbitsAt(indexOf("y2032") + 0.6)).toBe(6);       // the run starts later in the segment
    expect(orbitsAt(indexOf("y2032") + 0.95)).toBe(18);
    let last = 0;
    for (let s = 0; s <= indexOf("y2070"); s += 0.01) {
      const o = orbitsAt(s);
      expect(o).toBeGreaterThanOrEqual(last - 1e-9);
      last = o;
    }
  });

  it("shows the trail only at the stops: in before a stop, out after it, gone at the fly-bys", () => {
    expect(trailFadeAt(0)).toBe(0);
    expect(trailFadeAt(indexOf("y2044"))).toBe(1);
    expect(trailFadeAt(indexOf("y2044") + 0.5)).toBe(0);    // Jupiter
    expect(trailFadeAt(indexOf("y2044") + 0.95)).toBe(1);
    expect(trailFadeAt(indexOf("y2070") + 1)).toBe(0);
  });
});

describe("flight", () => {
  it("bilog leaves and arrives on a log scale and stays monotonic", () => {
    expect(bilog(0, 1e-4, 1e-4)).toBe(0);
    expect(bilog(1, 1e-4, 1e-4)).toBe(1);
    expect(bilog(0.5, 1e-4, 1e-4)).toBeCloseTo(0.5, 2);
    // A quarter in, the camera has moved only a few times its starting distance (not a quarter of the way).
    expect(bilog(0.25, 1e-4, 1e-4)).toBeLessThan(0.02);
    expect(bilog(0.25, 1e-4, 1e-4)).toBeGreaterThan(1e-4);
    // Symmetric ends: the hand-over is in the middle, and the two halves mirror.
    expect(bilog(0.3, 1e-3, 1e-3)).toBeCloseTo(1 - bilog(0.7, 1e-3, 1e-3), 9);
    for (const [xa, xb] of [[1e-5, 1e-5], [0.06, 0.03], [0.5, 0.5], [0.95, 1e-6]]) {
      let last = 0;
      for (let u = 0; u <= 1; u += 0.001) {
        const w = bilog(u, xa, xb);
        expect(w).toBeGreaterThanOrEqual(last - 1e-12);
        last = w;
      }
    }
    expect(logLerp(1, 100, 0.5)).toBeCloseTo(10);
  });

  it("roundedHop passes through its ends and stays near the chord between hops of wildly different length", () => {
    const p0: [number, number, number] = [0, 0, 0], p1: [number, number, number] = [1e-4, 0, 0], p2: [number, number, number] = [1, 0.2, 0], p3: [number, number, number] = [9, 1, 0];
    expect(roundedHop(p0, p1, p2, p3, 0)).toEqual(p1);
    expect(roundedHop(p0, p1, p2, p3, 1)[0]).toBeCloseTo(p2[0], 9);
    let lastX = p1[0];
    for (let t = 0; t <= 1; t += 0.01) {
      const p = roundedHop(p0, p1, p2, p3, t);
      expect(p[0]).toBeGreaterThanOrEqual(lastX - 1e-9);     // no backing up along the hop
      expect(Math.abs(p[1] - 0.2 * p[0])).toBeLessThan(0.08); // within a small fraction of the chord
      lastX = p[0];
    }
    // A hop that reverses (the turn back home): still finite and through the ends.
    const q = roundedHop([0, 0, 0], [1, 0, 0], [0, 0, 0], [0.5, 0, 0], 0.5);
    expect(q.every(Number.isFinite)).toBe(true);
  });

  it("holdAt is 0..1 through a section's content and 0 on its leg", () => {
    const marks = [{ top: 0, legStart: 800 }, { top: 1000, legStart: 1500 }];
    expect(holdAt(marks, 0)).toBe(0);
    expect(holdAt(marks, 400)).toBeCloseTo(0.5);
    expect(holdAt(marks, 900)).toBe(0);
    expect(holdAt(marks, 1250)).toBeCloseTo(0.5);
  });

  it("slows down with the year between the stops", () => {
    const leg = (id: string) => JOURNEY.find((s) => s.id === id)!.leg;
    expect(leg("y2051")).toBeGreaterThan(leg("y2044"));
    expect(leg("galaxy")).toBeGreaterThan(leg("security"));
  });

  it("flies the Galaxy from well above the disc", () => {
    expect(keyOf("galaxy").dist).toBeGreaterThan(40_000 * LY_AU);
  });
});
