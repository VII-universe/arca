// Pure server-side utility — no "use server" directive.
// Used by both the server action (to set the cookie) and the Server Component
// (to verify it). Lives outside app/actions/ so it can be imported from both.
import { createHmac } from "crypto";

// This key gates the challenge-question unlock cookie for delivered Arcas —
// it must never silently fall back to a value anyone can read in this (public)
// source file. Only dev/test environments get the placeholder; production
// fails loudly instead of fail-opening to a guessable key.
const key = () => {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRON_SECRET must be set in production — it also signs the Arca unlock token.");
  }
  return "dev-signing-key-replace-in-prod";
};

export function signUnlockToken(packId: string): string {
  return createHmac("sha256", key())
    .update(`arca:unlock:${packId}`)
    .digest("hex");
}

export function isUnlocked(packId: string, token: string): boolean {
  if (!token) return false;
  const expected = signUnlockToken(packId);
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
