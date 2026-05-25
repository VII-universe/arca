import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { resolveUser, hasProAccess, FREE_LIMITS } from "@/lib/auth/user";
import ComposeWizard from "./ComposeWizard";

export const metadata = { title: "Nová zpráva — ARCA" };

export default async function NewArcaPage({
  searchParams,
}: {
  searchParams: Promise<{ recipientId?: string; occasion?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const resolvedUser = await resolveUser(authUser);
  if (!hasProAccess(resolvedUser)) {
    const packCount = await prisma.messagePack.count({ where: { ownerId: authUser.id } });
    if (packCount >= FREE_LIMITS.maxPacks) redirect("/dashboard/billing");
  }

  const { recipientId: prefilledRecipientId, occasion: prefilledOccasion, date: prefilledDate } = await searchParams;

  // Fetch existing recipients + groups for the selector
  const [allRecipients, contactGroups] = await Promise.all([
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

  // Deduplicate by email/name
  const seen = new Set<string>();
  const recipients: { id: string; name: string; email: string | null; groupId: string | null }[] = [];
  for (const r of allRecipients) {
    const key = r.email ?? r.name;
    if (!seen.has(key)) { seen.add(key); recipients.push(r); }
  }

  return (
    <ComposeWizard
      recipients={recipients}
      contactGroups={contactGroups}
      isPro={hasProAccess(resolvedUser)}
      prefilledRecipientId={prefilledRecipientId}
      prefilledOccasion={prefilledOccasion as "birthday" | "anniversary" | undefined}
      prefilledDate={prefilledDate}
    />
  );
}
