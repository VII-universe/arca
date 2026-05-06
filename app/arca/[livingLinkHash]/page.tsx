import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUnlocked } from "@/lib/unlock-token";
import VaultSealed from "./VaultSealed";
import ChallengeGate from "./ChallengeGate";
import ArcaReveal, { type RevealContent, type RevealChapter } from "./ArcaReveal";
import GriefJournal from "./GriefJournal";

export const metadata = {
  title: "ARCA — A message awaits you",
  description: "A secure, private message has been prepared for you.",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

export default async function LivingLinkPage({
  params,
}: {
  params: Promise<{ livingLinkHash: string }>;
}) {
  const { livingLinkHash } = await params;

  const pack = await prisma.messagePack.findUnique({
    where: { livingLinkHash },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      owner: { select: { name: true } },
      recipients: {
        select: {
          id: true,
          challengeQuestion: true,
          challengeAnswerHash: true,
        },
      },
      contents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, textBody: true, s3FileKey: true },
      },
      // Chapters for drip delivery
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
          unlockDate: true,
          unlockDelayDays: true,
        },
      },
      // Trigger info needed to compute chapter unlock timing
      triggerCondition: {
        select: { triggeredAt: true },
      },
      // Existing journal entries
      journalEntries: {
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true },
      },
    },
  });

  if (!pack) notFound();
  if (pack.status !== "TRIGGERED") return <VaultSealed status={pack.status} />;

  // ── Challenge gate ──────────────────────────────────────────────────────────

  const challengeRecipient = pack.recipients.find(
    (r) => r.challengeQuestion && r.challengeAnswerHash
  );

  if (challengeRecipient) {
    const cookieStore = await cookies();
    const token = cookieStore.get(`arca-unlocked-${pack.id}`)?.value ?? "";
    if (!isUnlocked(pack.id, token)) {
      return (
        <ChallengeGate
          packId={pack.id}
          livingLinkHash={livingLinkHash}
          question={challengeRecipient.challengeQuestion!}
        />
      );
    }
  }

  // ── Signed URLs for media ───────────────────────────────────────────────────

  const contents: RevealContent[] = await Promise.all(
    pack.contents.map(async (c) => {
      if (!c.s3FileKey)
        return { ...c, type: c.type as RevealContent["type"], signedUrl: null };
      const { data, error } = await supabaseAdmin.storage
        .from("arca-media")
        .createSignedUrl(c.s3FileKey, 60 * 60 * 6);
      if (error) console.error("[living-link] signed URL error:", error.message);
      return {
        ...c,
        type: c.type as RevealContent["type"],
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  // ── Chapter unlock logic ────────────────────────────────────────────────────
  // A chapter is unlocked when:
  //  - No unlock condition (immediate)
  //  - unlockDate is set AND now >= unlockDate
  //  - unlockDelayDays is set AND (now - triggeredAt) >= unlockDelayDays

  const now = new Date();
  const triggeredAt = pack.triggerCondition?.triggeredAt;

  const chapters: RevealChapter[] = pack.chapters.map((c) => {
    let isUnlockedChapter = true;
    let daysRemaining: number | undefined;

    if (c.unlockDate) {
      const unlockAt = new Date(c.unlockDate);
      isUnlockedChapter = now >= unlockAt;
      if (!isUnlockedChapter) {
        daysRemaining = Math.ceil(
          (unlockAt.getTime() - now.getTime()) / 86_400_000
        );
      }
    } else if (c.unlockDelayDays && triggeredAt) {
      const unlockAt = new Date(
        triggeredAt.getTime() + c.unlockDelayDays * 86_400_000
      );
      isUnlockedChapter = now >= unlockAt;
      if (!isUnlockedChapter) {
        daysRemaining = Math.ceil(
          (unlockAt.getTime() - now.getTime()) / 86_400_000
        );
      }
    } else if (c.unlockDelayDays && !triggeredAt) {
      // No triggeredAt recorded — treat as locked for now
      isUnlockedChapter = false;
      daysRemaining = c.unlockDelayDays;
    }

    return {
      id: c.id,
      title: c.title,
      content: c.content,
      isUnlocked: isUnlockedChapter,
      daysRemaining,
    };
  });

  return (
    <>
      <ArcaReveal
        ownerName={pack.owner.name}
        packType={pack.type}
        createdAt={pack.createdAt}
        contents={contents}
        chapters={chapters}
      />
      <div className="mx-auto max-w-[680px] px-6 pb-20">
        <GriefJournal
          messagePackId={pack.id}
          initialEntries={pack.journalEntries.map((e) => ({
            ...e,
            createdAt: new Date(e.createdAt),
          }))}
        />
      </div>
    </>
  );
}
