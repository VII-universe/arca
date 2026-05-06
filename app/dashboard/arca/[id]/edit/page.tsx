import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ContentType } from "@/lib/prisma/generated";
import ArcaEditor, { type ArcaEditorProps } from "@/components/arca/ArcaEditor";
import type { MediaItem } from "@/components/arca/MediaGalleryClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await prisma.messagePack.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: pack ? `${pack.title} — ARCA` : "Edit Arca" };
}

export default async function EditArcaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single Prisma round-trip for everything
  const pack = await prisma.messagePack.findUnique({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      contents: {
        where: { type: ContentType.TEXT },
        select: { textBody: true },
        take: 1,
      },
      recipients: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          challengeQuestion: true,
        },
      },
      triggerCondition: {
        select: {
          type: true,
          executeAtDate: true,
          inactivityDaysLimit: true,
          gracePeriodDays: true,
        },
      },
    },
  });

  if (!pack) notFound();

  // Fetch media + generate signed URLs server-side (admin client bypasses RLS)
  const rawMedia = await prisma.messageContent.findMany({
    where: {
      messagePackId: id,
      NOT: { s3FileKey: null },
      type: { not: "TEXT" },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, s3FileKey: true, createdAt: true },
  });

  const mediaItems: MediaItem[] = (
    await Promise.all(
      rawMedia.map(async (c) => {
        if (!c.s3FileKey) return null;
        const { data } = await supabaseAdmin.storage
          .from("arca-media")
          .createSignedUrl(c.s3FileKey, 60 * 60);
        return {
          id: c.id,
          type: c.type as MediaItem["type"],
          s3FileKey: c.s3FileKey,
          signedUrl: data?.signedUrl ?? null,
          createdAt: c.createdAt,
        };
      })
    )
  ).filter(Boolean) as MediaItem[];

  // Fetch chapters
  const rawChapters = await prisma.chapter.findMany({
    where: { messagePackId: id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      order: true,
      unlockDate: true,
      unlockDelayDays: true,
    },
  });
  const chaptersForClient = rawChapters.map((c) => ({
    ...c,
    unlockDate: c.unlockDate ? new Date(c.unlockDate) : null,
  }));

  // Serialize trigger dates for client components
  const triggerForClient = pack.triggerCondition
    ? {
        ...pack.triggerCondition,
        type: pack.triggerCondition.type as
          | "SPECIFIC_DATE"
          | "INACTIVITY"
          | "MANUAL_EMERGENCY",
        executeAtDate: pack.triggerCondition.executeAtDate
          ? new Date(pack.triggerCondition.executeAtDate)
          : null,
      }
    : null;

  const props: ArcaEditorProps = {
    packId: pack.id,
    userId: user.id,
    packType: pack.type,
    packStatus: pack.status,
    initialTitle: pack.title,
    initialContent: pack.contents[0]?.textBody ?? "",
    initialRecipients: pack.recipients,
    initialTrigger: triggerForClient,
    initialMediaItems: mediaItems,
    initialChapters: chaptersForClient,
  };

  return <ArcaEditor {...props} />;
}
