import { describe, it, expect } from "vitest";
import { JOURNEY, STOP_YEARS, WRITTEN_IN, indexOf, logLerp, orbitsAt, progressAt, trailFadeAt } from "./journey";

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
});

describe("orbits", () => {
  it("counts year − written year at every stop", () => {
    for (const [id, year] of Object.entries(STOP_YEARS)) {
      expect(JOURNEY[indexOf(id as keyof typeof STOP_YEARS)].shot.orbits).toBe(year - WRITTEN_IN);
    }
  });

  it("starts at zero on the hero and holds at each stop", () => {
    expect(orbitsAt(0)).toBe(0);
    expect(orbitsAt(indexOf("y2044"))).toBe(18);
    expect(orbitsAt(indexOf("y2070") + 0.5)).toBe(44);
  });

  it("goes round only once the camera has pulled away, and is monotonic", () => {
    const i = indexOf("y2032");
    expect(orbitsAt(i + 0.2)).toBe(6);
    let last = 0;
    for (let s = 0; s <= indexOf("y2070"); s += 0.01) {
      const o = orbitsAt(s);
      expect(o).toBeGreaterThanOrEqual(last - 1e-9);
      last = o;
    }
  });

  it("fades the trail in after the hero and out after the last stop", () => {
    expect(trailFadeAt(0)).toBe(0);
    expect(trailFadeAt(indexOf("y2044"))).toBe(1);
    expect(trailFadeAt(indexOf("y2070") + 1)).toBe(0);
  });
});

describe("shots", () => {
  it("zoom out monotonically from the Earth to the Galaxy", () => {
    const dists = JOURNEY.slice(0, indexOf("galaxy") + 1).map((s) => s.shot.dist);
    // The tour dips to Jupiter and Saturn on purpose; outside of it distance only grows.
    const tour = new Set([indexOf("how"), indexOf("guardians")]);
    for (let i = 1; i < dists.length; i++) {
      if (tour.has(i) || tour.has(i - 1)) continue;
      expect(dists[i]).toBeGreaterThan(dists[i - 1]);
    }
    expect(logLerp(1, 100, 0.5)).toBeCloseTo(10);
  });

  it("slows down with the year between the stops", () => {
    const leg = (id: string) => JOURNEY.find((s) => s.id === id)!.leg;
    expect(leg("y2044")).toBeGreaterThan(leg("y2032"));
    expect(leg("y2051")).toBeGreaterThan(leg("y2044"));
  });

  it("never leaves more than a screen of flight without text", () => {
    for (const s of JOURNEY) {
      expect(s.leg).toBeLessThanOrEqual(80);
      expect(s.legPhone).toBeLessThanOrEqual(80);
    }
  });
});
