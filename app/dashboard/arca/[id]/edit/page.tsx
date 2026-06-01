import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { ContentType } from "@/lib/prisma/generated";
import ArcaEditorNew from "@/components/arca/ArcaEditorNew";

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

  const [pack, allContacts, contactGroups] = await Promise.all([
    prisma.messagePack.findUnique({
      where: { id, ownerId: authUser.id },
      select: {
        id: true, title: true, type: true, status: true,
        contents: {
          where: { type: ContentType.TEXT },
          select: { textBody: true, backgroundColor: true, textColor: true },
          take: 1,
        },
        recipients: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, phone: true, challengeQuestion: true },
        },
        triggerCondition: {
          select: { type: true, executeAtDate: true, inactivityDaysLimit: true, gracePeriodDays: true },
        },
      },
    }),
    prisma.recipient.findMany({
      where: { messagePack: { ownerId: authUser.id } },
      select: { id: true, name: true, email: true, groupId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.contactGroup.findMany({
      where: { userId: authUser.id },
      select: { id: true, name: true, color: true, emoji: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!pack) notFound();

  // Deduplicate contacts by email/name
  const seenKeys = new Set<string>();
  const contacts: { id: string; name: string; email: string | null; groupId: string | null }[] = [];
  for (const r of allContacts) {
    const key = r.email ?? r.name;
    if (!seenKeys.has(key)) { seenKeys.add(key); contacts.push(r); }
  }

  const triggerForClient = pack.triggerCondition
    ? {
        ...pack.triggerCondition,
        type: pack.triggerCondition.type as "SPECIFIC_DATE" | "INACTIVITY" | "MANUAL_EMERGENCY",
        executeAtDate: pack.triggerCondition.executeAtDate
          ? new Date(pack.triggerCondition.executeAtDate)
          : null,
      }
    : null;

  return (
    <ArcaEditorNew
      packId={pack.id}
      packType={pack.type}
      packStatus={pack.status}
      initialTitle={pack.title}
      initialContent={pack.contents[0]?.textBody ?? ""}
      initialBackgroundColor={pack.contents[0]?.backgroundColor ?? null}
      initialTextColor={pack.contents[0]?.textColor ?? null}
      initialRecipients={pack.recipients}
      initialTrigger={triggerForClient}
      allContacts={contacts}
      contactGroups={contactGroups}
    />
  );
}
