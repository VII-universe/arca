import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ContentType } from "@/lib/prisma/generated";
import ArcaEditor, { type ArcaEditorProps } from "@/components/arca/ArcaEditor";
import type { MediaItem } from "@/components/arca/MediaGalleryClient";

const ADMIN_EMAILS = new Set(["jakubfidler@centrum.cz", "fidlerjalub@gmail.com"]);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await prisma.messagePack.findUnique({ where: { id }, select: { title: true } });
  return { title: pack ? `${pack.title} — ARCA` : "Edit Arca" };
}

export default async function EditArcaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // Simple read — no upsert — layout already handled user creation
  const email = authUser.email ?? "";
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());
  let isPro = isAdmin;
  if (!isPro) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { isPremium: true, role: true },
      });
      isPro = u?.isPremium === true || u?.role === "ADMIN";
    } catch { /* default false */ }
  }

  const pack = await prisma.messagePack.findUnique({
    where: { id, ownerId: authUser.id },
    select: {
      id: true, title: true, type: true, status: true,
      contents: { where: { type: ContentType.TEXT }, select: { textBody: true }, take: 1 },
      recipients: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, phone: true, challengeQuestion: true },
      },
      categoryId: true,
      category: { select: { id: true, name: true, color: true } },
      triggerCondition: {
        select: { type: true, executeAtDate: true, inactivityDaysLimit: true, gracePeriodDays: true },
      },
    },
  });
  if (!pack) notFound();

  const [userCategories, rawMedia, rawChapters] = await Promise.all([
    prisma.category.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.messageContent.findMany({
      where: { messagePackId: id, NOT: { s3FileKey: null }, type: { not: "TEXT" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, s3FileKey: true, createdAt: true },
    }),
    prisma.chapter.findMany({
      where: { messagePackId: id },
      orderBy: { order: "asc" },
      select: { id: true, title: true, content: true, order: true, unlockDate: true, unlockDelayDays: true },
    }),
  ]);

  // Signed URLs — failures return null, never crash the page
  const mediaItems: MediaItem[] = (
    await Promise.all(
      rawMedia.map(async (c) => {
        if (!c.s3FileKey) return null;
        try {
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
        } catch {
          return { id: c.id, type: c.type as MediaItem["type"], s3FileKey: c.s3FileKey, signedUrl: null, createdAt: c.createdAt };
        }
      })
    )
  ).filter(Boolean) as MediaItem[];

  const chaptersForClient = rawChapters.map((c) => ({
    ...c,
    unlockDate: c.unlockDate ? new Date(c.unlockDate) : null,
  }));

  const triggerForClient = pack.triggerCondition
    ? {
        ...pack.triggerCondition,
        type: pack.triggerCondition.type as "SPECIFIC_DATE" | "INACTIVITY" | "MANUAL_EMERGENCY",
        executeAtDate: pack.triggerCondition.executeAtDate
          ? new Date(pack.triggerCondition.executeAtDate)
          : null,
      }
    : null;

  const props: ArcaEditorProps = {
    packId: pack.id,
    userId: authUser.id,
    isPro,
    packType: pack.type,
    packStatus: pack.status,
    initialTitle: pack.title,
    initialContent: pack.contents[0]?.textBody ?? "",
    initialRecipients: pack.recipients,
    initialTrigger: triggerForClient,
    initialMediaItems: mediaItems,
    initialChapters: chaptersForClient,
    initialCategoryId: pack.categoryId,
    categories: userCategories,
  };

  return <ArcaEditor {...props} />;
}
