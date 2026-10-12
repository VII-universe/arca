import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeAgeMilestoneDate,
  computeRelativeOffsetDate,
  isFutureDate,
  currentAgeYears,
  nextValidTargetAge,
} from "./milestone";

afterEach(() => {
  vi.useRealTimers();
});

describe("computeAgeMilestoneDate", () => {
  it("adds the target age to the birth year, keeping month/day", () => {
    const birthday = new Date(2000, 5, 15); // June 15, 2000
    const result = computeAgeMilestoneDate(birthday, 25);
    expect(result).toEqual(new Date(2025, 5, 15));
  });

  it("rolls Feb 29 birthdays into March 1 on non-leap target years", () => {
    const birthday = new Date(2000, 1, 29); // Feb 29, 2000 (leap year)
    const result = computeAgeMilestoneDate(birthday, 25); // 2025 is not a leap year
    expect(result).toEqual(new Date(2025, 2, 1));
  });

  it("keeps Feb 29 when the target year is also a leap year", () => {
    const birthday = new Date(2000, 1, 29);
    const result = computeAgeMilestoneDate(birthday, 24); // 2024 is a leap year
    expect(result).toEqual(new Date(2024, 1, 29));
  });
});

describe("computeRelativeOffsetDate", () => {
  it("adds whole years and months to the anchor date", () => {
    const anchor = new Date(2026, 0, 10); // Jan 10, 2026
    const result = computeRelativeOffsetDate(anchor, 1, 3);
    expect(result).toEqual(new Date(2027, 3, 10));
  });

  it("rolls months over into the next year", () => {
    const anchor = new Date(2026, 10, 1); // Nov 1, 2026
    const result = computeRelativeOffsetDate(anchor, 0, 3);
    expect(result).toEqual(new Date(2027, 1, 1));
  });

  it("returns the same date when years and months are both 0", () => {
    const anchor = new Date(2026, 5, 20);
    const result = computeRelativeOffsetDate(anchor, 0, 0);
    expect(result).toEqual(anchor);
  });

  it("does not mutate the anchor date passed in", () => {
    const anchor = new Date(2026, 5, 20);
    const anchorCopy = new Date(anchor);
    computeRelativeOffsetDate(anchor, 1, 1);
    expect(anchor).toEqual(anchorCopy);
  });
});

describe("isFutureDate", () => {
  it("returns true for a date in the future", () => {
    const future = new Date(Date.now() + 86_400_000); // +1 day
    expect(isFutureDate(future)).toBe(true);
  });

  it("returns false for a date in the past", () => {
    const past = new Date(Date.now() - 86_400_000); // -1 day
    expect(isFutureDate(past)).toBe(false);
  });

  it("returns false for exactly now (not strictly future)", () => {
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(isFutureDate(now)).toBe(false);
  });
});

describe("currentAgeYears", () => {
  it("counts a full year elapsed when the birthday already passed this year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12)); // Oct 12, 2026
    const birthday = new Date(2000, 0, 1); // Jan 1, 2000 — already passed this year
    expect(currentAgeYears(birthday)).toBe(26);
  });

  it("does not count this year yet if the birthday hasn't happened", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12)); // Oct 12, 2026
    const birthday = new Date(2000, 11, 25); // Dec 25, 2000 — later this year
    expect(currentAgeYears(birthday)).toBe(25);
  });

  it("counts the birthday itself as already turned that age", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12)); // Oct 12, 2026
    const birthday = new Date(2000, 9, 12); // same month/day
    expect(currentAgeYears(birthday)).toBe(26);
  });
});

describe("nextValidTargetAge", () => {
  it("returns the next age that lands strictly in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12));
    const birthday = new Date(2000, 0, 1); // turned 26 already this year
    expect(nextValidTargetAge(birthday)).toBe(27);
  });

  it("never returns less than 1, even for a newborn's birthday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12));
    const birthday = new Date(2026, 9, 1); // turns 0, already passed this "year"
    expect(nextValidTargetAge(birthday)).toBeGreaterThanOrEqual(1);
  });
});
