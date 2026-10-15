import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encrypts BlueprintItem.content at rest — this is the field people use for
// passwords and account access, the single most sensitive data in the app,
// and it was previously stored in plain text with no application-layer
// encryption at all (Supabase RLS isn't used either — every query is a
// manual ownerId filter — so a leaked service-role key or a query bug would
// have exposed every user's credentials in readable form).
//
// Versioned format ("v1.<iv>.<authTag>.<ciphertext>", each base64) rather
// than guessing from byte lengths — unambiguous, and lets a future format
// change coexist with old rows. Anything NOT matching this prefix is
// treated as legacy plain text and returned as-is: there's no bulk
// backfill migration (local DATABASE_URL is broken, so one couldn't be run
// against production from here anyway) — existing items are transparently
// encrypted the next time the owner edits and saves them.
const FORMAT_PREFIX = "v1.";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const b64 = process.env.BLUEPRINT_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "BLUEPRINT_ENCRYPTION_KEY is not set — refusing to store Blueprint content unencrypted."
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("BLUEPRINT_ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits).");
  }
  return key;
}

export function encryptBlueprintContent(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${FORMAT_PREFIX}${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptBlueprintContent(stored: string): string {
  if (!stored.startsWith(FORMAT_PREFIX)) {
    // Legacy plaintext row, written before encryption existed.
    return stored;
  }
  const [, ivB64, authTagB64, cipherB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !cipherB64) {
    // Malformed — fail safe by surfacing nothing readable rather than
    // throwing and breaking the whole page for one bad row.
    return "";
  }
  try {
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (err) {
    console.error("[blueprint-encryption] decrypt failed:", err);
    return "";
  }
}
