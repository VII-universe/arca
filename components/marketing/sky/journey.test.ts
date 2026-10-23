import { describe, it, expect } from "vitest";
import { JOURNEY, coronaNearness, logLeg, progressAt } from "./journey";

describe("journey progress", () => {
  const tops = [0, 1000, 2000, 4000];
  const holds = [0, 0.5, 0, 0];

  it("starts at 0 and ends at the last waypoint", () => {
    expect(progressAt(tops, holds, -50)).toBe(0);
    expect(progressAt(tops, holds, 9999)).toBe(3);
  });

  it("is linear across a section without a hold", () => {
    expect(progressAt(tops, holds, 500)).toBeCloseTo(0.5);
  });

  it("holds at the waypoint for the first part of a section", () => {
    expect(progressAt(tops, holds, 1000)).toBe(1);
    expect(progressAt(tops, holds, 1400)).toBe(1);
    expect(progressAt(tops, holds, 1750)).toBeCloseTo(1.5);
  });

  it("never runs backwards while scrolling down", () => {
    let last = -1;
    for (let y = 0; y < 4100; y += 37) {
      const s = progressAt(tops, holds, y);
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

  it("slows down with the year", () => {
    const vh = (id: string) => JOURNEY.find((s) => s.id === id)!.vh;
    expect(vh("gliese251")).toBeGreaterThan(vh("barnard"));
    expect(vh("vega")).toBeGreaterThan(vh("gliese251"));
    expect(vh("titawin")).toBeGreaterThan(vh("vega"));
  });
});
