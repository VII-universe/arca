import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import { hashChallengeAnswer, checkChallengeAnswer } from "./challenge-answer";

describe("challenge answers", () => {
  it("verifies a salted answer, ignoring case and surrounding spaces", () => {
    const stored = hashChallengeAnswer("Mourek");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect(checkChallengeAnswer("  mourek ", stored)).toBe(true);
    expect(checkChallengeAnswer("Micka", stored)).toBe(false);
  });

  it("salts every hash differently", () => {
    expect(hashChallengeAnswer("same")).not.toBe(hashChallengeAnswer("same"));
  });

  it("still accepts legacy unsalted SHA-256 rows from the add-person form", () => {
    const legacy = createHash("sha256").update("mourek").digest("hex");
    expect(checkChallengeAnswer("Mourek", legacy)).toBe(true);
    expect(checkChallengeAnswer("Micka", legacy)).toBe(false);
  });

  it("rejects malformed stored values instead of throwing", () => {
    expect(checkChallengeAnswer("x", "")).toBe(false);
    expect(checkChallengeAnswer("x", "not-a-hash")).toBe(false);
    expect(checkChallengeAnswer("x", "zz:zz")).toBe(false);
  });
});
