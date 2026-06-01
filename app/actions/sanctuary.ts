"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { scryptSync } from "crypto";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signUnlockToken, isUnlocked } from "@/lib/unlock-token";

// ── Exported types ────────────────────────────────────────────────────────────

export interface SanctuaryContent {
  id: string;
  type: "TEXT" | "VIDEO" | "AUDIO" | "FILE";
  textBody: string | null;
  s3FileKey: string | null;
  signedUrl: string | null;
  backgroundColor: string | null;
  textColor: string | null;
}

export interface SanctuaryMemory {
  id: string;
  title: string | null;
  note: string | null;
  mediaType: string | null;
  signedUrl: string | null;
  happenedAt: string | null; // ISO string — safe for RSC→client serialisation
}

export interface SanctuaryBlueprintItem {
  id: string;
  category: string;
  title: string;
  content: string;
  isCritical: boolean;
}

export type SanctuaryResult =
  | { status: "not_found" }
  | { status: "sealed"; packStatus: string }
  | { status: "challenge"; packId: string; question: string }
  | {
      status: "open";
      packId: string;
      ownerName: string;
      packTitle: string;
      packType: "EMOTIONAL" | "PRACTICAL";
      createdAt: string;
      contents: SanctuaryContent[];
      memories: SanctuaryMemory[];
      blueprintItems: SanctuaryBlueprintItem[];
    };

// ── getSanctuaryContent ───────────────────────────────────────────────────────

export async function getSanctuaryContent(token: string): Promise<SanctuaryResult> {
  const pack = await prisma.messagePack.findUnique({
    where: { livingLinkHash: token },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      owner: {
        select: {
          name: true,
          blueprintItems: {
            orderBy: [{ isCritical: "desc" as const }, { createdAt: "asc" as const }],
            select: { id: true, category: true, title: true, content: true, isCritical: true },
          },
        },
      },
      recipients: {
        select: {
          id: true,
          challengeQuestion: true,
          challengeAnswerHash: true,
          memories: {
            orderBy: { happenedAt: "desc" as const },
            select: {
              id: true,
              title: true,
              note: true,
              mediaUrl: true,
              mediaType: true,
              happenedAt: true,
            },
          },
        },
      },
      contents: {
        orderBy: { createdAt: "asc" as const },
        select: { id: true, type: true, textBody: true, s3FileKey: true, backgroundColor: true, textColor: true },
      },
    },
  });

  if (!pack) return { status: "not_found" };
  if (pack.status !== "TRIGGERED") return { status: "sealed", packStatus: pack.status };

  // Challenge gate check
  const challengeRecipient = pack.recipients.find(
    (r) => r.challengeQuestion && r.challengeAnswerHash
  );
  if (challengeRecipient) {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(`arca-unlocked-${pack.id}`)?.value ?? "";
    if (!isUnlocked(pack.id, cookieVal)) {
      return { status: "challenge", packId: pack.id, question: challengeRecipient.challengeQuestion! };
    }
  }

  // Sign content media URLs
  const contents: SanctuaryContent[] = await Promise.all(
    pack.contents.map(async (c) => {
      if (!c.s3FileKey)
        return { ...c, type: c.type as SanctuaryContent["type"], signedUrl: null };
      const { data } = await supabaseAdmin.storage
        .from("arca-media")
        .createSignedUrl(c.s3FileKey, 6 * 60 * 60);
      return { ...c, type: c.type as SanctuaryContent["type"], signedUrl: data?.signedUrl ?? null };
    })
  );

  // Flatten memories across all recipients and sign their media
  const allMemories = pack.recipients.flatMap((r) => r.memories);
  const memories: SanctuaryMemory[] = await Promise.all(
    allMemories.map(async (m) => {
      const base: SanctuaryMemory = {
        id: m.id,
        title: m.title,
        note: m.note,
        mediaType: m.mediaType,
        signedUrl: null,
        happenedAt: m.happenedAt?.toISOString() ?? null,
      };
      if (!m.mediaUrl) return base;
      const { data } = await supabaseAdmin.storage
        .from("arca-media")
        .createSignedUrl(m.mediaUrl, 6 * 60 * 60);
      return { ...base, signedUrl: data?.signedUrl ?? null };
    })
  );

  return {
    status: "open",
    packId: pack.id,
    ownerName: pack.owner.name,
    packTitle: pack.title,
    packType: pack.type as "EMOTIONAL" | "PRACTICAL",
    createdAt: pack.createdAt.toISOString(),
    contents,
    memories,
    blueprintItems: pack.owner.blueprintItems,
  };
}

// ── verifySanctuaryChallengeAnswer ────────────────────────────────────────────

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

export async function verifySanctuaryChallengeAnswer(
  packId: string,
  token: string,
  answer: string
): Promise<{ error: string }> {
  if (!answer?.trim()) return { error: "Prosím vyplň odpověď." };

  const recipients = await prisma.recipient.findMany({
    where: { messagePackId: packId, NOT: { challengeAnswerHash: null } },
    select: { challengeAnswerHash: true },
  });

  const verified =
    recipients.length === 0 ||
    recipients.some((r) => r.challengeAnswerHash && verifyAnswer(answer, r.challengeAnswerHash));

  if (!verified) return { error: "Odpověď nesedí. Zkus to prosím znovu." };

  const cookieStore = await cookies();
  cookieStore.set(`arca-unlocked-${packId}`, signUnlockToken(packId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/s/${token}`);
}
