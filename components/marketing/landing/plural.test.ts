import { describe, expect, it } from "vitest";
import { formatIcuPlural } from "./plural";

const cs = "Na cestě do roku {year}. {count, plural, one {# oběh} few {# oběhy} other {# oběhů}}.";
const en = "On its way to {year}. {count, plural, one {# orbit} other {# orbits}}.";

describe("formatIcuPlural", () => {
  it("picks Czech forms", () => {
    expect(formatIcuPlural(cs, { year: 2027, count: 1 }, "cs")).toBe("Na cestě do roku 2027. 1 oběh.");
    expect(formatIcuPlural(cs, { year: 2029, count: 3 }, "cs")).toBe("Na cestě do roku 2029. 3 oběhy.");
    expect(formatIcuPlural(cs, { year: 2044, count: 18 }, "cs")).toBe("Na cestě do roku 2044. 18 oběhů.");
  });
  it("picks English forms", () => {
    expect(formatIcuPlural(en, { year: 2027, count: 1 }, "en")).toBe("On its way to 2027. 1 orbit.");
    expect(formatIcuPlural(en, { year: 2044, count: 18 }, "en")).toBe("On its way to 2044. 18 orbits.");
  });
});
