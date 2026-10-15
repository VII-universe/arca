import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "crypto";
import { encryptBlueprintContent, decryptBlueprintContent } from "./blueprint-encryption";

const ORIGINAL_KEY = process.env.BLUEPRINT_ENCRYPTION_KEY;

describe("blueprint-encryption", () => {
  beforeEach(() => {
    process.env.BLUEPRINT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.BLUEPRINT_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips plain text, including diacritics", () => {
    const text = "heslo k emailu: žluťoučký-kůň-123!";
    expect(decryptBlueprintContent(encryptBlueprintContent(text))).toBe(text);
  });

  it("produces ciphertext that doesn't contain the plaintext", () => {
    const text = "super secret password";
    expect(encryptBlueprintContent(text)).not.toContain(text);
  });

  it("produces different ciphertext for the same input each time (random IV)", () => {
    const text = "same input twice";
    expect(encryptBlueprintContent(text)).not.toBe(encryptBlueprintContent(text));
  });

  it("treats a string without the version prefix as legacy plain text", () => {
    const legacy = "this was never encrypted";
    expect(decryptBlueprintContent(legacy)).toBe(legacy);
  });

  it("fails closed (empty string) on tampered ciphertext instead of throwing", () => {
    const tampered = encryptBlueprintContent("original").slice(0, -4) + "AAAA";
    expect(() => decryptBlueprintContent(tampered)).not.toThrow();
    expect(decryptBlueprintContent(tampered)).toBe("");
  });

  it("fails closed on a malformed v1-prefixed string missing parts", () => {
    expect(decryptBlueprintContent("v1.onlyonepart")).toBe("");
  });

  it("throws when encrypting without a key configured", () => {
    delete process.env.BLUEPRINT_ENCRYPTION_KEY;
    expect(() => encryptBlueprintContent("anything")).toThrow();
  });

  it("throws when the configured key isn't 32 bytes", () => {
    process.env.BLUEPRINT_ENCRYPTION_KEY = Buffer.from("too short").toString("base64");
    expect(() => encryptBlueprintContent("anything")).toThrow();
  });
});
