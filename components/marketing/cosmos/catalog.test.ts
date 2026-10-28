import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { decodeCatalog, STOP_STARS, SUN } from "./catalog";

// Reads the real shipped file, so a rebuilt catalogue that drops or moves a
// stop (or grows past the budget) fails here, not on the live site.
const file = readFileSync(path.resolve(__dirname, "stars.bin"));
const catalog = decodeCatalog(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const ly = (i: number) => Math.hypot(...catalog.positions.slice(i * 3, i * 3 + 3)) * 3.26156;

describe("sky catalogue", () => {
  it("stays under the 300 kB budget with 20–40 thousand stars", () => {
    expect(file.byteLength).toBeLessThan(300_000);
    expect(catalog.count).toBeGreaterThanOrEqual(20_000);
    expect(catalog.count).toBeLessThanOrEqual(40_000);
  });

  it("keeps the Sun at the origin", () => {
    expect(ly(SUN)).toBe(0);
    expect(catalog.absMag[SUN]).toBeCloseTo(4.85, 1);
  });

  it("places each stop at year − 2026 light years (±0.5)", () => {
    expect(Math.abs(ly(STOP_STARS.barnard) - 6)).toBeLessThan(0.5);
    expect(Math.abs(ly(STOP_STARS.gliese251) - 18)).toBeLessThan(0.5);
    expect(Math.abs(ly(STOP_STARS.vega) - 25)).toBeLessThan(0.5);
    expect(Math.abs(ly(STOP_STARS.titawin) - 44)).toBeLessThan(0.5);
  });

  it("decodes colour and magnitude within quantisation", () => {
    // Vega: A0V, B−V ≈ 0.00, M ≈ 0.6
    expect(catalog.colorIndex[STOP_STARS.vega]).toBeCloseTo(0, 1);
    expect(catalog.absMag[STOP_STARS.vega]).toBeCloseTo(0.6, 0);
  });

  it("rejects an unknown format", () => {
    expect(() => decodeCatalog(new ArrayBuffer(16))).toThrow();
  });
});
