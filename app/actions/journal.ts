"use server";

import { prisma } from "@/lib/prisma/client";

// Public action — no user account needed.
// Anyone who has reached this point holds the living-link hash, which means:
//   1. The pack is in TRIGGERED status.
//   2. They passed any challenge question gate.
// We validate the pack still exists and is triggered before writing.

export async function addJournalEntry(
  messagePackId: string,
  content: string
): Promise<{ ok: true } | { error: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Entry is empty." };
  if (trimmed.length > 10_000) return { error: "Entry is too long." };

  const pack = await prisma.messagePack.findUnique({
    where: { id: messagePackId },
    select: { status: true },
  });

  if (!pack) return { error: "Arca not found." };
  if (pack.status !== "TRIGGERED")
    return { error: "This Arca is not yet open." };

  await prisma.recipientJournal.create({
    data: { messagePackId, content: trimmed },
  });

  return { ok: true };
}
