import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { resolveUser, hasProAccess, FREE_LIMITS } from "@/lib/auth/user";
import { getSignedAvatarUrl } from "@/app/actions/recipients";
import ComposeWizard from "./ComposeWizard";

export const metadata = { title: "Nová zpráva — ARCA" };

export default async function NewArcaPage({
  searchParams,
}: {
  searchParams: Promise<{ recipientId?: string; occasion?: string; date?: string; replyTo?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const resolvedUser = await resolveUser(authUser);
  if (!hasProAccess(resolvedUser)) {
    const packCount = await prisma.messagePack.count({ where: { ownerId: authUser.id } });
    if (packCount >= FREE_LIMITS.maxPacks) redirect("/dashboard/billing");
  }

  const { recipientId: prefilledRecipientId, occasion: prefilledOccasion, date: prefilledDate, replyTo: replyToMessageId } = await searchParams;

  // Fáze 2 — "Napsat odpověď": pull the original message's first recipient
  // to pre-fill the reply with (ownership-checked — only the owner's own
  // packs are eligible, same as everywhere else recipients are read).
  let replyRecipient: { id: string; name: string; email: string | null } | null = null;
  if (replyToMessageId) {
    const originalPack = await prisma.messagePack.findFirst({
      where: { id: replyToMessageId, ownerId: authUser.id },
      select: { recipients: { select: { id: true, name: true, email: true }, take: 1 } },
    });
    replyRecipient = originalPack?.recipients[0] ?? null;
  }

  // Fetch existing recipients + groups for the selector
  const [allRecipients, contactGroups] = await Promise.all([
    prisma.recipient.findMany({
      where: { messagePack: { ownerId: authUser.id } },
      select: { id: true, name: true, email: true, groupId: true, avatarUrl: true, birthday: true },
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
  const dedupedRecipients: typeof allRecipients = [];
  for (const r of allRecipients) {
    const key = r.email ?? r.name;
    if (!seen.has(key)) { seen.add(key); dedupedRecipients.push(r); }
  }

  const avatarPaths = new Set(dedupedRecipients.map((r) => r.avatarUrl).filter((p): p is string => !!p));
  const avatarEntries = await Promise.all(
    [...avatarPaths].map(async (path) => [path, await getSignedAvatarUrl(path)] as const)
  );
  const avatarUrlByPath = new Map(avatarEntries);

  const recipients = dedupedRecipients.map((r) => ({
    id: r.id, name: r.name, email: r.email, groupId: r.groupId,
    avatarUrl: r.avatarUrl ? avatarUrlByPath.get(r.avatarUrl) ?? null : null,
    birthday: r.birthday ? r.birthday.toISOString().slice(0, 10) : null,
  }));

  return (
    <ComposeWizard
      recipients={recipients}
      contactGroups={contactGroups}
      isPro={hasProAccess(resolvedUser)}
      currentUser={{ name: resolvedUser.name, email: resolvedUser.email }}
      prefilledRecipientId={prefilledRecipientId}
      prefilledOccasion={prefilledOccasion as "birthday" | "anniversary" | undefined}
      prefilledDate={prefilledDate}
      replyToMessageId={replyToMessageId}
      replyRecipient={replyRecipient}
    />
  );
}
