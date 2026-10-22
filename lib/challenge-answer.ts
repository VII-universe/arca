import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Recipient security-question answers — one place to hash and verify, used
// by every form that sets an answer and every page that checks one.
//
// Stored format: `${saltHex}:${scryptHashHex}`.
//
// Legacy format: the Schránka "add person" form (app/actions/contacts.ts)
// used to store a bare, unsalted SHA-256 hex digest, which the verifiers never
// understood — so those recipients could not open their message even with
// the right answer. Such rows are still accepted here, so they unlock now
// without a data migration.

function normalize(raw: string): string {
  return raw.toLowerCase().trim();
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function hashChallengeAnswer(raw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalize(raw), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkChallengeAnswer(raw: string, stored: string): boolean {
  try {
    const [salt, expected] = stored.split(":");
    if (salt && expected) {
      return safeEqualHex(scryptSync(normalize(raw), salt, 32).toString("hex"), expected);
    }
    if (/^[0-9a-f]{64}$/.test(stored)) {
      return safeEqualHex(createHash("sha256").update(normalize(raw)).digest("hex"), stored);
    }
    return false;
  } catch {
    return false;
  }
}
