// Pure server-side utility — no "use server" directive.
// Used by both the server action (to set the cookie) and the Server Component
// (to verify it). Lives outside app/actions/ so it can be imported from both.
import { createHmac } from "crypto";

const key = () => process.env.CRON_SECRET ?? "dev-signing-key-replace-in-prod";

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
