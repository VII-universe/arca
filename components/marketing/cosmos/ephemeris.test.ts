import { describe, it, expect } from "vitest";
import {
  eclipticLongitudeDeg, gmstDeg, greenwichDirection, julianDay, moonPosition, orbitPhase, orbitPoints,
  planetPosition, vlen, vsub, EARTH_POLE, vdot, J2000, GALACTIC_CENTRE, GALACTIC_NORTH, vnorm,
} from "./ephemeris";

// Reference values from the Astronomical Almanac / JPL Horizons, so the page
// shows the real sky of the day, within the accuracy the sources promise.

describe("planets (JPL approximate positions)", () => {
  it("puts the Earth near perihelion at J2000.0 (r ≈ 0.983 au, λ ≈ 100.4°)", () => {
    const p = planetPosition("earth", J2000);
    expect(vlen(p)).toBeCloseTo(0.9833, 2);
    expect(Math.abs(eclipticLongitudeDeg(p) - 100.37)).toBeLessThan(0.3);
  });

  it("gets the 2003-08-27 Mars opposition distance right (0.3727 au)", () => {
    const jd = julianDay(new Date(Date.UTC(2003, 7, 27, 9, 51)));
    const d = vlen(vsub(planetPosition("mars", jd), planetPosition("earth", jd)));
    expect(Math.abs(d - 0.3727)).toBeLessThan(0.004);
  });

  it("keeps Saturn at 9–10 au and Neptune at ~30 au", () => {
    const jd = julianDay(new Date(Date.UTC(2026, 9, 28)));
    expect(vlen(planetPosition("saturn", jd))).toBeGreaterThan(9.0);
    expect(vlen(planetPosition("saturn", jd))).toBeLessThan(10.1);
    expect(vlen(planetPosition("neptune", jd))).toBeCloseTo(29.9, 0);
  });

  it("draws a closed orbit line that passes through the planet", () => {
    const jd = julianDay(new Date(Date.UTC(2026, 9, 28)));
    const line = orbitPoints("earth", jd, 720);
    const p = planetPosition("earth", jd);
    let best = Infinity;
    for (let k = 0; k < line.length; k += 3) best = Math.min(best, Math.hypot(line[k] - p[0], line[k + 1] - p[1], line[k + 2] - p[2]));
    expect(best).toBeLessThan(0.005);
    expect(line[0]).toBeCloseTo(line[line.length - 3], 9);
  });

  it("advances the orbit phase by one per year", () => {
    const jd = julianDay(new Date(Date.UTC(2026, 9, 28)));
    const a = orbitPhase("earth", jd), b = orbitPhase("earth", jd + 365.25636);
    expect(Math.abs(((b - a + 1.5) % 1) - 0.5)).toBeLessThan(0.0003);
  });
});

describe("the Earth's rotation", () => {
  it("has GMST = 280.46° at J2000.0", () => {
    expect(gmstDeg(J2000)).toBeCloseTo(280.46061837, 3);
  });

  it("keeps Greenwich in the equatorial plane", () => {
    expect(Math.abs(vdot(greenwichDirection(J2000 + 1234.5), EARTH_POLE))).toBeLessThan(1e-9);
    expect(EARTH_POLE[2]).toBeCloseTo(Math.cos((23.43928 * Math.PI) / 180), 6);
  });
});

describe("the Moon", () => {
  const sunLongitude = (jd: number) => (eclipticLongitudeDeg(planetPosition("earth", jd)) + 180) % 360;
  const elongation = (jd: number) => {
    const d = (eclipticLongitudeDeg(moonPosition(jd)) - sunLongitude(jd) + 360) % 360;
    return d;
  };

  it("is new on 2000-01-06 18:14 UTC and full on 2000-01-21 04:40 UTC", () => {
    const newMoon = julianDay(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    const fullMoon = julianDay(new Date(Date.UTC(2000, 0, 21, 4, 40)));
    const e0 = elongation(newMoon);
    expect(Math.min(e0, 360 - e0)).toBeLessThan(1);
    expect(Math.abs(elongation(fullMoon) - 180)).toBeLessThan(1);
  });

  it("stays between 356 000 and 407 000 km away", () => {
    for (let d = 0; d < 365; d += 3) {
      const km = vlen(moonPosition(J2000 + 9500 + d)) * 149_597_870.7;
      expect(km).toBeGreaterThan(356_000);
      expect(km).toBeLessThan(407_000);
    }
  });
});

describe("galactic frame", () => {
  it("is orthonormal after the rotation into the ecliptic", () => {
    expect(vlen(GALACTIC_CENTRE)).toBeCloseTo(1, 6);
    expect(vlen(GALACTIC_NORTH)).toBeCloseTo(1, 6);
    expect(Math.abs(vdot(vnorm(GALACTIC_CENTRE), vnorm(GALACTIC_NORTH)))).toBeLessThan(1e-6);
  });
});
