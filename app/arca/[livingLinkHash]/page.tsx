import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isUnlocked } from "@/lib/unlock-token";
import VaultSealed from "./VaultSealed";
import ChallengeGate from "./ChallengeGate";
import ArcaReveal, { type RevealContent } from "./ArcaReveal";

export const metadata = {
  title: "ARCA — A message awaits you",
  description: "A secure, private message has been prepared for you.",
  robots: "noindex, nofollow", // living link pages must never be indexed
};

// Force dynamic: this page reads cookies (challenge gate) and Prisma data
// that changes over time (pack status). No caching.
export const dynamic = "force-dynamic";

export default async function LivingLinkPage({
  params,
}: {
  params: Promise<{ livingLinkHash: string }>;
}) {
  const { livingLinkHash } = await params;

  // ── Fetch pack ──────────────────────────────────────────────────────────
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
        select: {
          id: true,
          type: true,
          textBody: true,
          s3FileKey: true,
        },
      },
    },
  });

  if (!pack) notFound();

  // ── Guard: not yet triggered ────────────────────────────────────────────
  if (pack.status !== "TRIGGERED") {
    return <VaultSealed status={pack.status} />;
  }

  // ── Guard: challenge question ───────────────────────────────────────────
  // Show the gate if any recipient has a challenge. Verify against a signed
  // HTTP-only cookie set by the verifyChallengeAnswer server action.
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

  // ── Generate signed URLs for all media (admin client bypasses RLS) ──────
  // Recipients are unauthenticated guests — they cannot use the user-scoped
  // storage client. The admin client creates 6-hour signed URLs server-side
  // so media is never directly accessible from the bucket by URL guessing.
  const contents: RevealContent[] = await Promise.all(
    pack.contents.map(async (c) => {
      if (!c.s3FileKey) {
        return { ...c, type: c.type as RevealContent["type"], signedUrl: null };
      }
      const { data, error } = await supabaseAdmin.storage
        .from("arca-media")
        .createSignedUrl(c.s3FileKey, 60 * 60 * 6); // 6-hour TTL

      if (error) {
        console.error("[living-link] signed URL error:", error.message, c.s3FileKey);
      }

      return {
        ...c,
        type: c.type as RevealContent["type"],
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  return (
    <ArcaReveal
      ownerName={pack.owner.name}
      packType={pack.type}
      createdAt={pack.createdAt}
      contents={contents}
    />
  );
}
