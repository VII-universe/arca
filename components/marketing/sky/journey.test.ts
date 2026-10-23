import { describe, it, expect } from "vitest";
import { JOURNEY, coronaNearness, logLeg, progressAt } from "./journey";

describe("journey progress", () => {
  // Three sections: content 0–800 then a leg to 1000; content 1000–1500, leg
  // to 2000; the last one starts at 2000.
  const marks = [
    { top: 0, legStart: 800 },
    { top: 1000, legStart: 1500 },
    { top: 2000, legStart: 2600 },
  ];

  it("starts at 0 and ends at the last waypoint", () => {
    expect(progressAt(marks, -50)).toBe(0);
    expect(progressAt(marks, 9999)).toBe(2);
  });

  it("holds at a waypoint while its content is being read", () => {
    expect(progressAt(marks, 400)).toBe(0);
    expect(progressAt(marks, 1200)).toBe(1);
  });

  it("flies across the leg to the next section", () => {
    expect(progressAt(marks, 900)).toBeCloseTo(0.5);
    expect(progressAt(marks, 1750)).toBeCloseTo(1.5);
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

describe("log-distance legs", () => {
  it("hits both ends exactly and is monotonic", () => {
    const L = 5.6;
    expect(logLeg(0, L, 0.0006, 0.0006)).toBeCloseTo(0, 9);
    expect(logLeg(1, L, 0.0006, 0.0006)).toBeCloseTo(1, 9);
    let last = -1;
    for (let u = 0; u <= 1; u += 0.01) {
      const v = logLeg(u, L, 0.0006, 0.0006);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it("arrives exponentially: near the end the remaining distance shrinks by orders of magnitude", () => {
    const L = 5.6;
    const remaining = (u: number) => L * (1 - logLeg(u, L, 0.0006, 0.0006));
    expect(remaining(0.8) / remaining(0.95)).toBeGreaterThan(3);
    expect(remaining(0.95)).toBeLessThan(0.02);
  });
});

describe("corona", () => {
  it("is off far away and full at the stop", () => {
    expect(coronaNearness(1)).toBe(0);
    expect(coronaNearness(0.0007)).toBeCloseTo(1);
    expect(coronaNearness(0.01)).toBeGreaterThan(0);
  });
});

describe("journey layout", () => {
  it("visits the four stops in order of distance", () => {
    const ids = JOURNEY.map((s) => s.id);
    expect(ids.indexOf("barnard")).toBeLessThan(ids.indexOf("gliese251"));
    expect(ids.indexOf("gliese251")).toBeLessThan(ids.indexOf("vega"));
    expect(ids.indexOf("vega")).toBeLessThan(ids.indexOf("titawin"));
  });

  it("slows down with the year between the stars", () => {
    const leg = (id: string) => JOURNEY.find((s) => s.id === id)!.leg;
    expect(leg("gliese251")).toBeGreaterThan(leg("barnard"));
    expect(leg("vega")).toBeGreaterThan(leg("gliese251"));
  });

  it("never leaves more than a screen of flight without text", () => {
    for (const s of JOURNEY) {
      expect(s.leg).toBeLessThanOrEqual(80);
      expect(s.legPhone).toBeLessThanOrEqual(80);
    }
  });
});
