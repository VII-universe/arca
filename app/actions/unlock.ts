"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync } from "crypto";
import { prisma } from "@/lib/prisma/client";
import { signUnlockToken } from "@/lib/unlock-token";

// ─── Answer verification ──────────────────────────────────────────────────────
// Mirrors hashAnswer() in app/actions/delivery.ts.
// Stored format: `${saltHex}:${scryptHashHex}`

function verifyAnswer(raw: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  try {
    const actual = scryptSync(raw.toLowerCase().trim(), salt, 32).toString("hex");
    if (actual.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < actual.length; i++) {
      mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

// ─── verifyChallengeAnswer ────────────────────────────────────────────────────
// Public server action — no user session required.
// On success: sets a signed HTTP-only cookie, then redirects (throws NEXT_REDIRECT).
// On failure: returns { error } — the client shows it without navigating.

export async function verifyChallengeAnswer(
  packId: string,
  livingLinkHash: string,
  answer: string
): Promise<{ error: string }> {
  if (!answer?.trim()) return { error: "Please enter an answer." };

  const recipients = await prisma.recipient.findMany({
    where: {
      messagePackId: packId,
      NOT: { challengeAnswerHash: null },
    },
    select: { challengeAnswerHash: true },
  });

  const verified =
    recipients.length === 0 ||
    recipients.some(
      (r) => r.challengeAnswerHash && verifyAnswer(answer, r.challengeAnswerHash)
    );

  if (!verified) {
    return { error: "That answer doesn't match. Please try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(`arca-unlocked-${packId}`, signUnlockToken(packId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/arca/${livingLinkHash}`);
}
