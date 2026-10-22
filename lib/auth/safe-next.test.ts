import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("accepts same-site paths, including a query", () => {
    expect(safeNextPath("/dashboard/arca/new")).toBe("/dashboard/arca/new");
    expect(safeNextPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of ["@evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });
});
