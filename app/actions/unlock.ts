"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { signUnlockToken } from "@/lib/unlock-token";
import { checkChallengeAnswer } from "@/lib/challenge-answer";

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
      (r) => r.challengeAnswerHash && checkChallengeAnswer(answer, r.challengeAnswerHash)
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
